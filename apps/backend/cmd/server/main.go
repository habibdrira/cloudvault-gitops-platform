package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cloudvault-backend/internal/config"
	"cloudvault-backend/internal/handlers"
	"cloudvault-backend/internal/middleware"
	"cloudvault-backend/internal/storage"
)

func main() {
	// 1. Initialisation du logger structuré standard slog en format JSON
	jsonHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	logger := slog.New(jsonHandler)
	slog.SetDefault(logger)

	// 2. Chargement de la configuration
	cfg := config.LoadConfig()

	slog.Info("Starting CloudVault Backend initialization",
		"port", cfg.Port,
		"endpoint", cfg.EndpointURL,
		"region", cfg.AWSRegion,
		"bucket", cfg.BucketName,
	)

	// 3. Initialisation du stockage S3
	s3Store, err := storage.NewS3Storage(cfg)
	if err != nil {
		slog.Error("Fatal: failed to initialize S3 storage", "error", err)
		os.Exit(1)
	}

	// 4. Instanciation des gestionnaires
	healthHandler := handlers.NewHealthHandler(s3Store, cfg)
	docHandler := handlers.NewDocumentHandler(s3Store, cfg)

	// 5. Enregistrement des routes
	mux := http.NewServeMux()

	// Probes Kubernetes
	mux.HandleFunc("GET /healthz", healthHandler.HandleHealthz)
	mux.HandleFunc("GET /readyz", healthHandler.HandleReadyz)

	// Routes API CloudVault
	mux.HandleFunc("POST /api/v1/documents/upload-url", docHandler.HandleGenerateUploadURL)
	mux.HandleFunc("GET /api/v1/documents", docHandler.HandleListDocuments)
	mux.HandleFunc("DELETE /api/v1/documents/{key}", docHandler.HandleDeleteDocument)

	// Fallback pour anciens routeurs ou paths préfixés
	mux.HandleFunc("/healthz", healthHandler.HandleHealthz)
	mux.HandleFunc("/readyz", healthHandler.HandleReadyz)

	// 6. Chaînage des middlewares : Logger structuré + CORS
	handler := middleware.RequestLogger(middleware.CORS(mux))

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 7. Configuration du Graceful Shutdown via signal.NotifyContext
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("CloudVault Backend HTTP server listening", "port", cfg.Port)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("Fatal server listen error", "error", err)
			os.Exit(1)
		}
	}()

	// Blocage jusqu'à réception du signal SIGINT ou SIGTERM
	<-ctx.Done()
	slog.Info("Termination signal received (SIGTERM/SIGINT), initiating graceful shutdown...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("Graceful shutdown failed, forcing close", "error", err)
		_ = server.Close()
	} else {
		slog.Info("CloudVault Backend gracefully shut down, all connections drained")
	}
}


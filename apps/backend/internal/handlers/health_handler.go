package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"cloudvault-backend/internal/config"
	"cloudvault-backend/internal/domain"
)

type HealthHandler struct {
	storage domain.DocumentStorage
	cfg     *config.Config
}

func NewHealthHandler(storage domain.DocumentStorage, cfg *config.Config) *HealthHandler {
	return &HealthHandler{
		storage: storage,
		cfg:     cfg,
	}
}

// GET /healthz (Liveness Probe)
func (h *HealthHandler) HandleHealthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "ok",
		"service":   "cloudvault-backend",
		"timestamp": time.Now().UTC(),
	})
}

// GET /readyz (Readiness Probe)
func (h *HealthHandler) HandleReadyz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := h.storage.CheckHealth(ctx); err != nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "not ready",
			"error":  err.Error(),
			"bucket": h.cfg.BucketName,
		})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ready",
		"bucket": h.cfg.BucketName,
	})
}


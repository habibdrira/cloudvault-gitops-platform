package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type Config struct {
	Port         string
	EndpointURL  string
	AWSRegion    string
	BucketName   string
	AccessKey    string
	SecretKey    string
}

type DocumentItem struct {
	Key          string    `json:"key"`
	Filename     string    `json:"filename"`
	Size         int64     `json:"size"`
	LastModified time.Time `json:"last_modified"`
	DownloadURL  string    `json:"download_url"`
}

type UploadURLRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
}

type UploadURLResponse struct {
	UploadURL        string `json:"upload_url"`
	Key              string `json:"key"`
	ExpiresInSeconds int64  `json:"expires_in_seconds"`
}

var (
	appConfig     Config
	s3Client      *s3.Client
	presignClient *s3.PresignClient
)

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func initS3() error {
	appConfig = Config{
		Port:        getEnv("PORT", "8080"),
		EndpointURL: getEnv("AWS_ENDPOINT_URL", "http://192.168.100.10:4566"),
		AWSRegion:   getEnv("AWS_REGION", "us-east-1"),
		BucketName:  getEnv("S3_BUCKET", "cloudvault-documents"),
		AccessKey:   getEnv("AWS_ACCESS_KEY_ID", "test"),
		SecretKey:   getEnv("AWS_SECRET_ACCESS_KEY", "test"),
	}

	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if appConfig.EndpointURL != "" {
			return aws.Endpoint{
				URL:           appConfig.EndpointURL,
				SigningRegion: region,
			}, nil
		}
		return aws.Endpoint{}, &aws.EndpointNotFoundError{}
	})

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(appConfig.AWSRegion),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(appConfig.AccessKey, appConfig.SecretKey, "")),
		config.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		return fmt.Errorf("failed to load AWS config: %w", err)
	}

	s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})
	presignClient = s3.NewPresignClient(s3Client)

	log.Printf("[Init] Connected to S3 Endpoint: %s (Bucket: %s, Region: %s)",
		appConfig.EndpointURL, appConfig.BucketName, appConfig.AWSRegion)
	return nil
}

// LivenessProbe
func handleHealthz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "ok",
		"service":   "cloudvault-backend",
		"timestamp": time.Now().UTC(),
	})
}

// ReadinessProbe (vérifie la connectivité réelle au bucket S3)
func handleReadyz(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	_, err := s3Client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(appConfig.BucketName),
	})
	if err != nil {
		// Fallback: tentative de ListObjects
		_, listErr := s3Client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket:  aws.String(appConfig.BucketName),
			MaxKeys: aws.Int32(1),
		})
		if listErr != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"status": "not ready",
				"error":  err.Error(),
				"bucket": appConfig.BucketName,
			})
			return
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "ready",
		"bucket": appConfig.BucketName,
	})
}

// POST /api/v1/documents/upload-url
func handleGenerateUploadURL(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	var req UploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	if strings.TrimSpace(req.Filename) == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "filename is required"})
		return
	}

	contentType := req.ContentType
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Nettoyage et horodatage de la clé S3
	cleanFilename := filepath.Base(req.Filename)
	cleanFilename = strings.ReplaceAll(cleanFilename, " ", "_")
	objectKey := fmt.Sprintf("%d_%s", time.Now().Unix(), cleanFilename)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	presignedReq, err := presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(appConfig.BucketName),
		Key:         aws.String(objectKey),
		ContentType: aws.String(contentType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 15 * time.Minute
	})
	if err != nil {
		log.Printf("[Error] PresignPutObject failed: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate presigned URL"})
		return
	}

	resp := UploadURLResponse{
		UploadURL:        presignedReq.URL,
		Key:              objectKey,
		ExpiresInSeconds: 900,
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// GET /api/v1/documents
func handleListDocuments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodGet {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	output, err := s3Client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(appConfig.BucketName),
	})
	if err != nil {
		log.Printf("[Error] ListObjectsV2 failed: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to list documents from S3"})
		return
	}

	var documents []DocumentItem
	for _, item := range output.Contents {
		key := aws.ToString(item.Key)
		
		// Extraction du nom de fichier original (sans le préfixe timestamp)
		parts := strings.SplitN(key, "_", 2)
		origFilename := key
		if len(parts) == 2 {
			origFilename = parts[1]
		}

		// Génération d'une URL pré-signée de téléchargement (1 heure)
		presignedGet, presignErr := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(appConfig.BucketName),
			Key:    item.Key,
		}, func(opts *s3.PresignOptions) {
			opts.Expires = 60 * time.Minute
		})

		downloadURL := fmt.Sprintf("%s/%s/%s", appConfig.EndpointURL, appConfig.BucketName, key)
		if presignErr == nil {
			downloadURL = presignedGet.URL
		}

		doc := DocumentItem{
			Key:          key,
			Filename:     origFilename,
			Size:         aws.ToInt64(item.Size),
			LastModified: aws.ToTime(item.LastModified),
			DownloadURL:  downloadURL,
		}
		documents = append(documents, doc)
	}

	if documents == nil {
		documents = []DocumentItem{}
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"documents": documents,
		"total":     len(documents),
		"bucket":    appConfig.BucketName,
	})
}

// Middleware CORS standard pour API REST
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-amz-acl, x-amz-content-sha256")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	if err := initS3(); err != nil {
		log.Fatalf("[Fatal] S3 initialization failed: %v", err)
	}

	mux := http.NewServeMux()

	// Probes Kubernetes
	mux.HandleFunc("/healthz", handleHealthz)
	mux.HandleFunc("/readyz", handleReadyz)

	// API Routes
	mux.HandleFunc("/api/v1/documents/upload-url", handleGenerateUploadURL)
	mux.HandleFunc("/api/v1/documents", handleListDocuments)

	server := &http.Server{
		Addr:         ":" + appConfig.Port,
		Handler:      corsMiddleware(mux),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("[Server] CloudVault Backend listening on port %s", appConfig.Port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("[Fatal] Server terminated unexpectedly: %v", err)
	}
}


package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"cloudvault-backend/internal/config"
	"cloudvault-backend/internal/domain"
)

type DocumentHandler struct {
	storage domain.DocumentStorage
	cfg     *config.Config
}

func NewDocumentHandler(storage domain.DocumentStorage, cfg *config.Config) *DocumentHandler {
	return &DocumentHandler{
		storage: storage,
		cfg:     cfg,
	}
}

// POST /api/v1/documents/upload-url
func (h *DocumentHandler) HandleGenerateUploadURL(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "Method not allowed"})
		return
	}

	var req domain.UploadURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "Invalid JSON request body"})
		return
	}

	filename := strings.TrimSpace(req.Filename)
	if filename == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: domain.ErrInvalidFilename.Error()})
		return
	}

	contentType := strings.TrimSpace(req.ContentType)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// Validation stricte du type MIME
	if contentType != "application/octet-stream" && !h.cfg.IsAllowedMIME(contentType) {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{
			Error: fmt.Sprintf("unsupported MIME type '%s': allowed types are %s", contentType, strings.Join(h.cfg.AllowedMIMEList, ", ")),
			Code:  "INVALID_MIME_TYPE",
		})
		return
	}

	cleanFilename := filepath.Base(filename)
	cleanFilename = strings.ReplaceAll(cleanFilename, " ", "_")
	objectKey := fmt.Sprintf("%d_%s", time.Now().Unix(), cleanFilename)

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	uploadURL, err := h.storage.GenerateUploadURL(ctx, objectKey, contentType)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "Failed to generate presigned upload URL"})
		return
	}

	resp := domain.UploadURLResponse{
		UploadURL:        uploadURL,
		Key:              objectKey,
		ExpiresInSeconds: 900,
	}

	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(resp)
}

// GET /api/v1/documents
func (h *DocumentHandler) HandleListDocuments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "Method not allowed"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	documents, err := h.storage.ListDocuments(ctx)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "Failed to list documents from S3"})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(domain.DocumentListResponse{
		Bucket:    h.cfg.BucketName,
		Documents: documents,
		Total:     len(documents),
	})
}

// DELETE /api/v1/documents/{key}
func (h *DocumentHandler) HandleDeleteDocument(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodDelete {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "Method not allowed"})
		return
	}

	// Extraction de la clé (compatibilité Go 1.22 PathValue ou extraction d'URL)
	key := r.PathValue("key")
	if key == "" {
		key = strings.TrimPrefix(r.URL.Path, "/api/v1/documents/")
	}
	key = strings.TrimSpace(key)

	if key == "" || key == "/api/v1/documents" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "document key is required in URL path"})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	if err := h.storage.DeleteDocument(ctx, key); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: fmt.Sprintf("Failed to delete document: %v", err)})
		return
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "deleted",
		"key":     key,
		"message": "Document successfully deleted from storage",
	})
}

// POST /api/v1/documents/{key}/share
func (h *DocumentHandler) HandleShareDocument(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "Method not allowed"})
		return
	}

	key := r.PathValue("key")
	if key == "" {
		p := strings.TrimPrefix(r.URL.Path, "/api/v1/documents/")
		key = strings.TrimSuffix(p, "/share")
	}
	key = strings.TrimSpace(key)

	if key == "" || key == "/api/v1/documents" {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "document key is required in URL path"})
		return
	}

	var req domain.ShareURLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "Invalid JSON request body"})
		return
	}

	if req.ExpiresInMinutes != 15 && req.ExpiresInMinutes != 60 && req.ExpiresInMinutes != 1440 {
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{
			Error: domain.ErrInvalidShareTTL.Error(),
			Code:  "INVALID_SHARE_TTL",
		})
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	shareURL, err := h.storage.GenerateShareURL(ctx, key, time.Duration(req.ExpiresInMinutes)*time.Minute)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(domain.ErrorResponse{Error: "Failed to generate presigned share URL"})
		return
	}

	resp := domain.ShareURLResponse{
		ShareURL:         shareURL,
		Key:              key,
		ExpiresInSeconds: req.ExpiresInMinutes * 60,
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}



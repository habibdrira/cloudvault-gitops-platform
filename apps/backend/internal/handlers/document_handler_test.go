package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"cloudvault-backend/internal/config"
	"cloudvault-backend/internal/domain"
)

// MockDocumentStorage implémente domain.DocumentStorage pour les tests unitaires
type MockDocumentStorage struct {
	healthErr        error
	uploadURLResult  string
	uploadURLErr     error
	downloadURLResult string
	shareURLResult   string
	shareURLErr      error
	lastSharedKey    string
	lastSharedTTL    time.Duration
	listResult       []domain.DocumentItem
	listErr          error
	deleteErr        error
	lastDeletedKey   string
}

func (m *MockDocumentStorage) CheckHealth(ctx context.Context) error {
	return m.healthErr
}

func (m *MockDocumentStorage) GenerateUploadURL(ctx context.Context, objectKey string, contentType string) (string, error) {
	if m.uploadURLErr != nil {
		return "", m.uploadURLErr
	}
	return m.uploadURLResult, nil
}

func (m *MockDocumentStorage) GenerateDownloadURL(ctx context.Context, objectKey string) (string, error) {
	return m.downloadURLResult, nil
}

func (m *MockDocumentStorage) GenerateShareURL(ctx context.Context, objectKey string, expiration time.Duration) (string, error) {
	m.lastSharedKey = objectKey
	m.lastSharedTTL = expiration
	if m.shareURLErr != nil {
		return "", m.shareURLErr
	}
	return m.shareURLResult, nil
}

func (m *MockDocumentStorage) ListDocuments(ctx context.Context) ([]domain.DocumentItem, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	return m.listResult, nil
}

func (m *MockDocumentStorage) DeleteDocument(ctx context.Context, objectKey string) error {
	m.lastDeletedKey = objectKey
	return m.deleteErr
}

func testConfig() *config.Config {
	return &config.Config{
		Port:        "8080",
		BucketName:  "test-bucket",
		AllowedMIMEList: []string{
			"application/pdf",
			"image/png",
			"image/jpeg",
			"text/plain",
			"application/json",
		},
	}
}

func TestHealthHandler_Healthz(t *testing.T) {
	mockStore := &MockDocumentStorage{}
	h := NewHealthHandler(mockStore, testConfig())

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()

	h.HandleHealthz(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf("expected status 'ok', got %v", body["status"])
	}
}

func TestHealthHandler_Readyz(t *testing.T) {
	t.Run("Storage Healthy", func(t *testing.T) {
		mockStore := &MockDocumentStorage{healthErr: nil}
		h := NewHealthHandler(mockStore, testConfig())

		req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
		w := httptest.NewRecorder()

		h.HandleReadyz(w, req)

		resp := w.Result()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}
	})

	t.Run("Storage Unhealthy", func(t *testing.T) {
		mockStore := &MockDocumentStorage{healthErr: errors.New("S3 unreachable")}
		h := NewHealthHandler(mockStore, testConfig())

		req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
		w := httptest.NewRecorder()

		h.HandleReadyz(w, req)

		resp := w.Result()
		if resp.StatusCode != http.StatusServiceUnavailable {
			t.Fatalf("expected status 503, got %d", resp.StatusCode)
		}
	})
}

func TestDocumentHandler_GenerateUploadURL(t *testing.T) {
	cfg := testConfig()

	t.Run("Valid PDF Document", func(t *testing.T) {
		mockStore := &MockDocumentStorage{
			uploadURLResult: "http://mock-s3/upload/123_doc.pdf",
		}
		h := NewDocumentHandler(mockStore, cfg)

		payload := domain.UploadURLRequest{
			Filename:    "test-document.pdf",
			ContentType: "application/pdf",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/documents/upload-url", bytes.NewReader(body))
		w := httptest.NewRecorder()

		h.HandleGenerateUploadURL(w, req)

		resp := w.Result()
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("expected status 201, got %d", resp.StatusCode)
		}

		var res domain.UploadURLResponse
		if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if res.UploadURL != mockStore.uploadURLResult {
			t.Errorf("expected upload_url %s, got %s", mockStore.uploadURLResult, res.UploadURL)
		}
	})

	t.Run("Rejected Dangerous MIME Type (EXE)", func(t *testing.T) {
		mockStore := &MockDocumentStorage{}
		h := NewDocumentHandler(mockStore, cfg)

		payload := domain.UploadURLRequest{
			Filename:    "malware.exe",
			ContentType: "application/x-msdownload",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/documents/upload-url", bytes.NewReader(body))
		w := httptest.NewRecorder()

		h.HandleGenerateUploadURL(w, req)

		resp := w.Result()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("expected status 400 for forbidden MIME type, got %d", resp.StatusCode)
		}
	})

	t.Run("Empty Filename Rejected", func(t *testing.T) {
		mockStore := &MockDocumentStorage{}
		h := NewDocumentHandler(mockStore, cfg)

		payload := domain.UploadURLRequest{
			Filename:    "",
			ContentType: "application/pdf",
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/documents/upload-url", bytes.NewReader(body))
		w := httptest.NewRecorder()

		h.HandleGenerateUploadURL(w, req)

		resp := w.Result()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("expected status 400 for empty filename, got %d", resp.StatusCode)
		}
	})
}

func TestDocumentHandler_ListDocuments(t *testing.T) {
	mockStore := &MockDocumentStorage{
		listResult: []domain.DocumentItem{
			{
				Key:          "1700000000_audit.pdf",
				Filename:     "audit.pdf",
				Size:         2048,
				LastModified: time.Now(),
				DownloadURL:  "http://mock-s3/download/audit.pdf",
			},
		},
	}
	h := NewDocumentHandler(mockStore, testConfig())

	req := httptest.NewRequest(http.MethodGet, "/api/v1/documents", nil)
	w := httptest.NewRecorder()

	h.HandleListDocuments(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var res domain.DocumentListResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if res.Total != 1 {
		t.Errorf("expected 1 document, got %d", res.Total)
	}
}

func TestDocumentHandler_DeleteDocument(t *testing.T) {
	t.Run("Successful Deletion", func(t *testing.T) {
		mockStore := &MockDocumentStorage{}
		h := NewDocumentHandler(mockStore, testConfig())

		req := httptest.NewRequest(http.MethodDelete, "/api/v1/documents/1700000000_doc.pdf", nil)
		w := httptest.NewRecorder()

		h.HandleDeleteDocument(w, req)

		resp := w.Result()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}
		if mockStore.lastDeletedKey != "1700000000_doc.pdf" {
			t.Errorf("expected deleted key '1700000000_doc.pdf', got '%s'", mockStore.lastDeletedKey)
		}
	})

	t.Run("Storage Deletion Failure", func(t *testing.T) {
		mockStore := &MockDocumentStorage{
			deleteErr: errors.New("S3 AccessDenied"),
		}
		h := NewDocumentHandler(mockStore, testConfig())

		req := httptest.NewRequest(http.MethodDelete, "/api/v1/documents/1700000000_doc.pdf", nil)
		w := httptest.NewRecorder()

		h.HandleDeleteDocument(w, req)

		resp := w.Result()
		if resp.StatusCode != http.StatusInternalServerError {
			t.Fatalf("expected status 500, got %d", resp.StatusCode)
		}
	})
}

func TestDocumentHandler_ShareDocument(t *testing.T) {
	cfg := testConfig()

	t.Run("Valid 15 Minutes TTL", func(t *testing.T) {
		mockStore := &MockDocumentStorage{
			shareURLResult: "http://mock-s3/share/doc.pdf?expires=900",
		}
		h := NewDocumentHandler(mockStore, cfg)

		payload := domain.ShareURLRequest{
			ExpiresInMinutes: 15,
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/documents/1700000000_doc.pdf/share", bytes.NewReader(body))
		w := httptest.NewRecorder()

		h.HandleShareDocument(w, req)

		resp := w.Result()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}

		var res domain.ShareURLResponse
		if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if res.ShareURL != mockStore.shareURLResult {
			t.Errorf("expected share_url %s, got %s", mockStore.shareURLResult, res.ShareURL)
		}
		if res.ExpiresInSeconds != 900 {
			t.Errorf("expected 900 seconds, got %d", res.ExpiresInSeconds)
		}
		if mockStore.lastSharedTTL != 15*time.Minute {
			t.Errorf("expected storage TTL 15m, got %v", mockStore.lastSharedTTL)
		}
	})

	t.Run("Reject Invalid TTL (45 Minutes)", func(t *testing.T) {
		mockStore := &MockDocumentStorage{}
		h := NewDocumentHandler(mockStore, cfg)

		payload := domain.ShareURLRequest{
			ExpiresInMinutes: 45,
		}
		body, _ := json.Marshal(payload)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/documents/1700000000_doc.pdf/share", bytes.NewReader(body))
		w := httptest.NewRecorder()

		h.HandleShareDocument(w, req)

		resp := w.Result()
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("expected status 400 for invalid TTL, got %d", resp.StatusCode)
		}

		var errRes domain.ErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errRes); err != nil {
			t.Fatalf("failed to decode error response: %v", err)
		}
		if errRes.Code != "INVALID_SHARE_TTL" {
			t.Errorf("expected error code INVALID_SHARE_TTL, got %s", errRes.Code)
		}
	})
}


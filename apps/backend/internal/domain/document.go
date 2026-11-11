package domain

import (
	"context"
	"errors"
	"time"
)

var (
	ErrInvalidFilename  = errors.New("filename is required and cannot be empty")
	ErrInvalidMIMEType  = errors.New("invalid or unsupported MIME type")
	ErrDocumentNotFound = errors.New("document not found")
	ErrStorageOperation = errors.New("storage operation failed")
)

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

type DocumentListResponse struct {
	Bucket    string         `json:"bucket"`
	Documents []DocumentItem `json:"documents"`
	Total     int            `json:"total"`
}

type ErrorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code,omitempty"`
}

type DocumentStorage interface {
	CheckHealth(ctx context.Context) error
	GenerateUploadURL(ctx context.Context, objectKey string, contentType string) (string, error)
	GenerateDownloadURL(ctx context.Context, objectKey string) (string, error)
	ListDocuments(ctx context.Context) ([]DocumentItem, error)
	DeleteDocument(ctx context.Context, objectKey string) error
}


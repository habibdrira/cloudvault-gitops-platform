package storage

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"cloudvault-backend/internal/config"
	"cloudvault-backend/internal/domain"
	"cloudvault-backend/internal/metrics"
)

type S3Storage struct {
	cfg           *config.Config
	client        *s3.Client
	presignClient *s3.PresignClient
}

func NewS3Storage(cfg *config.Config) (*S3Storage, error) {
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		if cfg.EndpointURL != "" {
			return aws.Endpoint{
				URL:           cfg.EndpointURL,
				SigningRegion: region,
			}, nil
		}
		return aws.Endpoint{}, &aws.EndpointNotFoundError{}
	})

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(cfg.AWSRegion),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, "")),
		awsconfig.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})
	presignClient := s3.NewPresignClient(client)

	return &S3Storage{
		cfg:           cfg,
		client:        client,
		presignClient: presignClient,
	}, nil
}

func (s *S3Storage) CheckHealth(ctx context.Context) error {
	_, err := s.client.HeadBucket(ctx, &s3.HeadBucketInput{
		Bucket: aws.String(s.cfg.BucketName),
	})
	if err != nil {
		_, listErr := s.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
			Bucket:  aws.String(s.cfg.BucketName),
			MaxKeys: aws.Int32(1),
		})
		if listErr != nil {
			return fmt.Errorf("bucket %s is not accessible: %w", s.cfg.BucketName, err)
		}
	}
	return nil
}

func (s *S3Storage) GenerateUploadURL(ctx context.Context, objectKey string, contentType string) (string, error) {
	start := time.Now()
	presignedReq, err := s.presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.cfg.BucketName),
		Key:         aws.String(objectKey),
		ContentType: aws.String(contentType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 15 * time.Minute
	})
	duration := time.Since(start)
	if err != nil {
		metrics.RecordS3Operation("presign_put", "error", duration)
		return "", fmt.Errorf("PresignPutObject error: %w", err)
	}
	metrics.RecordS3Operation("presign_put", "success", duration)
	return presignedReq.URL, nil
}

func (s *S3Storage) GenerateDownloadURL(ctx context.Context, objectKey string) (string, error) {
	origFilename := objectKey
	if parts := strings.SplitN(objectKey, "_", 2); len(parts) == 2 {
		origFilename = parts[1]
	}
	origFilename = filepath.Base(origFilename)
	disposition := fmt.Sprintf("attachment; filename=\"%s\"", origFilename)

	presignedReq, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket:                     aws.String(s.cfg.BucketName),
		Key:                        aws.String(objectKey),
		ResponseContentDisposition: aws.String(disposition),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 60 * time.Minute
	})
	if err != nil {
		return fmt.Sprintf("%s/%s/%s", s.cfg.EndpointURL, s.cfg.BucketName, objectKey), nil
	}
	return presignedReq.URL, nil
}

func (s *S3Storage) GeneratePreviewURL(ctx context.Context, objectKey string) (string, error) {
	origFilename := objectKey
	if parts := strings.SplitN(objectKey, "_", 2); len(parts) == 2 {
		origFilename = parts[1]
	}
	origFilename = filepath.Base(origFilename)
	disposition := fmt.Sprintf("inline; filename=\"%s\"", origFilename)

	presignedReq, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket:                     aws.String(s.cfg.BucketName),
		Key:                        aws.String(objectKey),
		ResponseContentDisposition: aws.String(disposition),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 60 * time.Minute
	})
	if err != nil {
		return fmt.Sprintf("%s/%s/%s", s.cfg.EndpointURL, s.cfg.BucketName, objectKey), nil
	}
	return presignedReq.URL, nil
}

func (s *S3Storage) GenerateShareURL(ctx context.Context, objectKey string, expiration time.Duration) (string, error) {
	start := time.Now()
	origFilename := objectKey
	if parts := strings.SplitN(objectKey, "_", 2); len(parts) == 2 {
		origFilename = parts[1]
	}
	origFilename = filepath.Base(origFilename)
	disposition := fmt.Sprintf("attachment; filename=\"%s\"", origFilename)

	presignedReq, err := s.presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket:                     aws.String(s.cfg.BucketName),
		Key:                        aws.String(objectKey),
		ResponseContentDisposition: aws.String(disposition),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = expiration
	})
	duration := time.Since(start)
	if err != nil {
		metrics.RecordS3Operation("presign_share", "error", duration)
		return "", fmt.Errorf("PresignGetObject share error: %w", err)
	}
	metrics.RecordS3Operation("presign_share", "success", duration)
	return presignedReq.URL, nil
}

func (s *S3Storage) ListDocuments(ctx context.Context) ([]domain.DocumentItem, error) {
	start := time.Now()
	output, err := s.client.ListObjectVersions(ctx, &s3.ListObjectVersionsInput{
		Bucket: aws.String(s.cfg.BucketName),
	})
	duration := time.Since(start)
	if err != nil {
		metrics.RecordS3Operation("list_objects", "error", duration)
		return nil, fmt.Errorf("ListObjectVersions error: %w", err)
	}
	metrics.RecordS3Operation("list_objects", "success", duration)

	var documents []domain.DocumentItem
	for _, version := range output.Versions {
		if !aws.ToBool(version.IsLatest) {
			continue
		}

		key := aws.ToString(version.Key)
		parts := strings.SplitN(key, "_", 2)
		origFilename := key
		if len(parts) == 2 {
			origFilename = parts[1]
		}
		origFilename = filepath.Base(origFilename)

		downloadURL, _ := s.GenerateDownloadURL(ctx, key)
		previewURL, _ := s.GeneratePreviewURL(ctx, key)

		versionID := aws.ToString(version.VersionId)
		if versionID == "null" {
			versionID = ""
		}

		documents = append(documents, domain.DocumentItem{
			Key:          key,
			Filename:     origFilename,
			Size:         aws.ToInt64(version.Size),
			LastModified: aws.ToTime(version.LastModified),
			DownloadURL:  downloadURL,
			PreviewURL:   previewURL,
			VersionID:    versionID,
			IsLatest:     aws.ToBool(version.IsLatest),
		})
	}

	if documents == nil {
		documents = []domain.DocumentItem{}
	}
	return documents, nil
}

func (s *S3Storage) DeleteDocument(ctx context.Context, objectKey string) error {
	start := time.Now()
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.cfg.BucketName),
		Key:    aws.String(objectKey),
	})
	duration := time.Since(start)
	if err != nil {
		metrics.RecordS3Operation("delete_object", "error", duration)
		return fmt.Errorf("DeleteObject error for key %s: %w", objectKey, err)
	}
	metrics.RecordS3Operation("delete_object", "success", duration)
	return nil
}

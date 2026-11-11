package config

import (
	"os"
	"strings"
)

type Config struct {
	Port            string
	EndpointURL     string
	AWSRegion       string
	BucketName      string
	AccessKey       string
	SecretKey       string
	AllowedMIMEList []string
}

func LoadConfig() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		EndpointURL: getEnv("AWS_ENDPOINT_URL", "http://192.168.100.10:4566"),
		AWSRegion:   getEnv("AWS_REGION", "us-east-1"),
		BucketName:  getEnv("S3_BUCKET", "cloudvault-documents"),
		AccessKey:   getEnv("AWS_ACCESS_KEY_ID", "test"),
		SecretKey:   getEnv("AWS_SECRET_ACCESS_KEY", "test"),
		AllowedMIMEList: []string{
			"application/pdf",
			"image/png",
			"image/jpeg",
			"text/plain",
			"application/json",
		},
	}
}

func (c *Config) IsAllowedMIME(contentType string) bool {
	cleanType := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	for _, allowed := range c.AllowedMIMEList {
		if cleanType == allowed {
			return true
		}
	}
	return false
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}


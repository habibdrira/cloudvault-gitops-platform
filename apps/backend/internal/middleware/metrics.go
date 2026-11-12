package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"cloudvault-backend/internal/metrics"
)

// PrometheusMetrics middleware pour enregistrer les métriques HTTP Golden Signals
func PrometheusMetrics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Éviter de scraper les métriques elles-mêmes dans les golden signals pour ne pas fausser le taux
		if r.URL.Path == "/metrics" {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()
		wrapper := &responseWriterWrapper{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapper, r)

		duration := time.Since(start)

		// Normalisation de l'URI pour éviter l'explosion de cardinalité (ex: /api/v1/documents/{key} ou /api/v1/documents/{key}/share)
		path := r.URL.Path
		if strings.HasPrefix(path, "/api/v1/documents/") && len(path) > len("/api/v1/documents/") {
			if strings.HasSuffix(path, "/share") {
				path = "/api/v1/documents/{key}/share"
			} else if !strings.HasSuffix(path, "upload-url") {
				path = "/api/v1/documents/{key}"
			}
		}

		statusStr := strconv.Itoa(wrapper.statusCode)

		metrics.HTTPRequestsTotal.WithLabelValues(r.Method, path, statusStr).Inc()
		metrics.HTTPRequestDuration.WithLabelValues(r.Method, path, statusStr).Observe(duration.Seconds())
	})
}


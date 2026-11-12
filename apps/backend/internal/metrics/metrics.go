package metrics

import (
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// HTTPRequestsTotal compte le nombre total de requêtes HTTP
	HTTPRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cloudvault_http_requests_total",
			Help: "Nombre total de requêtes HTTP traitées par le backend CloudVault",
		},
		[]string{"method", "path", "status"},
	)

	// HTTPRequestDuration mesure la latence des requêtes HTTP avec des buckets fins
	HTTPRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "cloudvault_http_request_duration_seconds",
			Help:    "Latence des requêtes HTTP en secondes",
			Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5},
		},
		[]string{"method", "path", "status"},
	)

	// S3OperationDuration mesure la durée des opérations S3 (LocalStack / AWS)
	S3OperationDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "cloudvault_s3_operation_duration_seconds",
			Help:    "Durée des opérations de stockage S3 en secondes",
			Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5},
		},
		[]string{"operation"},
	)

	// S3OperationsTotal compte les opérations S3 par opération et statut
	S3OperationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "cloudvault_s3_operations_total",
			Help: "Nombre total d'opérations S3 exécutées par opération et statut",
		},
		[]string{"operation", "status"},
	)
)

// RecordS3Operation enregistre la durée et le résultat d'une opération de stockage S3
func RecordS3Operation(operation, status string, duration time.Duration) {
	S3OperationDuration.WithLabelValues(operation).Observe(duration.Seconds())
	S3OperationsTotal.WithLabelValues(operation, status).Inc()
}


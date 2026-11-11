# ============================================================================
# CloudVault Backend — Multi-stage Distroless Dockerfile
# ============================================================================
# Stage 1 : Compilation statique du binaire Go sans dépendances C (CGO=0)
# Stage 2 : Runtime Distroless ultra-léger (< 25 Mo) avec utilisateur non-root
# ============================================================================

# Stage 1 : Build
FROM golang:1.23-alpine AS builder

WORKDIR /build

COPY . .
RUN go mod tidy

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -trimpath \
    -ldflags="-w -s -extldflags '-static'" \
    -o cloudvault-backend ./cmd/server

# Stage 2 : Runtime Minimal Distroless
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /
COPY --from=builder /build/cloudvault-backend /cloudvault-backend

USER 65532:65532

EXPOSE 8080

ENTRYPOINT ["/cloudvault-backend"]

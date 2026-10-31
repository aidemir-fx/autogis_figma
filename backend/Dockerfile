FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Tidy dependencies with source code present
RUN go mod tidy

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o autogis-backend ./cmd/server

FROM alpine:3.19

WORKDIR /root/

# Install runtime dependencies
RUN apk --no-cache add ca-certificates wget ffmpeg

# Copy binary from builder
COPY --from=builder /app/autogis-backend .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 -O /dev/null http://localhost:3001/healthz || exit 1

# Run the application
CMD ["./autogis-backend"]

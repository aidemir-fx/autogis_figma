.PHONY: help build run dev test clean docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  make dev          - Run in development mode with hot reload"
	@echo "  make build        - Build the application"
	@echo "  make run          - Run the application"
	@echo "  make test         - Run tests"
	@echo "  make docker-up    - Start PostgreSQL container"
	@echo "  make docker-down  - Stop PostgreSQL container"
	@echo "  make clean        - Clean build files"
	@echo "  make deps         - Download dependencies"

deps:
	go mod download
	go mod tidy

build:
	go build -o autogis-backend ./cmd/server

run: build
	./autogis-backend

dev:
	@command -v air >/dev/null 2>&1 || go install github.com/cosmtrek/air@latest
	air

test:
	go test -v -cover ./...

test-coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out

clean:
	rm -f autogis-backend
	rm -f coverage.out

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f postgres

psql:
	psql -h localhost -U postgres -d auto_masters

enable-postgis:
	psql -h localhost -U postgres -d auto_masters -c "CREATE EXTENSION IF NOT EXISTS postgis;"

lint:
	@command -v golangci-lint >/dev/null 2>&1 || go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	golangci-lint run ./...

fmt:
	go fmt ./...

vet:
	go vet ./...

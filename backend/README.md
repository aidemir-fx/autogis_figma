# AutoGIS Backend - Go Implementation

Production-ready REST API backend for AutoGIS application built with Go, Gin, GORM, and PostgreSQL.

## Architecture

This project implements **Clean Architecture** with clear separation of concerns:

```
cmd/server/          - Application entry point
internal/
  ├── domain/        - Business entities and DTOs
  ├── repository/    - Data access layer (interfaces + implementations)
  ├── usecase/       - Business logic layer
  ├── handler/       - HTTP handlers layer
  ├── middleware/    - Middleware (JWT, CORS, etc.)
  ├── config/        - Configuration management
  └── pkg/           - Reusable packages (errors, JWT, geo utilities)
migrations/          - Database migration files
```

## Tech Stack

- **Language**: Go 1.23+
- **Web Framework**: Gin Gonic (lightweight, fast HTTP framework)
- **ORM**: GORM (with PostgreSQL driver)
- **Authentication**: JWT (golang-jwt)
- **Database**: PostgreSQL with PostGIS extension
- **Validation**: go-playground/validator
- **Logging**: uber/zap
- **Environment**: godotenv

## Features

### Authentication
- User registration with phone and password
- Login with JWT tokens (access + refresh)
- Token refresh endpoint
- JWT middleware for protected routes

### User Management
- User profiles with coordinates support
- Role-based access (customer, master, auto_wash, auto_shop, auto_service, admin)
- User information updates

### Orders/Requests
- Create orders from customer to provider
- Order status management (pending → scheduled → completed/cancelled)
- Order history for both customers and providers
- Provider validation

### Search & Discovery
- Search providers by activity types
- Geolocation-based search using PostGIS
- Nearby providers within radius
- Activity types management

### Reviews & Ratings
- Create reviews for providers
- Calculate provider ratings automatically
- Review history

### Additional Services
- AutoWash service management
- AutoShop management
- AutoService management

## Getting Started

### Prerequisites

- Go 1.23+
- PostgreSQL 14+ with PostGIS
- Docker (optional, for PostgreSQL)

### Installation

1. **Clone repository**
```bash
git clone <repo-url>
cd backend
```

2. **Install dependencies**
```bash
go mod download
```

3. **Setup environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Start PostgreSQL (using Docker)**
```bash
docker-compose up -d
```

5. **Enable PostGIS extension**
```bash
psql -U postgres -d auto_masters -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

6. **Run migrations** (GORM auto-migrates on startup)
```bash
# GORM will auto-migrate models on app start if configured
go run ./cmd/server
```

7. **Start the server**
```bash
go run ./cmd/server
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token

### Users (Protected)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `PUT /api/users/:id/role` - Update user role

### Orders (Protected)
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/customer/:customerId` - Get customer's orders
- `GET /api/orders/provider/:providerId` - Get provider's orders
- `PUT /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order (only pending)

### Search & Discovery (Public)
- `POST /api/search/providers` - Search providers by activity type and location
- `GET /api/search/activity-types` - Get available activity types

### Reviews (Protected)
- `POST /api/reviews` - Create review for provider
- `GET /api/reviews/:toId` - Get provider's reviews

## Request/Response Examples

### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "phone": "+380123456789",
  "password": "securepassword123"
}

Response:
{
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refreshToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "phone": "+380123456789",
    "role": "customer",
    "createdAt": "2025-03-23T..."
  }
}
```

### Create Order
```bash
POST /api/orders
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "providerId": "uuid",
  "activityTypeId": "uuid",
  "description": "Need car wash",
  "phone": "+380987654321",
  "price": 500
}
```

### Search Providers
```bash
POST /api/search/providers
Content-Type: application/json

{
  "activityTypes": ["uuid1", "uuid2"],
  "lat": 50.4501,
  "lng": 30.5234,
  "radiusKm": 30
}
```

## Environment Variables

```env
# Server
PORT=3001
HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=auto_masters
DB_SSLMODE=disable

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRE=15          # minutes
JWT_REFRESH_EXPIRE=24         # hours

# Environment
ENVIRONMENT=development

# Frontend CORS
FRONTEND_URL=http://localhost:5173
```

## Database Schema

The application uses PostgreSQL with PostGIS extension. Key tables:

- `users` - User accounts
- `masters` - Master profiles
- `orders` - Service orders/requests
- `activity_types` - Types of services
- `user_activity_types` - User to activity type mapping
- `reviews` - Reviews and ratings
- `auto_washes`, `auto_shops`, `auto_services` - Service providers

All coordinates are stored as GeoJSON Point types for PostGIS support.

## Development

### Project Structure Best Practices

1. **Domain Layer** (`internal/domain/`)
   - Pure business entities
   - DTOs for API contracts
   - No external dependencies

2. **Repository Layer** (`internal/repository/`)
   - Interfaces defining contracts
   - Implementations for PostgreSQL
   - All database queries

3. **Use Case Layer** (`internal/usecase/`)
   - Business logic
   - Validation
   - Orchestration of repositories

4. **Handler Layer** (`internal/handler/`)
   - HTTP request handling
   - Response formatting
   - Error handling

5. **Middleware** (`internal/middleware/`)
   - JWT authentication
   - CORS
   - Request/response logging

### Adding New Features

1. Define entity in `internal/domain/entities.go`
2. Create DTOs in `internal/domain/dto.go`
3. Define repository interface in `internal/repository/interfaces.go`
4. Implement repository in `internal/repository/postgres.go`
5. Create use case in `internal/usecase/`
6. Create handler in `internal/handler/`
7. Add routes in `cmd/server/main.go`

### Error Handling

Use custom `AppError` type for consistent error responses:

```go
import apperrors "github.com/gmt061/autogis-backend/internal/pkg/errors"

if err != nil {
    return nil, apperrors.ErrUserNotFound // Returns {code, message, httpStatus}
}
```

## Testing

```bash
# Run tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific test
go test -run TestFunctionName ./...
```

## Building for Production

```bash
# Build binary
go build -o autogis-backend ./cmd/server

# Or using Docker
docker build -t autogis-backend .
```

## Performance Considerations

1. **Database Indexes**: Created on frequently queried columns (phone, userId, etc.)
2. **Eager Loading**: GORM preloads related entities to avoid N+1 queries
3. **Connection Pooling**: GORM manages PostgreSQL connection pool
4. **PostGIS Optimization**: Geographic queries use indexed spatial columns

## Security

- JWT tokens with 15-minute expiry
- Password hashing with bcrypt
- CORS middleware for frontend requests
- SQL injection prevention via parameterized queries (GORM)
- Input validation on all endpoints

## Deployment

### Docker Deployment

```bash
# Build image
docker build -t autogis-backend:latest .

# Run container
docker run -d \
  --name autogis-backend \
  -p 3001:3001 \
  -e DB_HOST=postgres \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=postgres \
  autogis-backend:latest
```

### Environment-Specific Configuration

```bash
# Development
ENVIRONMENT=development go run ./cmd/server

# Production
ENVIRONMENT=production JWT_SECRET=your-prod-secret go run ./cmd/server
```

## Contributing

1. Create feature branch
2. Follow Clean Architecture principles
3. Write tests for new features
4. Ensure code passes linting
5. Submit pull request

## License

This project is part of AutoGIS platform.

## Support

For issues and questions, please refer to the main project documentation.

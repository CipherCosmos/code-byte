# HackArena Backend - Docker Development Setup

This guide explains how to run the HackArena backend locally using Docker Compose for development.

## Prerequisites

- Docker and Docker Compose installed on your system
- Node.js 18+ (for local development without Docker)

## Quick Start

1. **Clone the repository and navigate to the backend directory:**
   ```bash
   cd hackarena-backend
   ```

2. **Copy the local environment file:**
   ```bash
   cp .env.local .env
   ```

3. **Start the services:**
   ```bash
   docker-compose up --build
   ```

   This will:
   - Build the backend service using the Dockerfile
   - Start a PostgreSQL database
   - Initialize the database with tables and sample data
   - Start the backend server on port 10000

4. **Access the application:**
   - Backend API: http://localhost:10000
   - Database: localhost:5432 (accessible from host machine)

## Services

### Backend Service
- **Image:** Built from local Dockerfile
- **Port:** 10000
- **Environment:** Development mode
- **Volumes:** Source code mounted for hot reloading
- **Command:** `npm run dev` (uses ts-node for development)

### PostgreSQL Database
- **Image:** postgres:15-alpine
- **Port:** 5432
- **Database:** hackarena_db
- **User:** hackarena
- **Password:** hackarena_password
- **Volume:** Persistent data storage
- **Init Script:** Automatically runs database initialization

## Development Workflow

### Starting Services
```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f db

# Stop services
docker-compose down
```

### Database Management
```bash
# Connect to database
docker-compose exec db psql -U hackarena -d hackarena_db

# Reset database (removes all data)
docker-compose down -v
docker-compose up --build
```

### Code Changes
- Backend code changes are automatically reflected due to volume mounting
- Database schema changes require rebuilding the services

## Environment Variables

Key environment variables for local development:

- `NODE_ENV=development`
- `DATABASE_URL=postgresql://hackarena:hackarena_password@db:5432/hackarena_db`
- `JWT_SECRET=dev-jwt-secret-change-in-production`
- `FRONTEND_URL=http://localhost:3000`

See `.env.local` for the complete list.

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Ensure ports 5432 and 10000 are available
   - Modify `docker-compose.yml` if needed

2. **Database connection issues:**
   - Wait for database health check to pass
   - Check logs: `docker-compose logs db`

3. **Build failures:**
   - Clear Docker cache: `docker system prune`
   - Rebuild: `docker-compose up --build --force-recreate`

4. **Permission issues:**
   - Ensure Docker has access to the project directory

### Useful Commands

```bash
# View running containers
docker-compose ps

# Execute commands in containers
docker-compose exec backend sh
docker-compose exec db bash

# View resource usage
docker-compose top

# Clean up
docker-compose down -v --remove-orphans
```

## Production Deployment

For production deployment, use the existing `render.yaml` or modify the Dockerfile for your deployment platform. The Docker setup here is optimized for development with hot reloading and mounted volumes.

## File Structure

```
hackarena-backend/
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile             # Multi-stage build for production
├── .env.local            # Local development environment variables
├── src/
│   └── database/
│       └── init.sql      # Database initialization script
└── README-docker.md      # This file
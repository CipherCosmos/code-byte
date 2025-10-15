# HackArena Backend - Final Render Deployment Guide

This comprehensive guide provides everything needed to successfully deploy the HackArena backend to Render. It consolidates all deployment information, commands, configurations, and troubleshooting steps.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build and Run Commands](#build-and-run-commands)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [GitHub Repository Setup](#github-repository-setup)
6. [Render Configuration](#render-configuration)
7. [Deployment Steps](#deployment-steps)
8. [Testing the Deployment](#testing-the-deployment)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Troubleshooting](#troubleshooting)
11. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Prerequisites

- [ ] Render account (free tier available at render.com)
- [ ] GitHub account with repository access
- [ ] PostgreSQL database (Render PostgreSQL or external provider)
- [ ] Google OAuth credentials (optional, for authentication)
- [ ] Cloudinary account (optional, for file uploads)
- [ ] Domain name (optional, for custom domain)

## Build and Run Commands

### Local Development Commands

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run database migrations
npm run migrate

# Run production migrations
npm run migrate:prod

# Run tests
npm test

# Check database connection
node test-connection.js

# Check timezone settings
node test-timezone.js
```

### Render-Specific Commands

Render automatically uses these commands from `render.yaml`:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:render`

## Environment Variables

### Required Variables

Set these in Render dashboard under Service Settings > Environment:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:port/db?sslmode=require` |
| `JWT_SECRET` | Strong random string (min 32 chars) | `your-super-secure-jwt-secret-here` |
| `FRONTEND_URL` | Frontend application URL | `https://hackarena-frontend.onrender.com` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Cloudinary API key | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | `your-secret-key` |
| `CLOUDINARY_URL` | Full Cloudinary URL | `cloudinary://api_key:api_secret@cloud_name` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `your-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `your-client-secret` |
| `NODE_ENV` | Environment (auto-set by Render) | `production` |
| `PORT` | Port (auto-assigned by Render) | `10000` |

### Environment Variables Template

Copy this to Render's environment variables section:

```
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
JWT_SECRET=your-super-secure-jwt-secret-here-minimum-32-characters
FRONTEND_URL=https://your-frontend-domain.onrender.com
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_URL=cloudinary://your-cloudinary-url
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Database Setup

### Option 1: Render PostgreSQL (Recommended)

1. **Create Database**
   - Go to Render Dashboard > PostgreSQL
   - Click "Create Database"
   - Choose plan (Starter $7/month recommended)
   - Select region closest to your users
   - Create database

2. **Get Connection Details**
   - Copy the `DATABASE_URL` from database dashboard
   - Format: `postgresql://user:pass@host:port/db?sslmode=require`

3. **Database Configuration**
   - Render PostgreSQL automatically handles SSL
   - No additional firewall configuration needed
   - Database is accessible from Render services

### Option 2: External PostgreSQL

1. **Choose Provider**
   - AWS RDS, Google Cloud SQL, DigitalOcean Managed DB, etc.
   - Ensure SSL is required (`sslmode=require`)

2. **Configure Firewall**
   - Allow connections from `0.0.0.0/0` (all IPs)
   - Or whitelist Render's IP ranges if supported

3. **Test Connection**
   ```bash
   # Test locally
   node -e "require('pg').Pool(process.env.DATABASE_URL).query('SELECT 1', (err, res) => console.log(err || 'Connected'))"
   ```

## GitHub Repository Setup

### Repository Preparation

1. **Ensure Code is Ready**
   ```bash
   # Verify all files are committed
   git status

   # Add any missing files
   git add .

   # Commit changes
   git commit -m "Prepare for Render deployment"

   # Push to GitHub
   git push origin main
   ```

2. **Repository Structure**
   Ensure your repository contains:
   - `hackarena-backend/` directory with all backend code
   - `render.yaml` in the backend directory
   - `package.json` with all dependencies
   - `.env.example` for reference

3. **GitHub Permissions**
   - Repository must be public or you must have Render access
   - If private, connect via GitHub integration

## Render Configuration

### Service Configuration (render.yaml)

The `render.yaml` file is pre-configured:

```yaml
services:
  - type: web
    name: hackarena-backend
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm run start:render
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        fromSecret: PORT
      - key: DATABASE_URL
        fromSecret: DATABASE_URL
      - key: JWT_SECRET
        fromSecret: JWT_SECRET
      - key: FRONTEND_URL
        fromSecret: FRONTEND_URL
      - key: CLOUDINARY_CLOUD_NAME
        fromSecret: CLOUDINARY_CLOUD_NAME
      - key: CLOUDINARY_API_KEY
        fromSecret: CLOUDINARY_API_KEY
      - key: CLOUDINARY_API_SECRET
        fromSecret: CLOUDINARY_API_SECRET
      - key: CLOUDINARY_URL
        fromSecret: CLOUDINARY_URL
      - key: GOOGLE_CLIENT_ID
        fromSecret: GOOGLE_CLIENT_ID
      - key: GOOGLE_CLIENT_SECRET
        fromSecret: GOOGLE_CLIENT_SECRET
    healthCheckPath: /api/health
    disk:
      name: hackarena-data
      mountPath: /opt/render/project/src/data
      sizeGB: 1
```

### Health Check Configuration

- **Health Check Path**: `/api/health`
- **Health Check Method**: GET (automatic)
- **Expected Response**: HTTP 200 with JSON `{"status":"OK"}`

## Deployment Steps

### Step 1: Connect Repository

1. Go to [render.com](https://render.com) and sign in
2. Click "New" > "Blueprint"
3. Connect your GitHub account
4. Select your repository
5. Choose branch (usually `main` or `master`)

### Step 2: Configure Services

1. **Review Blueprint**
   - Render will detect `render.yaml`
   - Services will be auto-configured

2. **Set Environment Variables**
   - Go to each service > Environment
   - Add all required variables from the template above
   - Use "Secret" type for sensitive data

3. **Configure Database**
   - If using Render PostgreSQL, create it first
   - Copy `DATABASE_URL` to environment variables

### Step 3: Deploy

1. **Initial Deployment**
   - Click "Create Blueprint"
   - Render will build and deploy automatically
   - Monitor build logs for errors

2. **Build Process**
   - Installs dependencies (`npm install`)
   - Builds TypeScript (`npm run build`)
   - Runs database migrations (`npm run migrate:prod`)
   - Starts server (`npm run start:render`)

### Step 4: Post-Deployment Setup

1. **Update Frontend URL**
   - Get your backend URL from Render dashboard
   - Update `FRONTEND_URL` environment variable if needed

2. **Configure CORS**
   - Ensure `FRONTEND_URL` matches your frontend domain
   - Update Google OAuth redirect URIs if necessary

## Testing the Deployment

### Health Check

```bash
# Test health endpoint
curl https://your-service.onrender.com/api/health
# Expected: {"status":"OK","message":"HackArena Backend is running"}
```

### API Testing

```bash
# Test API endpoints
curl https://your-service.onrender.com/api/games
curl https://your-service.onrender.com/api/auth/status

# Test with authentication (replace TOKEN)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://your-service.onrender.com/api/games
```

### Database Connection Test

```bash
# Test database connectivity
curl https://your-service.onrender.com/api/health/db
# Should return success message
```

### WebSocket Testing

```bash
# Test Socket.IO connection
# Use browser dev tools or tools like WebSocket King
# Connect to: wss://your-service.onrender.com
```

## Post-Deployment Verification

### Checklist

- [ ] Service is running (green status in Render)
- [ ] Health check endpoint returns 200
- [ ] Database connection successful
- [ ] Environment variables loaded correctly
- [ ] Logs show no critical errors
- [ ] WebSocket connections work
- [ ] API endpoints respond correctly
- [ ] CORS headers allow frontend requests
- [ ] File uploads work (if using Cloudinary)

### Log Verification

1. **Check Build Logs**
   - Go to Render Dashboard > Service > Logs tab
   - Verify no build errors
   - Confirm database migration success

2. **Check Runtime Logs**
   - Monitor for application errors
   - Verify database connections
   - Check for WebSocket connection logs

### Performance Testing

```bash
# Test response times
curl -w "@curl-format.txt" -o /dev/null -s \
     https://your-service.onrender.com/api/health

# curl-format.txt:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_appconnect:  %{time_appconnect}\n
#        time_pretransfer:  %{time_pretransfer}\n
#           time_redirect:  %{time_redirect}\n
#              time_starttransfer:  %{time_starttransfer}\n
#                         time_total:  %{time_total}\n
```

## Troubleshooting

### Build Failures

**TypeScript Compilation Errors**
```
Solution:
- Check package.json dependencies
- Verify Node.js version (Render uses Node 18+)
- Run npm install locally first
- Check for missing type definitions
```

**Build Timeout**
```
Solution:
- Remove unnecessary devDependencies
- Optimize build process
- Use build cache
- Consider smaller base image
```

### Runtime Errors

**Database Connection Failed**
```
Common causes:
- Incorrect DATABASE_URL format
- Missing sslmode=require
- Database rejecting connections
- Firewall blocking Render IPs

Solutions:
- Verify DATABASE_URL: postgresql://user:pass@host:port/db?sslmode=require
- Check database logs
- Ensure database allows all IPs (0.0.0.0/0)
- Test connection locally
```

**Environment Variables Not Loading**
```
Solutions:
- Check variables in Render dashboard
- Restart service after adding variables
- Ensure exact name matching (case-sensitive)
- Use Render secrets for sensitive data
```

**Port Binding Errors**
```
Solution:
- Render auto-assigns PORT variable
- Remove hardcoded ports
- Use process.env.PORT || default_port
- Ensure server listens on 0.0.0.0
```

### WebSocket Issues

**Socket.IO Connections Failing**
```
Solutions:
- Verify CORS allows frontend domain
- Check Render WebSocket support
- Ensure proper Socket.IO config for production
- Test with simple HTTP endpoints first
```

### Performance Issues

**Slow Startup**
```
Solutions:
- Optimize database initialization
- Use connection pooling
- Implement caching
- Monitor memory usage
```

**Memory Limits Exceeded**
```
Solutions:
- Upgrade Render plan
- Optimize memory usage
- Implement garbage collection
- Use external services for heavy operations
```

## Monitoring and Maintenance

### Accessing Logs

- **Render Dashboard**: Service > Logs tab
- **CLI**: `render logs` command
- **External**: Set up log streaming

### Health Monitoring

- **Endpoint**: `/api/health` for basic checks
- **Detailed Checks**: Implement comprehensive health endpoints
- **Uptime**: Use monitoring services

### Scaling

- **Free Tier**: 750 hours/month, auto-sleep after 15min
- **Paid Plans**: Higher limits, persistent services
- **Horizontal Scaling**: Multiple instances (paid plans)

### Backups

- **Database**: Use Render PostgreSQL automated backups
- **Files**: Implement backup strategy for uploads
- **Code**: Repository serves as code backup

### Updates

1. **Code Updates**
   ```bash
   # Push changes to GitHub
   git add .
   git commit -m "Update deployment"
   git push origin main
   # Render auto-deploys
   ```

2. **Dependency Updates**
   ```bash
   # Update package.json
   npm update
   # Test locally, then deploy
   ```

### Security

- [ ] Use strong JWT secrets
- [ ] Enable SSL/TLS (automatic on Render)
- [ ] Rotate API keys regularly
- [ ] Implement rate limiting
- [ ] Keep dependencies updated
- [ ] Monitor for vulnerabilities

## Support

If issues persist:
1. Check Render status page for outages
2. Review Render documentation
3. Check GitHub issues for similar problems
4. Contact Render support with specific error logs

## Quick Reference

### Essential Commands
```bash
# Local testing
npm run build && npm run migrate:prod && npm start

# Health check
curl https://your-service.onrender.com/api/health

# Environment check
node -e "console.log(process.env)"
```

### Key URLs
- **Render Dashboard**: https://dashboard.render.com
- **Service URL**: https://your-service.onrender.com
- **Health Check**: https://your-service.onrender.com/api/health
- **API Docs**: https://your-service.onrender.com/api/docs (if implemented)

This guide covers everything needed for a successful HackArena backend deployment to Render. Follow the steps in order and refer to troubleshooting if issues arise.
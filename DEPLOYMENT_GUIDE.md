# HackArena Deployment Guide

Complete deployment instructions for HackArena backend and frontend applications.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Deployment](#production-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Environment Configuration](#environment-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backup and Recovery](#backup-and-recovery)
10. [Scaling Considerations](#scaling-considerations)

## Prerequisites

### System Requirements

#### Backend Server
- **OS**: Linux, macOS, or Windows
- **Node.js**: v16.0.0 or higher
- **Database**: SQLite (included) or PostgreSQL/MySQL
- **Memory**: Minimum 512MB RAM, recommended 1GB+
- **Storage**: 1GB+ for database and uploads
- **Network**: Internet connection for Google OAuth

#### Frontend Application
- **Node.js**: v16.0.0 or higher
- **Build Tools**: Modern web browser with ES6 support
- **Storage**: 500MB for build artifacts

### Required Accounts and Services

1. **Google OAuth Credentials**
   - Google Cloud Console account
   - OAuth 2.0 Client ID for web application
   - Authorized redirect URIs configured

2. **Domain and SSL Certificate** (for production)
   - Registered domain name
   - SSL certificate (Let's Encrypt recommended)

3. **Cloud Hosting** (optional)
   - AWS, Google Cloud, DigitalOcean, or similar
   - Docker registry (optional)

## Local Development Setup

### Backend Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd hackarena-backend
npm install
```

2. **Database Initialization**
```bash
# Initialize database
npm run migrate

# Verify database setup
ls -la database/
```

3. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Google OAuth Setup**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing
- Enable Google+ API
- Create OAuth 2.0 credentials
- Add authorized redirect URIs:
  - `http://localhost:3001` (for development)
  - `https://yourdomain.com` (for production)

5. **Start Development Server**
```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

### Frontend Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd hackarena-frontend
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Configure API base URL and Google Client ID
```

3. **Start Development Server**
```bash
npm run dev
# Opens at http://localhost:5173
```

### Testing the Setup

1. **Backend Health Check**
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"OK","message":"HackArena Backend is running"}
```

2. **Frontend Access**
- Open http://localhost:5173 in browser
- Try user registration and login
- Create a test game and verify functionality

## Production Deployment

### Backend Deployment

#### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create application directory
sudo mkdir -p /var/www/hackarena-backend
sudo chown -R $USER:$USER /var/www/hackarena-backend
```

#### 2. Application Deployment

```bash
# Clone repository
cd /var/www/hackarena-backend
git clone <repository-url> .
npm ci --only=production

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Database setup
npm run migrate

# Environment configuration
cp .env.example .env
# Edit .env with production values
```

#### 3. Process Management with PM2

```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'hackarena-backend',
    script: 'src/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

#### 4. Nginx Reverse Proxy Setup

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/hackarena-backend
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Static files
    location /uploads/ {
        alias /var/www/hackarena-backend/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/hackarena-backend /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Frontend Deployment

#### 1. Build Process

```bash
cd hackarena-frontend
npm ci
npm run build
```

#### 2. Static File Serving

```bash
# Create frontend directory
sudo mkdir -p /var/www/hackarena-frontend

# Copy build files
cp -r dist/* /var/www/hackarena-frontend/

# Set permissions
sudo chown -R www-data:www-data /var/www/hackarena-frontend
```

#### 3. Nginx Configuration for Frontend

```bash
sudo nano /etc/nginx/sites-available/hackarena-frontend
```

```nginx
server {
    listen 80;
    server_name your-frontend-domain.com;
    root /var/www/hackarena-frontend;
    index index.html;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

## Docker Deployment

### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  hackarena-backend:
    build:
      context: ./hackarena-backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DATABASE_URL=/app/database/hackarena.db
    volumes:
      - ./hackarena-backend/uploads:/app/uploads
      - ./hackarena-backend/database:/app/database
    restart: unless-stopped
    depends_on:
      - postgres

  hackarena-frontend:
    build:
      context: ./hackarena-frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=hackarena
      - POSTGRES_USER=hackarena
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - hackarena-backend
      - hackarena-frontend
    restart: unless-stopped

volumes:
  postgres_data:
```

### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S hackarena -u 1001

# Set permissions
RUN chown -R hackarena:nodejs /app
USER hackarena

EXPOSE 3001

CMD ["npm", "start"]
```

### Frontend Dockerfile

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

## Cloud Deployment

### AWS Deployment

#### EC2 + RDS Setup

1. **Launch EC2 Instance**
```bash
# Ubuntu 20.04 LTS, t3.micro or larger
# Security group: allow SSH (22), HTTP (80), HTTPS (443)
```

2. **Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx

# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx
```

3. **Database Setup (RDS)**
- Create PostgreSQL RDS instance
- Configure security groups
- Update environment variables

4. **Application Deployment**
```bash
# Clone and setup as described in production deployment
git clone <repository-url> /var/www/hackarena-backend
cd /var/www/hackarena-backend
npm ci --only=production
npm run migrate
```

5. **SSL Certificate**
```bash
sudo certbot --nginx -d your-domain.com
```

### Google Cloud Run

#### Backend Deployment

```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/hackarena-backend', './hackarena-backend']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/hackarena-backend']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'hackarena-backend'
      - '--image'
      - 'gcr.io/$PROJECT_ID/hackarena-backend'
      - '--platform'
      - 'managed'
      - '--port'
      - '3001'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'NODE_ENV=production'
```

#### Frontend Deployment

```yaml
# Firebase hosting or Cloud Storage
# Build and deploy static files
npm run build
firebase deploy --only hosting
```

## Environment Configuration

### Backend Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=/app/database/hackarena.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@host:port/database

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Frontend
FRONTEND_URL=https://your-frontend-domain.com

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Email (optional, for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### Frontend Environment Variables

```bash
# API Configuration
VITE_API_BASE_URL=https://your-backend-domain.com/api

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Application
VITE_APP_NAME=HackArena
VITE_APP_VERSION=1.0.0
```

## SSL/TLS Setup

### Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Automatic renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Manual SSL Setup

```bash
# Place certificate files in /etc/ssl/certs/
sudo cp your-domain.crt /etc/ssl/certs/
sudo cp your-domain.key /etc/ssl/private/

# Update Nginx configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # ... rest of configuration
}
```

## Monitoring and Logging

### Application Monitoring

```bash
# PM2 monitoring
pm2 monit

# PM2 logs
pm2 logs hackarena-backend

# System monitoring
htop
df -h
free -h
```

### Log Management

```bash
# Create log directory
mkdir -p logs

# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Health Checks

```bash
# Application health check
curl https://your-domain.com/api/health

# Database connectivity check
# Add to your monitoring system
```

## Backup and Recovery

### Database Backup

```bash
# SQLite backup (daily cron job)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
sqlite3 /var/www/hackarena-backend/database/hackarena.db ".backup /var/backups/hackarena_$DATE.db"

# PostgreSQL backup
pg_dump hackarena > /var/backups/hackarena_$DATE.sql
```

### File Backup

```bash
# Uploads directory backup
rsync -av /var/www/hackarena-backend/uploads /var/backups/

# Compress old backups
find /var/backups -name "*.db" -mtime +30 -exec gzip {} \;
```

### Automated Backup Script

```bash
#!/bin/bash
# /usr/local/bin/backup-hackarena.sh

BACKUP_DIR="/var/backups/hackarena"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
sqlite3 /var/www/hackarena-backend/database/hackarena.db ".backup $BACKUP_DIR/database_$DATE.db"

# Files backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/hackarena-backend/uploads/

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer Setup**
```nginx
upstream hackarena_backend {
    server backend1:3001;
    server backend2:3001;
    server backend3:3001;
}

server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://hackarena_backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

2. **Session Management**
- Use Redis for session storage
- Configure sticky sessions or JWT-based auth

3. **Database Scaling**
- Migrate from SQLite to PostgreSQL
- Implement read replicas
- Use connection pooling

### Performance Optimization

1. **Caching**
```bash
# Redis setup for caching
npm install redis
```

2. **CDN for Static Assets**
- Use CloudFront, Cloudflare, or similar
- Cache uploaded images and static files

3. **Database Optimization**
- Add indexes on frequently queried columns
- Implement query optimization
- Use database connection pooling

### Monitoring and Alerting

1. **Application Metrics**
- Response times
- Error rates
- Throughput

2. **System Metrics**
- CPU usage
- Memory usage
- Disk space
- Network I/O

3. **Business Metrics**
- Active games
- Participant count
- Game completion rates

## Troubleshooting

### Common Issues

#### Backend Not Starting
```bash
# Check logs
pm2 logs hackarena-backend

# Check environment variables
cat .env

# Test database connection
npm run migrate
```

#### Frontend Build Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check environment variables
cat .env
```

#### Database Connection Issues
```bash
# Test SQLite connection
sqlite3 database/hackarena.db "SELECT 1;"

# Check file permissions
ls -la database/
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /etc/ssl/certs/your-domain.crt -text -noout

# Renew certificate
sudo certbot renew
```

### Performance Issues

1. **High Memory Usage**
```bash
# Check PM2 memory usage
pm2 monit

# Restart application
pm2 restart hackarena-backend
```

2. **Slow Response Times**
```bash
# Check system resources
top
df -h

# Check database performance
sqlite3 database/hackarena.db ".stats on"
```

3. **High CPU Usage**
```bash
# Profile application
npm install -g clinic
clinic doctor -- node src/server.js
```

## Security Checklist

- [ ] SSL/TLS certificates installed
- [ ] Environment variables secured
- [ ] Database credentials encrypted
- [ ] File upload restrictions in place
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Security headers set
- [ ] Regular security updates
- [ ] Backup procedures in place
- [ ] Access logs monitored
- [ ] Firewall rules configured

## Maintenance Tasks

### Daily
- Monitor application logs
- Check disk space usage
- Verify backup completion

### Weekly
- Review error logs
- Update dependencies
- Check SSL certificate expiry

### Monthly
- Security updates
- Performance optimization
- Database maintenance

### Quarterly
- Full system audit
- Disaster recovery testing
- Documentation updates
# Code Byte Backend - Render Deployment Guide

## 🚀 Deployment Checklist

### Prerequisites
- [ ] Render account created and logged in
- [ ] PostgreSQL database instance ready (Render PostgreSQL or external)
- [ ] Domain configured (optional, for custom domain)
- [ ] Environment variables prepared

### 1. Database Setup
- [ ] Create PostgreSQL database on Render or use external provider
- [ ] Note down the `DATABASE_URL` (format: `postgresql://user:pass@host:port/db?sslmode=require`)
- [ ] Ensure database allows SSL connections
- [ ] Test database connectivity locally if possible

### 2. Environment Variables
Set these in Render dashboard under Service Settings > Environment:

**Required:**
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Strong random string (min 32 characters)
- [ ] `FRONTEND_URL` - Your frontend application URL (e.g., `https://codebyte-frontend.onrender.com`)

**Optional but Recommended:**
- [ ] `CLOUDINARY_CLOUD_NAME` - For file uploads
- [ ] `CLOUDINARY_API_KEY` - Cloudinary API key
- [ ] `CLOUDINARY_API_SECRET` - Cloudinary API secret
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

### 3. Deploy to Render
- [ ] Connect GitHub repository to Render
- [ ] Create new Web Service from `render.yaml`
- [ ] Set build and start commands (should auto-populate from render.yaml)
- [ ] Configure environment variables
- [ ] Set health check path to `/api/health`
- [ ] Deploy service

### 4. Post-Deployment Verification
- [ ] Check Render logs for successful build
- [ ] Verify health check endpoint: `https://your-service.onrender.com/api/health`
- [ ] Test database connection in logs
- [ ] Confirm WebSocket connections work (if applicable)

### 5. Domain Configuration (Optional)
- [ ] Add custom domain in Render dashboard
- [ ] Update DNS records as instructed
- [ ] Update `FRONTEND_URL` environment variable if changed

## 🔧 Troubleshooting Guide

### Build Failures

**Issue: TypeScript compilation errors**
```
Solution: Ensure all dependencies are installed and TypeScript types are correct
- Check package.json for missing devDependencies
- Run `npm install` locally first
- Verify Node.js version compatibility (Render uses Node 18+)
```

**Issue: Build timeout**
```
Solution: Optimize build process
- Remove unnecessary devDependencies from production
- Use build cache if possible
- Consider using a smaller base image
```

### Runtime Errors

**Issue: Database connection failed**
```
Common causes:
- Incorrect DATABASE_URL format
- SSL mode not set to 'require'
- Database server rejecting connections
- Firewall blocking Render's IP ranges

Solutions:
- Verify DATABASE_URL format: postgresql://user:pass@host:port/db?sslmode=require
- Check database logs for connection attempts
- Ensure database allows connections from any IP (0.0.0.0/0)
- Test connection locally with same credentials
```

**Issue: Environment variables not loading**
```
Solutions:
- Ensure variables are set in Render dashboard (not .env file)
- Restart service after adding new variables
- Check variable names match exactly (case-sensitive)
- Use Render's secret management for sensitive data
```

**Issue: Port binding errors**
```
Solution: Render automatically assigns PORT environment variable
- Remove hardcoded port numbers
- Use process.env.PORT || default_port
- Ensure server listens on 0.0.0.0, not localhost
```

### WebSocket Issues

**Issue: Socket.IO connections failing**
```
Solutions:
- Verify CORS settings allow your frontend domain
- Check if WebSocket connections are enabled in Render
- Ensure proper Socket.IO configuration for production
- Test with simple HTTP endpoints first
```

### Performance Issues

**Issue: Slow startup times**
```
Solutions:
- Optimize database initialization
- Use connection pooling
- Implement proper caching
- Monitor memory usage
```

**Issue: Memory limits exceeded**
```
Solutions:
- Upgrade Render service plan
- Optimize memory usage in code
- Implement proper garbage collection
- Use external services for heavy operations
```

### Monitoring and Logs

**Accessing logs:**
- Go to Render dashboard > Service > Logs tab
- Use `render logs` CLI command
- Set up log streaming to external services

**Health monitoring:**
- Use `/api/health` endpoint for basic checks
- Implement detailed health checks
- Set up uptime monitoring services

### Common Render-Specific Issues

**Issue: Service keeps restarting**
```
Check:
- Health check endpoint returning 200
- No unhandled exceptions in logs
- Memory/CPU limits not exceeded
- Database connections stable
```

**Issue: Cold start problems**
```
Solutions:
- Implement graceful shutdown
- Use connection pooling
- Cache frequently used data
- Optimize startup sequence
```

## 📋 Useful Commands

```bash
# Local testing before deployment
npm run build
npm run migrate:prod
npm start

# Check environment variables
node -e "console.log(process.env)"

# Test database connection
node -e "require('pg').Pool(process.env.DATABASE_URL).query('SELECT 1', (err, res) => console.log(err || 'Connected'))"
```

## 🔒 Security Considerations

- [ ] Use strong, unique JWT secrets
- [ ] Enable SSL/TLS for all connections
- [ ] Regularly rotate API keys and secrets
- [ ] Implement rate limiting
- [ ] Use environment variables for all sensitive data
- [ ] Keep dependencies updated
- [ ] Monitor for security vulnerabilities

## 📞 Support

If issues persist:
1. Check Render status page for outages
2. Review Render documentation
3. Check GitHub issues for similar problems
4. Contact Render support with specific error logs
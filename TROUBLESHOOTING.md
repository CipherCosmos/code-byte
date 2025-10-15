# HackArena Troubleshooting Guide

Comprehensive troubleshooting guide for common issues and problems in HackArena.

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Database Problems](#database-problems)
3. [Authentication Issues](#authentication-issues)
4. [Real-time Connection Problems](#real-time-connection-problems)
5. [Performance Issues](#performance-issues)
6. [Deployment Problems](#deployment-problems)
7. [Security Concerns](#security-concerns)
8. [Browser Compatibility](#browser-compatibility)

## Installation Issues

### Backend Installation Problems

#### Node.js Version Issues
**Problem:** Application fails to start with version errors.

**Symptoms:**
```
Error: Node.js version 14.x is not supported. Please use Node.js 16 or higher.
```

**Solutions:**
1. Check current Node.js version:
   ```bash
   node --version
   ```

2. Install Node.js 16+ using Node Version Manager (nvm):
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

   # Restart terminal or source nvm
   source ~/.bashrc

   # Install Node.js 18 (LTS)
   nvm install 18
   nvm use 18
   nvm alias default 18
   ```

3. Verify installation:
   ```bash
   node --version  # Should show v18.x.x
   npm --version   # Should show 8.x.x or higher
   ```

#### npm/yarn Installation Failures
**Problem:** Dependencies fail to install.

**Symptoms:**
```
npm ERR! code ENOTFOUND
npm ERR! errno ENOTFOUND
```

**Solutions:**
1. Clear npm cache:
   ```bash
   npm cache clean --force
   ```

2. Delete node_modules and package-lock.json:
   ```bash
   rm -rf node_modules package-lock.json
   ```

3. Reinstall dependencies:
   ```bash
   npm install
   ```

4. If using yarn:
   ```bash
   yarn cache clean
   yarn install
   ```

#### Permission Errors
**Problem:** Installation fails due to permission issues.

**Solutions:**
1. Avoid using `sudo` with npm. Instead, fix npm permissions:
   ```bash
   # Option 1: Change npm's default directory
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH

   # Option 2: Use a Node version manager like nvm
   ```

2. If you must use sudo, fix ownership:
   ```bash
   sudo chown -R $(whoami) ~/.npm
   sudo chown -R $(whoami) /usr/local/lib/node_modules
   ```

### Frontend Installation Problems

#### Vite Build Issues
**Problem:** Frontend build fails.

**Symptoms:**
```
error: Cannot resolve dependency
```

**Solutions:**
1. Clear Vite cache:
   ```bash
   rm -rf node_modules/.vite
   ```

2. Reinstall dependencies:
   ```bash
   npm install
   ```

3. Check for peer dependency issues:
   ```bash
   npm ls --depth=0
   ```

#### React Version Conflicts
**Problem:** React version mismatches.

**Solutions:**
1. Ensure consistent React versions across all packages
2. Update package.json to use compatible versions:
   ```json
   {
     "dependencies": {
       "react": "^18.2.0",
       "react-dom": "^18.2.0"
     }
   }
   ```

## Database Problems

### SQLite Connection Issues

#### Database File Not Found
**Problem:** Application can't find the database file.

**Symptoms:**
```
SQLITE_CANTOPEN: unable to open database file
```

**Solutions:**
1. Check if database directory exists:
   ```bash
   ls -la database/
   ```

2. Create database directory if missing:
   ```bash
   mkdir -p database
   ```

3. Run database migration:
   ```bash
   npm run migrate
   ```

4. Check file permissions:
   ```bash
   chmod 755 database/
   chmod 644 database/hackarena.db
   ```

#### Database Corruption
**Problem:** Database file is corrupted.

**Symptoms:**
```
SQLITE_CORRUPT: database disk image is malformed
```

**Solutions:**
1. Backup current database (if possible):
   ```bash
   cp database/hackarena.db database/hackarena.db.backup
   ```

2. Delete corrupted database:
   ```bash
   rm database/hackarena.db
   ```

3. Reinitialize database:
   ```bash
   npm run migrate
   ```

4. Restore data from backup if available

### Migration Failures

#### Migration Script Errors
**Problem:** Database migrations fail to run.

**Solutions:**
1. Check migration file syntax
2. Ensure database is not locked by another process
3. Run migrations individually:
   ```bash
   node src/database/migrate.js
   ```

4. Check migration logs for specific errors

## Authentication Issues

### Google OAuth Problems

#### Invalid Client Configuration
**Problem:** Google authentication fails.

**Symptoms:**
```
Google authentication failed
```

**Solutions:**
1. Verify Google OAuth credentials in `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id
   GOOGLE_CLIENT_SECRET=your-actual-client-secret
   ```

2. Check Google Cloud Console:
   - Ensure OAuth 2.0 Client ID is correct
   - Verify authorized redirect URIs include your domain
   - Confirm Google+ API is enabled

3. Test OAuth flow:
   - Clear browser cache and cookies
   - Try incognito/private browsing mode
   - Check browser console for JavaScript errors

#### Token Verification Errors
**Problem:** Google ID tokens are rejected.

**Solutions:**
1. Ensure system clock is synchronized:
   ```bash
   sudo ntpdate pool.ntp.org
   ```

2. Check token expiration (tokens expire after 1 hour)
3. Verify audience matches your client ID

### JWT Token Issues

#### Token Expiration
**Problem:** Users are unexpectedly logged out.

**Solutions:**
1. Check JWT expiration time in code (currently 24 hours)
2. Implement token refresh mechanism
3. Clear localStorage and re-login

#### Invalid Token Format
**Problem:** JWT tokens are malformed.

**Solutions:**
1. Check JWT_SECRET environment variable
2. Ensure secret is at least 32 characters long
3. Regenerate tokens after changing secret

## Real-time Connection Problems

### Socket.IO Connection Issues

#### Connection Refused
**Problem:** WebSocket connections fail.

**Symptoms:**
```
WebSocket connection failed
```

**Solutions:**
1. Check if backend server is running:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. Verify Socket.IO configuration:
   - Check CORS settings match frontend URL
   - Ensure correct port (default: 3001)
   - Verify firewall allows WebSocket connections

3. Check browser network tab for connection attempts

#### Connection Drops
**Problem:** WebSocket connections disconnect frequently.

**Solutions:**
1. Implement reconnection logic in frontend
2. Check server resource usage (memory, CPU)
3. Verify network stability
4. Adjust Socket.IO ping/pong settings

### Room Joining Problems

#### Game Room Access Denied
**Problem:** Participants can't join game rooms.

**Solutions:**
1. Verify game code is correct
2. Check if game exists and is active
3. Ensure participant limit hasn't been reached
4. Check database for participant records

## Performance Issues

### High Memory Usage

#### Memory Leaks
**Problem:** Application memory usage grows over time.

**Solutions:**
1. Monitor memory usage:
   ```bash
   pm2 monit
   htop
   ```

2. Check for memory leaks:
   ```bash
   npm install -g clinic
   clinic doctor -- node src/server.js
   ```

3. Implement garbage collection monitoring
4. Restart application periodically

### Slow Response Times

#### Database Query Performance
**Problem:** API responses are slow.

**Solutions:**
1. Check slow queries:
   ```sql
   .timer on
   EXPLAIN QUERY PLAN SELECT * FROM participants WHERE game_id = ?;
   ```

2. Add database indexes:
   ```sql
   CREATE INDEX idx_participants_game_id ON participants(game_id);
   CREATE INDEX idx_answers_question_id ON answers(question_id);
   ```

3. Optimize query patterns
4. Consider database connection pooling

#### High CPU Usage
**Problem:** Server CPU usage is high.

**Solutions:**
1. Profile application performance:
   ```bash
   npm install -g 0x
   0x src/server.js
   ```

2. Check for infinite loops or recursive functions
3. Optimize cryptographic operations (bcrypt)
4. Consider load balancing for high traffic

## Deployment Problems

### PM2 Issues

#### Process Not Starting
**Problem:** PM2 fails to start the application.

**Solutions:**
1. Check PM2 logs:
   ```bash
   pm2 logs hackarena-backend
   ```

2. Verify ecosystem file syntax:
   ```bash
   pm2 describe hackarena-backend
   ```

3. Check file permissions and paths
4. Ensure all dependencies are installed

#### Process Crashing
**Problem:** Application crashes after starting.

**Solutions:**
1. Check application logs for error details
2. Verify environment variables are set
3. Check database connectivity
4. Monitor system resources

### Nginx Configuration Issues

#### 502 Bad Gateway
**Problem:** Nginx can't connect to backend.

**Solutions:**
1. Check if backend is running:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. Verify Nginx configuration:
   ```bash
   sudo nginx -t
   ```

3. Check upstream server configuration
4. Verify socket permissions

#### SSL Certificate Problems
**Problem:** HTTPS connections fail.

**Solutions:**
1. Check certificate validity:
   ```bash
   openssl x509 -in /etc/ssl/certs/cert.pem -text -noout
   ```

2. Renew Let's Encrypt certificate:
   ```bash
   sudo certbot renew
   ```

3. Check certificate chain and private key match

## Security Concerns

### Exposed Sensitive Data

#### Environment Variables Leaked
**Problem:** Sensitive data exposed in logs or responses.

**Solutions:**
1. Never log sensitive environment variables
2. Use proper logging levels (avoid DEBUG in production)
3. Sanitize error responses to remove sensitive data

#### Database Exposed
**Problem:** Database files accessible via web.

**Solutions:**
1. Ensure database files are outside web root
2. Use proper file permissions:
   ```bash
   chmod 600 database/hackarena.db
   ```

3. Implement database access controls

### Authentication Bypass

#### Weak Passwords
**Problem:** Accounts compromised due to weak passwords.

**Solutions:**
1. Enforce strong password requirements
2. Implement password complexity rules
3. Add account lockout after failed attempts

#### Session Management
**Problem:** Sessions not properly invalidated.

**Solutions:**
1. Implement proper logout functionality
2. Set appropriate session timeouts
3. Clear cookies on logout

## Browser Compatibility

### WebSocket Support Issues

#### Older Browser Support
**Problem:** Real-time features don't work in older browsers.

**Solutions:**
1. Implement Socket.IO fallback transports
2. Add browser compatibility checks
3. Provide fallback for non-WebSocket browsers

### CORS Issues

#### Cross-Origin Request Blocked
**Problem:** Frontend can't connect to backend.

**Solutions:**
1. Configure CORS properly in backend:
   ```javascript
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```

2. Check if frontend URL is correctly set in environment variables
3. Verify HTTPS configuration for secure contexts

### Mobile Browser Issues

#### Touch Event Problems
**Problem:** Touch interactions don't work properly.

**Solutions:**
1. Implement proper touch event handlers
2. Add viewport meta tag:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

3. Test on various mobile devices and browsers

## Common Error Messages

### Backend Errors

#### "Port already in use"
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port in .env
PORT=3002
```

#### "Module not found"
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### "Database locked"
```bash
# Check for other processes accessing database
lsof database/hackarena.db

# Ensure proper file permissions
chmod 644 database/hackarena.db
```

### Frontend Errors

#### "Failed to fetch"
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Verify API base URL in environment
cat .env
```

#### "Component not found"
```bash
# Check import paths
# Ensure file extensions in imports
import Component from './Component.jsx'
```

#### "SyntaxError: Unexpected token"
```bash
# Check for JavaScript syntax errors
# Verify Babel configuration
# Clear Vite cache
```

## Monitoring and Debugging

### Application Logs

#### PM2 Logging
```bash
# View logs
pm2 logs hackarena-backend

# Monitor in real-time
pm2 logs hackarena-backend --lines 100

# Clear logs
pm2 flush
```

#### Custom Logging
```javascript
// Add debug logging
console.log('Debug info:', variable);
console.error('Error details:', error);
```

### System Monitoring

#### Resource Usage
```bash
# CPU and memory usage
top
htop

# Disk usage
df -h

# Network connections
netstat -tlnp
```

#### Database Monitoring
```bash
# SQLite statistics
sqlite3 database/hackarena.db ".stats on"
.schema

# Query performance
sqlite3 database/hackarena.db ".timer on"
EXPLAIN QUERY PLAN SELECT * FROM participants;
```

## Getting Help

### Support Resources

1. **Documentation**
   - Check README files for both backend and frontend
   - Review API documentation
   - Consult deployment guide

2. **Community Support**
   - Check GitHub issues for similar problems
   - Create new issue with detailed information

3. **Debug Information**
   When reporting issues, include:
   - Operating system and version
   - Node.js version
   - Browser and version (for frontend issues)
   - Complete error messages and stack traces
   - Steps to reproduce the problem
   - Relevant configuration files (without sensitive data)

### Emergency Procedures

#### Application Down
1. Check server status: `pm2 status`
2. Restart application: `pm2 restart hackarena-backend`
3. Check logs for errors
4. Verify database connectivity
5. Check system resources

#### Data Loss
1. Stop the application immediately
2. Check database integrity
3. Restore from backup if available
4. Investigate cause of data loss
5. Implement preventive measures

## Prevention Best Practices

### Regular Maintenance
- Update dependencies monthly
- Monitor system resources daily
- Review logs weekly
- Backup database regularly

### Security Updates
- Apply security patches promptly
- Rotate API keys and secrets regularly
- Monitor for security vulnerabilities
- Implement intrusion detection

### Performance Monitoring
- Set up alerts for high resource usage
- Monitor response times and error rates
- Implement log aggregation
- Regular performance testing
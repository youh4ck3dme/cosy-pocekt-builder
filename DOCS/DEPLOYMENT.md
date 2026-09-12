# Deployment Guide

## Quick Start

The fastest way to deploy Cosy Pocket Builder is to **Vercel** with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FENZO7700%2Fcozy-ai-studio&env=DATABASE_URL,GROK_AUTH_ISSUER,GROK_AUTH_CLIENT_ID,GROK_AUTH_CLIENT_SECRET,BETTER_AUTH_SECRET,XAI_API_KEY&envDescription=Database%20connection%20string%20from%20Neon%2FSupabase%20%2B%20Grok%20Auth%20credentials%20%2B%20xAI%20API%20key&envLink=https%3A%2F%2Fgithub.com%2FENZO7700%2Fcozy-ai-studio%2Fblob%2Fmain%2FREADME.md%23deploy)

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the primary deployment target with built-in support.

#### Prerequisites
1. A [Vercel account](https://vercel.com/signup)
2. A PostgreSQL database (Neon, Supabase, etc.)
3. Grok Auth credentials (optional, for authentication)
4. xAI API key (optional, for AI generation)

#### Steps

1. **Import the Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import the repository

2. **Configure Environment Variables**:
   - In your project settings, go to "Environment Variables"
   - Add all required variables (see [ENVIRONMENT.md](./ENVIRONMENT.md))

3. **Configure Database**:
   - Set `DATABASE_URL` to your PostgreSQL connection string
   - Example: `postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/cozy?sslmode=require`

4. **Configure Authentication** (Optional):
   - Set `VITE_AUTH_ENABLED=true`
   - Add `GROK_AUTH_ISSUER`, `GROK_AUTH_CLIENT_ID`, `GROK_AUTH_CLIENT_SECRET`
   - Generate `BETTER_AUTH_SECRET` (32-byte hex)

5. **Configure AI Generation** (Optional):
   - Add `XAI_API_KEY` for Grok AI
   - Add `GENERATE_ACCESS_TOKEN` for rate limiting

6. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy

7. **Access**:
   - Your app will be available at the provided URL

#### Vercel Configuration

Create a `vercel.json` file for custom configuration:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {"distDir": "dist"}
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/",
      "status": 200
    }
  ]
}
```

### Option 2: Netlify

1. **Import the Repository**:
   - Go to [Netlify Dashboard](https://app.netlify.com/)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider

2. **Configure Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `22`

3. **Add Environment Variables**:
   - In "Site settings" → "Environment variables"
   - Add all required variables

4. **Deploy**:
   - Netlify will automatically deploy

**Note**: Netlify doesn't support server-side rendering out of the box. For full functionality, you may need to use Netlify Functions or deploy to a Node.js-compatible environment.

### Option 3: Cloudflare Pages

1. **Create a New Project**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Create a new Pages project
   - Connect your Git repository

2. **Configure Build**:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node.js version: `22`

3. **Add Environment Variables**:
   - In "Settings" → "Environment variables"
   - Add all required variables

4. **Deploy**:
   - Cloudflare will automatically deploy

**Note**: Similar to Netlify, Cloudflare Pages has limitations with server-side code. For full functionality, consider using Cloudflare Workers.

### Option 4: Self-Hosting (Node.js)

For self-hosting on any Node.js-compatible environment:

#### Prerequisites
- Node.js v22 or higher
- npm or yarn
- PostgreSQL database
- (Optional) PM2 or similar process manager

#### Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/ENZO7700/cozy-ai-studio.git
   cd cozy-ai-studio
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Create .env.local**:
   ```bash
   cp .env.example .env.local
   # Edit with your configuration
   ```

4. **Run Database Migrations**:
   ```bash
   npm run db:migrate
   ```

5. **Build the App**:
   ```bash
   npm run build
   ```

6. **Start the Server**:
   ```bash
   npm run preview
   ```
   Or with PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name "cosy-builder" -- run preview
   pm2 save
   pm2 startup
   ```

7. **Access**:
   - Open `http://localhost:8080`

#### Production Server Setup

For a production-ready server, use:

```bash
# Build
npm run build

# Start with PM2 (auto-restart on crash)
pm install -g pm2
pm2 start npm --name "cosy-builder" -- run preview
pm2 save
pm2 startup

# Enable HTTPS with Nginx/Apache
# Configure reverse proxy to localhost:8080
```

### Option 5: Docker

For Docker-based deployment:

#### Dockerfile

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --production

# Copy source files
COPY . .

# Build
RUN npm run build

# Expose port
EXPOSE 8080

# Start
CMD ["npm", "run", "preview"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - GROK_AUTH_ISSUER=${GROK_AUTH_ISSUER}
      - GROK_AUTH_CLIENT_ID=${GROK_AUTH_CLIENT_ID}
      - GROK_AUTH_CLIENT_SECRET=${GROK_AUTH_CLIENT_SECRET}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - XAI_API_KEY=${XAI_API_KEY}
    restart: unless-stopped
```

#### Run with Docker

```bash
# Build and start
docker-compose up -d --build

# Stop
docker-compose down
```

## Post-Deployment Checklist

After deploying, verify the following:

### 1. Health Check
- [ ] Visit the deployed URL
- [ ] Verify the app loads without errors
- [ ] Check browser console for errors

### 2. Functionality Tests
- [ ] **Dashboard**: Loads correctly
- [ ] **Studio**: Can write and submit a brief
- [ ] **Generation**: AI generation works (if configured)
- [ ] **Preview**: Live preview displays correctly
- [ ] **Launch**: Export tools work
- [ ] **Settings**: Configuration page loads

### 3. Authentication Tests (if enabled)
- [ ] **Sign In**: Can sign in via OAuth
- [ ] **Sign Out**: Can sign out
- [ ] **Session**: Session persists across refreshes
- [ ] **Protected Routes**: Routes requiring auth are protected

### 4. Production Readiness
- [ ] **HTTPS**: Site is served over HTTPS
- [ ] **Security Headers**: Check with [SecurityHeaders.com](https://securityheaders.com)
- [ ] **Performance**: Check with [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)
- [ ] **Mobile**: Test on mobile devices

## Troubleshooting

### Build Fails

**Error**: `Port 8080 is already in use`
**Solution**: Kill the existing process or change the port

**Error**: `DATABASE_URL not set`
**Solution**: Set the `DATABASE_URL` environment variable

**Error**: `createRequire is not a function`
**Solution**: Check client-server boundary. Never import server-only modules in client code.

### Deployment Fails

**Error**: `Failed to load module script`
**Solution**: Ensure the build completed successfully. Check the build logs.

**Error**: `500 Internal Server Error`
**Solution**: Check server logs. Verify database connection and environment variables.

**Error**: `403 Forbidden`
**Solution**: Check CORS settings and origin validation.

### Common Issues

1. **Missing Environment Variables**:
   - Verify all required variables are set
   - Check for typos in variable names
   - Restart the server after changing variables

2. **Database Connection Issues**:
   - Verify the connection string is correct
   - Check SSL mode (use `sslmode=require` for most cloud databases)
   - Test the connection locally first

3. **Authentication Issues**:
   - Verify OAuth client ID and secret are correct
   - Check the redirect URIs are configured correctly
   - Ensure the issuer URL is accessible

4. **Rate Limiting**:
   - If you see "Rate limit exceeded", increase the limits or wait
   - Verify `GENERATE_RATE_LIMIT_MIN` and `GENERATE_RATE_LIMIT_DAY`

## Performance Optimization

### Bundle Size
- Monitor bundle size with `npm run analyze`
- Target: < 200KB gzipped for main bundle
- Current: ~189KB gzipped

### Database
- Use connection pooling (Better Auth + pg handle this)
- Enable SSL for cloud databases
- Consider read replicas for high traffic

### Caching
- Service worker caches assets automatically
- CDN caching for static assets (Vercel handles this)
- Response caching for API endpoints (optional)

### Monitoring
- **Vercel**: Built-in analytics and monitoring
- **Sentry**: For error tracking (integrate with `@sentry/node`)
- **Logging**: Structured logging with `console.log` or a logging service

## Scaling

### Horizontal Scaling
- Vercel: Automatic
- Self-hosted: Use PM2 cluster mode or multiple instances behind a load balancer

### Database Scaling
- Use a managed PostgreSQL service with auto-scaling
- Consider read replicas for read-heavy workloads
- Connection pooling is built-in (pg + Better Auth)

### AI Generation Scaling
- Rate limiting prevents abuse
- Consider a queue system (Bull, RabbitMQ) for high volume
- Cache frequent requests (optional)

## Domain & SSL

### Custom Domain

1. **Vercel**:
   - Go to project settings → Domains
   - Add your custom domain
   - Follow the DNS verification steps

2. **Other Hosts**:
   - Point DNS to your hosting provider
   - Configure SSL certificates

### SSL Certificates
- Vercel: Automatic Let's Encrypt certificates
- Self-hosted: Use Let's Encrypt with Certbot or your hosting provider's SSL

## Backups

### Database Backups
- **Neon**: Automatic backups included
- **Supabase**: Manual or scheduled backups
- **Self-hosted**: Use `pg_dump` for PostgreSQL backups

```bash
# PostgreSQL backup
pg_dump -U username -h hostname -p port dbname > backup.sql

# PostgreSQL restore
psql -U username -h hostname -p port dbname < backup.sql
```

### Code Backups
- All code is in Git
- Ensure regular commits and pushes
- Consider GitHub/GitLab backup solutions

## Monitoring & Analytics

### Built-in Monitoring
- Vercel: Built-in analytics, performance monitoring
- Better Auth: Built-in security logging

### External Monitoring (Optional)

1. **Sentry** (Error Tracking):
   ```bash
   npm install @sentry/node @sentry/integrations
   ```

2. **Google Analytics**:
   - Add to Launch page SEO settings
   - Or add directly to HTML templates

3. **Custom Metrics**:
   - Track generation requests
   - Track user sign-ups
   - Track active projects

## Updates

### Updating Dependencies

```bash
# Update all dependencies
npm update

# Update specific package
npm install package@latest

# Check for outdated packages
npm outdated

# Audit for vulnerabilities
npm audit
```

### Updating the App

1. **Pull Latest Changes**:
   ```bash
   git pull origin main
   ```

2. **Install New Dependencies**:
   ```bash
   npm install
   ```

3. **Run Migrations**:
   ```bash
   npm run db:migrate
   ```

4. **Rebuild and Restart**:
   ```bash
   npm run build
   npm run preview:restart
   ```

## Rollback

### Vercel Rollback
1. Go to project dashboard
2. Go to "Deployments"
3. Find the deployment you want to roll back to
4. Click "Redeploy"

### Self-hosted Rollback
1. Revert to the previous commit:
   ```bash
   git revert HEAD
   ```
2. Rebuild and restart:
   ```bash
   npm run build
   pm2 restart cosy-builder
   ```

## Support

For issues or questions:

1. **Check the Documentation**: This guide and other files in `DOCS/`
2. **Check the README**: [README.md](../README.md)
3. **Check Environment Variables**: [ENVIRONMENT.md](./ENVIRONMENT.md)
4. **Check Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
5. **Open an Issue**: On GitHub repository

## Additional Resources

- [TanStack Start Documentation](https://tanstack.com/start)
- [Better Auth Documentation](https://better-auth.com)
- [Vercel Documentation](https://vercel.com/docs)
- [xAI API Documentation](https://console.x.ai/docs)
- [Neon PostgreSQL](https://neon.tech/docs)
- [Supabase](https://supabase.com/docs)

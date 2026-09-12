# Environment Configuration

## Overview

Cosy Pocket Builder uses environment variables for production configuration. The deployer (Vercel) automatically injects these variables when deploying. For local development, create a `.env.local` file in the project root.

## Required Variables

### Database

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes (deployed) | None | `postgresql://user:password@localhost:5432/db` |

### Authentication

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `VITE_AUTH_ENABLED` | Enable authentication | No | `false` | `true` |
| `GROK_AUTH_ISSUER` | Grok Auth Broker URL | Yes (if auth enabled) | `https://auth.grok.me` | `https://auth.grok.me` |
| `GROK_AUTH_CLIENT_ID` | OAuth client ID | Yes (if auth enabled) | Preview client | `your-client-id` |
| `GROK_AUTH_CLIENT_SECRET` | OAuth client secret | Yes (if auth enabled) | Preview secret | `your-client-secret` |
| `BETTER_AUTH_SECRET` | Session signing secret | Yes (if auth enabled) | Auto-generated | `random-hex-string` |
| `BETTER_AUTH_URL` | Better Auth base URL | No | Auto-detected | `https://your-app.vercel.app` |

### AI Generation

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `XAI_API_KEY` | xAI API key for Grok | No | None | `your-xai-api-key` |
| `GENERATE_ACCESS_TOKEN` | Access token for generation | No | None | `your-access-token` |

## Optional Variables

### Rate Limiting

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `GENERATE_RATE_LIMIT_MIN` | Requests per minute per IP | `10` | `20` |
| `GENERATE_RATE_LIMIT_DAY` | Requests per day per IP | `100` | `200` |

### Security

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SESSION_TOKEN_COOKIE` | Session cookie name | `__Host-grok-auth.session_token` | Custom name |

## Local Development

### .env.local Example

```bash
# Database (optional for local dev - uses PGLite if not set)
DATABASE_URL=postgresql://user:password@localhost:5432/cozy

# Authentication (optional - uses preview client if not set)
VITE_AUTH_ENABLED=true
GROK_AUTH_ISSUER=https://auth.grok.me
GROK_AUTH_CLIENT_ID=your-client-id
GROK_AUTH_CLIENT_SECRET=your-client-secret
BETTER_AUTH_SECRET=your-random-secret-hex-string
BETTER_AUTH_URL=http://localhost:8080

# AI Generation
XAI_API_KEY=your-xai-api-key
GENERATE_ACCESS_TOKEN=your-access-token

# Rate Limiting (optional)
GENERATE_RATE_LIMIT_MIN=20
GENERATE_RATE_LIMIT_DAY=200
```

### Generating Secrets

```bash
# Generate BETTER_AUTH_SECRET (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate XAI_API_KEY
# Get from https://console.x.ai
```

## Production Configuration

### Vercel Environment Variables

Set these in your Vercel project settings:

1. **Database**:
   - Name: `DATABASE_URL`
   - Value: Your PostgreSQL connection string from a provider like:
     - Neon (recommended)
     - Supabase
     - AWS RDS
     - Google Cloud SQL

2. **Authentication**:
   - Name: `VITE_AUTH_ENABLED`
   - Value: `true`
   
   - Name: `GROK_AUTH_ISSUER`
   - Value: `https://auth.grok.me`
   
   - Name: `GROK_AUTH_CLIENT_ID`
   - Value: Your client ID from Grok
   
   - Name: `GROK_AUTH_CLIENT_SECRET`
   - Value: Your client secret from Grok
   
   - Name: `BETTER_AUTH_SECRET`
   - Value: A random 32-byte hex string

3. **AI Generation**:
   - Name: `XAI_API_KEY`
   - Value: Your xAI API key

### Database Setup

#### PostgreSQL Schema

The app uses the following databases:

1. **Better Auth Schema** - For authentication tables
2. **App Data Schema** - For user data (projects, etc.)

Run migrations automatically:
```bash
npm run db:migrate
```

Or manually apply the SQL files in the `migrations/` directory.

#### Recommended Database Providers

1. **Neon** (Serverless Postgres)
   - Free tier available
   - Auto-scaling
   - Connection pooling built-in

2. **Supabase**
   - Free tier available
   - Includes auth (but we use Better Auth)
   - Good for full-stack apps

3. **AWS RDS**
   - Managed service
   - High availability
   - Scalable

## Preview Mode (Development)

When running locally without environment variables:

- **Database**: PGLite (embedded SQLite)
- **Authentication**: Preview client (shared credentials)
- **AI Generation**: Local templates (offline fallback)
- **Features**: All features available except federated sign-in

## Authentication Modes

### Mode 1: Production (Deployed)
```
VITE_AUTH_ENABLED=true
DATABASE_URL=postgresql://...
GROK_AUTH_CLIENT_ID=your-id
GROK_AUTH_CLIENT_SECRET=your-secret
BETTER_AUTH_SECRET=random-hex
```

- Full authentication
- PostgreSQL persistence
- Federated sign-in
- Session management

### Mode 2: Preview (Sandbox)
```
# No variables set
```

- PGLite database
- Preview OAuth client
- Works in Grok sandbox
- No federated sign-in (uses preview client)

### Mode 3: Auth Disabled
```
VITE_AUTH_ENABLED=false
```

- No authentication
- Dev user only
- Client-side only
- Suitable for static sites

## Environment Variable Priority

1. **Explicit environment variables** (highest priority)
2. **Preview fallback** (for sandbox)
3. **Default values** (lowest priority)

Example priority chain for `GROK_AUTH_CLIENT_ID`:
```
process.env.GROK_AUTH_CLIENT_ID
  → PREVIEW_CLIENT_ID (from preview.ts)
  → "grok_preview"
```

## Security Notes

1. **Never commit secrets** to version control
2. **Use `__Host-` prefix** for cookies to prevent domain attacks
3. **Secure flag** is set automatically for cookies
4. **SameSite=Lax** for CSRF protection
5. **Origin validation** prevents CSRF attacks
6. **Rate limiting** prevents abuse

## Verifying Configuration

After setting up environment variables:

1. Restart the dev server:
   ```bash
   npm run dev
   ```

2. Check the auth status:
   - Visit `/settings` to see auth configuration
   - Check `/launch` to see production resources status

3. Test generation:
   - Visit `/studio`
   - Write a brief
   - Click Generate
   - Verify it uses the correct provider (Grok or Local)

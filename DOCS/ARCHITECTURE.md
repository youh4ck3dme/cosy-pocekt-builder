# Cosy Pocket Builder - Architecture

## Overview

Cosy Pocket Builder is a **production-ready** web application for generating and deploying beautiful, functional web applications from natural language prompts. Built on top of **Cozy AI Studio**, it extends the core functionality with:

- **Studio** - AI-powered code generation from prompts
- **Projects** - Workspace management with persistent storage
- **Launch** - Production deployment and export tools
- **Prompts** - Predefined templates and examples
- **Blueprints** - Reusable component patterns
- **Settings** - Configuration and preferences

## Tech Stack

### Core Framework
- **TanStack Start** v1.168.0 - React meta-framework
- **TanStack Router** v1.170.0 - Type-safe routing
- **React** v19.2.0 - UI library
- **TypeScript** v5.7.0 - Type safety

### UI & Styling
- **Tailwind CSS** v4.3.0 - Utility-first CSS
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library
- **Recharts** - Data visualization
- **React Hook Form** + **Zod** - Form validation

### State Management
- **Zustand** v5.0.0 - Global state
- **TanStack Query** v5.101.0 - Server state

### Backend & Data
- **Better Auth** v1.6.30 - Authentication
- **PostgreSQL** via **pg** - Database
- **Kysely** - Type-safe SQL query builder
- **PGLite** - Embedded SQLite for preview
- **JSZip** - ZIP export functionality

### Build & Deployment
- **Vite** v8.2.0 - Build tool
- **Nitro** - Server framework
- **Vercel** - Hosting platform

### Testing
- **Playwright** - E2E testing
- **Node.js** test runner - Unit tests

## Project Structure

```
src/
├── components/
│   ├── app/              # Application shell and views
│   │   ├── AppShell.tsx     # Main layout with navigation
│   │   ├── DashboardView.tsx # Dashboard page
│   │   ├── LaunchView.tsx   # Deployment/export tools
│   │   ├── PromptsView.tsx  # Prompt templates
│   │   └── ...
│   ├── studio/           # Studio components
│   │   ├── CodeViewer.tsx   # Syntax-highlighted code viewer
│   │   ├── StudioShell.tsx  # Studio main component
│   │   ├── LivePreview.tsx  # Live HTML preview
│   │   └── ...
│   └── ui/               # Reusable UI components
│       └── button.tsx
├── lib/
│   ├── ai/               # AI generation
│   │   ├── generate.ts     # Generation logic
│   │   ├── generate-guard.server.ts
│   │   └── ...
│   ├── auth/             # Authentication
│   │   ├── server.ts       # Better Auth configuration
│   │   ├── client.ts       # Client-side auth
│   │   └── ...
│   ├── db/               # Database
│   │   ├── index.ts        # Database connection
│   │   └── ...
│   ├── preview/          # Preview system
│   │   ├── local-templates.ts  # Offline preview templates
│   │   ├── cozy-elements.ts   # Cozy web components
│   │   └── ...
│   ├── pwa/              # Progressive Web App
│   │   ├── offline.ts      # Offline caching
│   │   └── use-online.ts   # Online status hook
│   └── studio/           # Studio utilities
│       ├── syntax.ts      # HTML/CSS/JS tokenizer
│       └── export.ts      # Export utilities
├── routes/
│   ├── __root.tsx        # Root route
│   ├── index.tsx         # Home/Dashboard
│   ├── studio.tsx        # Studio
│   ├── launch.tsx        # Launch/deployment
│   ├── prompts.tsx       # Prompts
│   ├── blueprints.tsx    # Blueprints
│   └── settings.tsx      # Settings
├── stores/
│   ├── studio-store.ts   # Studio state
│   └── workspace-store.ts # Workspace state
├── styles.css           # Global styles
└── router.tsx           # Router configuration

scripts/
├── with-app-env.mjs      # Environment wrapper
├── browser-smoke.mjs    # Browser testing
└── migrate.mjs           # Database migrations

public/
├── sw.js                # Service worker
└── manifest.webmanifest # PWA manifest
```

## Key Features

### 1. AI-Powered Generation
- **Endpoint**: `generatePreview` server function
- **Provider**: Grok AI (xAI) with fallback to local templates
- **Features**:
  - Streaming generation
  - Abort support
  - Rate limiting (10 req/min/IP, 100/day)
  - Offline fallback

### 2. Project Management
- **Storage**: Browser localStorage (workspace)
- **Persistence**: PGLite for preview, PostgreSQL for deployed
- **Features**:
  - Multiple projects per workspace
  - Project switching
  - Delete projects
  - Auto-save

### 3. Code Editor & Viewer
- **Syntax Highlighting**: Custom tokenizer for HTML/CSS/JS
- **Features**:
  - Line numbers
  - Filter by language (All/HTML/CSS/JS)
  - Line wrapping
  - Edit mode
  - Copy/download

### 4. Live Preview
- **Technology**: iframe with `srcDoc`
- **Features**:
  - Instant updates
  - Responsive
  - Cozy web components support

### 5. Launch/Deployment
- **Export Formats**:
  - Single HTML file
  - ZIP archive with README
- **SEO Tools**:
  - Meta tag injection
  - Open Graph support
  - Twitter card support
- **Analytics**:
  - Google Analytics/Ads injection
  - Google tag manager
- **Domain Management**:
  - Connected domains tracking
  - Deploy URL configuration

### 6. Progressive Web App (PWA)
- **Installable**: Yes
- **Offline Support**: Yes (service worker)
- **Offline Preview**: Cached in Cache Storage API
- **Manifest**: `/manifest.webmanifest`

## Data Flow

```
User Input (Brief)
    ↓
Studio Store (setBrief)
    ↓
Generate Button Click
    ↓
generatePreview() - Server Function
    ↓
    ├── Online: Grok AI API
    │       ↓
    │   Response (HTML, CSS, JS)
    │       ↓
    └── Offline: localPreviewHtml()
            ↓
Apply Result to Store
    ↓
Update Preview (LivePreview)
    ↓
Update Code Viewer (CodeViewer)
    ↓
Persist to Workspace (localStorage)
```

## Authentication Flow

The app supports two authentication modes:

### Mode 1: Deployed (Production)
- Environment variables injected by deployer
- Real PostgreSQL database
- Federated sign-in via Grok Auth Broker
- Session persistence

### Mode 2: Preview (Development)
- No environment variables
- PGLite embedded database
- Shared preview client
- Process-stable secrets (survives HMR)

### Mode 3: Auth Disabled (Default)
- `VITE_AUTH_ENABLED=false`
- Dev user only
- No database configured
- Suitable for pure client-side apps

## Environment Variables

See [ENVIRONMENT.md](./ENVIRONMENT.md) for complete environment configuration.

## Security Considerations

1. **Client-Server Boundary**: Strict separation enforced by Vite plugin
2. **No Node APIs in Client**: `node:module`, `pg`, etc. are forbidden
3. **Rate Limiting**: 10 requests/minute/IP, 100/day
4. **Origin Validation**: Strict CORS and origin checks
5. **Session Security**: `__Host-` prefixed cookies, Secure flag
6. **CSRF Protection**: Built-in via Better Auth

## Performance Optimizations

1. **Bundle Size**: Monitored via `bundle-budget.mjs`
2. **Code Splitting**: Automatic via Vite
3. **Lazy Loading**: Route-based
4. **Service Worker**: Caches assets and previews
5. **Preconnect**: For external resources

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome for Android)

## Deployment Targets

- **Primary**: Vercel
- **Alternatives**: Netlify, Cloudflare Pages, GitHub Pages (static export)
- **Self-hosting**: Any Node.js environment with Vite support

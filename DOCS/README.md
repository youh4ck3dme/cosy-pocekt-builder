# Cosy Pocket Builder Documentation

Welcome to the **Cosy Pocket Builder** documentation hub. This folder contains comprehensive guides for developers, contributors, and users.

## 📚 Documentation Overview

| Document | Description | Audience |
|----------|-------------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture, project structure, and data flow | Developers |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment variables and configuration | DevOps, Developers |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deployment guides for various platforms | DevOps, Users |
| [API.md](./API.md) | API documentation for server functions and client-side API | Developers |
| [CHANGELOG.md](./CHANGELOG.md) | Version history and release notes | All |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines and development workflow | Contributors |

## 🚀 Quick Start

### For Users

1. **Deploy to Vercel** (recommended):
   - [One-click deploy](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FENZO7700%2Fcozy-ai-studio)
   - Follow the [Deployment Guide](./DEPLOYMENT.md)

2. **Self-host**:
   - See [Self-Hosting Guide](./DEPLOYMENT.md#option-4-self-hosting-nodejs)

### For Developers

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ENZO7700/cozy-ai-studio.git
   cd cozy-ai-studio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**: `http://localhost:8080`

## 🏗️ Key Concepts

### Core Features

1. **Studio** - AI-powered code generation from natural language prompts
2. **Projects** - Workspace management with persistent storage
3. **Launch** - Production deployment and export tools
4. **Prompts** - Predefined templates and examples
5. **Blueprints** - Reusable component patterns
6. **Settings** - Application configuration

### Architecture

- **Framework**: TanStack Start (React meta-framework)
- **UI**: Tailwind CSS v4 + Radix UI
- **State**: Zustand + TanStack Query
- **Database**: PostgreSQL (production) / PGLite (preview)
- **Auth**: Better Auth with Grok OAuth Broker
- **AI**: Grok (xAI) with offline fallback
- **Deployment**: Vercel (primary)

## 📖 Reading Guide

### New to Cosy Pocket Builder?
1. Start with the [main README](../README.md)
2. Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand how it works
3. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) to deploy

### Want to contribute?
1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
3. Review [API.md](./API.md) for extension points

### Need to deploy?
1. Read [DEPLOYMENT.md](./DEPLOYMENT.md)
2. Configure environment variables from [ENVIRONMENT.md](./ENVIRONMENT.md)
3. Choose your platform

### Troubleshooting?
- Check the [DEPLOYMENT.md#troubleshooting](./DEPLOYMENT.md#troubleshooting) section
- Review [ENVIRONMENT.md](./ENVIRONMENT.md) for configuration issues
- Look at [CHANGELOG.md](./CHANGELOG.md) for known issues

## 🔧 Configuration

### Environment Variables

See [ENVIRONMENT.md](./ENVIRONMENT.md) for complete environment configuration.

**Quick reference for common setups:**

#### Local Development (No Config)
```bash
# Just run - uses PGLite and preview auth
npm run dev
```

#### Local Development (Full Auth)
```bash
# .env.local
VITE_AUTH_ENABLED=true
DATABASE_URL=postgresql://user:password@localhost:5432/cozy
BETTER_AUTH_SECRET=your-32-byte-hex-secret
```

#### Production (Vercel)
```
DATABASE_URL=postgresql://user:password@host:port/db
VITE_AUTH_ENABLED=true
GROK_AUTH_ISSUER=https://auth.grok.me
GROK_AUTH_CLIENT_ID=your-client-id
GROK_AUTH_CLIENT_SECRET=your-client-secret
BETTER_AUTH_SECRET=your-32-byte-hex-secret
XAI_API_KEY=your-xai-api-key
```

## 🛠️ Development

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint code linting |
| `npm run format` | Prettier code formatting |
| `npm run test` | Run unit tests |
| `npm run db:migrate` | Run database migrations |
| `npm run check:client-boundary` | Check client-server boundary |
| `npm run check:bundle` | Check bundle for forbidden modules |
| `npm run check:budget` | Check bundle size budget |

### Testing

1. **Unit Tests**:
   ```bash
   npm test
   ```

2. **Browser Smoke Test**:
   ```bash
   node scripts/browser-smoke.mjs
   ```

3. **E2E Tests** (Playwright):
   ```bash
   npx playwright test
   ```

## 🎯 Best Practices

1. **Follow the Code Style**: See [CONTRIBUTING.md#code-style](./CONTRIBUTING.md#code-style)
2. **Test Your Changes**: All tests must pass
3. **Update Documentation**: Keep docs in sync with code
4. **Use Semantic Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/)
5. **Keep PRs Small**: Single purpose, easy to review

## 📞 Support

- **Documentation**: This folder
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Community**: Join the Cozy community

## 🔗 Links

- [Main README](../README.md)
- [GitHub Repository](https://github.com/ENZO7700/cozy-ai-studio)
- [Live Demo](https://cozy-ai-studio.vercel.app)
- [TanStack Start](https://tanstack.com/start)
- [Better Auth](https://better-auth.com)
- [xAI](https://console.x.ai)

---

**Happy Building!** 🚀

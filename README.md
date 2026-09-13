# Cosy Pocket Builder

> **Generate, Preview, Export** - Build beautiful web apps from natural language prompts

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FENZO7700%2Fcozy-ai-studio&env=DATABASE_URL,GROK_AUTH_ISSUER,GROK_AUTH_CLIENT_ID,GROK_AUTH_CLIENT_SECRET,BETTER_AUTH_SECRET,XAI_API_KEY&envDescription=Database%20connection%20string%20%2B%20Grok%20Auth%20credentials%20%2B%20xAI%20API%20key)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)

**Cosy Pocket Builder** is a powerful, production-ready web application for generating and deploying beautiful, functional web applications from natural language prompts. Built on top of **Cozy AI Studio**, it extends the core functionality with advanced code editing, export tools, and deployment workflows.

## ✨ Features

### 🎯 Core Capabilities

- **AI-Powered Generation** - Transform natural language prompts into working HTML/CSS/JS
- **Live Preview** - Instant, interactive preview of generated code
- **Code Editor** - Syntax-highlighted editor with HTML, CSS, and JS support
- **Project Management** - Save, organize, and switch between multiple projects
- **Offline Support** - Works even without internet (with local templates)

### 🚀 Launch & Deployment

- **Export Options**: Single HTML file or ZIP archive with README
- **SEO Tools**: Meta tag injection (title, description, Open Graph, Twitter cards)
- **Analytics**: Google Analytics/Ads tag injection
- **Domain Management**: Track connected domains
- **Promo Assets**: Generate OG meta snippets and README files

### 💡 Smart Features

- **Syntax Highlighting** - Custom tokenizer for HTML/CSS/JS with 13 token types
- **Language Filters** - View all code, HTML only, CSS only, or JS only
- **Line Numbers & Wrapping** - Professional editor experience
- **Edit Mode** - Edit generated code directly in the browser
- **Persistent Workspace** - Projects saved to localStorage

### 🔐 Authentication (Optional)

- **OAuth Providers**: Google, X (Twitter), GitHub (via Grok Auth Broker)
- **Email/Password**: Built-in support (toggleable)
- **Session Management**: Secure, encrypted sessions
- **Preview Mode**: Works without auth for local development

### 📱 Mobile-First

- **Responsive Design** - Works on all screen sizes
- **Touch-Friendly** - Optimized for mobile and tablet
- **PWA Support** - Installable as a progressive web app
- **Offline Mode** - Continue working without internet

## 🚀 Quick Start

### Repository remotes

Use the remotes below when publishing changes:

| Purpose | Repository | Command |
|---|---|---|
| Development | `ENZO7700/pocket-builder-cosy` | `git push enzo cosy-seed` |
| Production / Vercel | `youh4ck3dme/cosy-pocekt-builder` | `git push youh4ck3dme cosy-seed` |

The `DOCS/` directory is intentionally ignored by Git. Keep local notes and
credentials there only; never commit secrets to a remote repository.

### Try It Now

1. **Deploy to Vercel** (recommended):
   
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FENZO7700%2Fcozy-ai-studio)

2. **Or run locally**:
   ```bash
   git clone https://github.com/ENZO7700/cozy-ai-studio.git
   cd cozy-ai-studio
   npm install
   npm run dev
   ```
   
   Open `http://localhost:8080` in your browser.

### First Steps

1. **Write a Brief** - In the Studio, write a description like:
   ```
   Create a landing page for my photography portfolio with a grid of images
   ```

2. **Generate** - Click the Generate button

3. **Preview** - See your app come to life in the live preview

4. **Export** - Download as HTML or ZIP from the Launch page

## 📁 Project Structure

```
src/
├── components/
│   ├── app/              # App shell, views, navigation
│   ├── studio/           # Studio, code viewer, preview
│   └── ui/               # Reusable UI components
├── lib/
│   ├── ai/               # AI generation logic
│   ├── auth/             # Authentication (Better Auth)
│   ├── db/               # Database (PostgreSQL/PGLite)
│   ├── preview/          # Preview system & templates
│   ├── pwa/              # Progressive Web App
│   └── studio/           # Studio utilities
├── routes/
│   ├── index.tsx         # Dashboard
│   ├── studio.tsx        # AI Studio
│   ├── launch.tsx        # Deployment tools
│   ├── prompts.tsx       # Templates
│   ├── blueprints.tsx    # Patterns
│   └── settings.tsx      # Configuration
├── stores/
│   ├── studio-store.ts   # Studio state
│   └── workspace-store.ts # Workspace state
└── styles.css           # Global styles
```

## 🎨 Design Philosophy

### Aesthetics

- **Paper Theme** - Warm, natural paper background (#12110f)
- **Ink Typography** - Clean, readable text
- **Terracotta Accent** - Warm accent color (#c45c38)
- **Minimalist** - No unnecessary chrome or distractions

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#12110f` | Page background |
| Surface | `#1c1b18` | Card/container background |
| Card | `#24221e` | Card background |
| Foreground | `#f4efe6` | Primary text |
| Muted | `#a39a8c` | Secondary text |
| Subtle | `#6f685c` | Tertiary text |
| Border | `#35322c` | Borders |
| Accent | `#c45c38` | Primary accent |
| Accent FG | `#fff7f0` | Accent text |
| Canvas | `#0c0b0a` | Editor/preview background |

## 🛠️ Configuration

### Environment Variables

Create a `.env.local` file for local development:

```bash
# Database (optional - uses PGLite by default)
DATABASE_URL=postgresql://user:password@localhost:5432/cozy

# Authentication (optional - uses preview client by default)
VITE_AUTH_ENABLED=true
GROK_AUTH_ISSUER=https://auth.grok.me
GROK_AUTH_CLIENT_ID=your-client-id
GROK_AUTH_CLIENT_SECRET=your-client-secret
BETTER_AUTH_SECRET=your-32-byte-hex-secret

# AI Generation (optional - uses local templates by default)
XAI_API_KEY=your-xai-api-key
```

See [DOCS/ENVIRONMENT.md](./DOCS/ENVIRONMENT.md) for complete configuration options.

## 📚 Documentation

Comprehensive documentation is available in the [DOCS](./DOCS/) folder:

- [📖 Architecture](./DOCS/ARCHITECTURE.md) - Technical deep dive
- [⚙️ Environment](./DOCS/ENVIRONMENT.md) - Configuration guide
- [🚀 Deployment](./DOCS/DEPLOYMENT.md) - Deploy to Vercel, Netlify, etc.
- [🔌 API](./DOCS/API.md) - Server functions & client API
- [📜 Changelog](./DOCS/CHANGELOG.md) - Version history
- [🤝 Contributing](./DOCS/CONTRIBUTING.md) - Contribution guidelines

## 🎯 Use Cases

### For Designers
- Rapid prototyping from text descriptions
- Visualize concepts instantly
- Export to share with clients

### For Developers
- Quick HTML/CSS/JS scaffolding
- Code generation from specifications
- Learning tool for front-end development

### For Startups
- Build landing pages in minutes
- Create marketing sites without designers
- Iterate quickly on ideas

### For Educators
- Teach web development concepts
- Generate examples for students
- Visual learning tool

## 🏆 Example Prompts

Try these prompts in the Studio:

### Basic
```
Landing page for a SaaS product
```

### Detailed
```
Create a landing page for my meditation app with:
- Hero section with call-to-action
- Features section with 3 cards
- Testimonials section
- Pricing table with 3 tiers
- Footer with links
Use a calming color palette with blues and whites
```

### Technical
```
Build a todo app with:
- Add todo form
- Todo list
- Complete/incomplete toggle
- Delete button
- Local storage persistence
```

### Creative
```
A digital garden with:
- Plant illustrations
- Navigation between sections
- Dark mode support
- Responsive layout
```

## 🔧 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint code linting |
| `npm run format` | Prettier code formatting |
| `npm run test` | Run all tests |
| `npm run db:migrate` | Run database migrations |

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guide](./DOCS/CONTRIBUTING.md) for:

- Setting up your development environment
- Understanding the codebase
- Submitting changes
- Code style guidelines
- Testing requirements

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [TanStack Start](https://tanstack.com/start)
- Authentication powered by [Better Auth](https://better-auth.com)
- AI generation by [xAI Grok](https://console.x.ai)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Components from [Radix UI](https://www.radix-ui.com)
- Icons from [Lucide](https://lucide.dev)

## 📞 Support

- **Documentation**: [DOCS](./DOCS/) folder
- **Issues**: [GitHub Issues](https://github.com/ENZO7700/cozy-ai-studio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ENZO7700/cozy-ai-studio/discussions)
- **Live Demo**: [https://cozy-ai-studio.vercel.app](https://cozy-ai-studio.vercel.app)

---

**Built with ❤️ and Cozy AI Studio**

*Transform your ideas into beautiful, functional web apps in minutes.*

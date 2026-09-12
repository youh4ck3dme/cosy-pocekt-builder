# Changelog

All notable changes to **Cosy Pocket Builder** will be documented in this file.

## [Unreleased]

### Added
- **Launch Page** (`/launch`) - Complete deployment and export workflow
  - Export as HTML or ZIP archive
  - SEO & Social meta tag injection
  - Google Analytics/Ads tag injection
  - Connected domains management
  - Production resources status monitoring
  - Promo assets generation (OG tags, README)

- **Code Viewer** - Advanced code editor and viewer
  - Syntax highlighting for HTML, CSS, JavaScript
  - Language filters (All/HTML/CSS/JS)
  - Line numbers with gutter
  - Line wrapping toggle
  - Edit mode with live updates
  - Copy to clipboard
  - Download as file

- **Syntax Highlighting Engine** (`src/lib/studio/syntax.ts`)
  - Custom tokenizer for HTML with embedded CSS and JS
  - Support for all HTML5 tags and attributes
  - CSS tokenizer with selector, property, value highlighting
  - JavaScript tokenizer with keyword, string, number highlighting
  - Comment support (single-line, multi-line, HTML comments)

- **Export Utilities** (`src/lib/studio/export.ts`)
  - Clipboard copy with fallback
  - File download with proper MIME types
  - Slug generation from titles

### Changed
- **AppShell** - Added Launch to navigation menu
- **StudioShell** - Integrated CodeViewer component
- **Route Tree** - Added `/launch` route
- **Stores** - Extended workspace store for better project management

### Technical
- **Dependencies**: Added JSZip for ZIP export functionality
- **TypeScript**: Full type safety for all new features
- **Tests**: Added syntax highlighting tests

## [1.0.0] - 2024-XX-XX

### Initial Release

Based on **Cozy AI Studio** with the following core features:

- **Dashboard** - Project overview and navigation
- **Studio** - AI-powered HTML generation
  - Prompt input
  - Generation with Grok AI
  - Live preview
  - Chat history
  - Stop functionality
- **Projects** - Workspace management
  - Multiple projects
  - Project switching
  - Local storage persistence
- **Prompts** - Predefined templates
- **Blueprints** - Reusable patterns
- **Settings** - Configuration

### Architecture
- TanStack Start meta-framework
- React 19 with TypeScript
- Tailwind CSS v4
- Radix UI components
- PGLite for preview database
- Better Auth for authentication
- Vercel deployment

---

## Versioning

This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes and improvements

## Release Process

1. Update version in `package.json`
2. Update this CHANGELOG.md
3. Create Git tag: `git tag vX.Y.Z`
4. Push tag: `git push origin vX.Y.Z`
5. Deploy to Vercel
6. Create GitHub release

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

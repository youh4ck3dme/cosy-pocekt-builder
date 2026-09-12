# Contributing Guide

Thank you for your interest in contributing to **Cosy Pocket Builder**! This document outlines how to contribute effectively.

## Getting Started

### Prerequisites

- Node.js v22 or higher
- npm (comes with Node.js)
- Git
- A code editor (VS Code recommended)

### Setup

1. **Fork the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/cozy-ai-studio.git
   cd cozy-ai-studio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create .env.local** (optional, for local testing):
   ```bash
   cp .env.example .env.local
   # Edit with your local configuration
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open in browser**:
   - Visit `http://localhost:8080`

## Development Workflow

### Branching Strategy

We use a simple branching model:

- **`main`** - Production-ready code
- **`cosy-seed`** - Current development branch
- **Feature branches** - For new features (`feature/xxx`)
- **Bug fix branches** - For bug fixes (`fix/xxx`)
- **Doc branches** - For documentation (`docs/xxx`)

### Creating a Branch

```bash
# For a new feature
git checkout main
git pull origin main
git checkout -b feature/my-feature

# For a bug fix
git checkout main
git pull origin main
git checkout -b fix/bug-description

# For documentation
git checkout main
git pull origin main
git checkout -b docs/update-docs
```

### Making Changes

1. **Create a branch** (as above)
2. **Make your changes**
3. **Test your changes**
4. **Commit your changes**
5. **Push to your fork**
6. **Create a Pull Request**

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation only changes
- `style` - Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- `refactor` - A code change that neither fixes a bug nor adds a feature
- `perf` - A code change that improves performance
- `test` - Adding missing tests
- `chore` - Changes to the build process or auxiliary tools and libraries such as documentation generation
- `revert` - Revert a previous commit
- `WIP` - Work in progress

**Examples**:
```bash
# Good
git commit -m "feat(studio): add code viewer component"
git commit -m "fix(launch): zip export encoding issue"
git commit -m "docs: update README with deployment instructions"
git commit -m "chore: update dependencies"

# Bad (avoid)
git commit -m "added code viewer"
git commit -m "fix bug"
git commit -m "wip"
```

### Testing

All changes must pass the following tests:

1. **TypeScript Check**:
   ```bash
   npm run typecheck
   ```

2. **Build**:
   ```bash
   npm run build
   ```

3. **Unit Tests**:
   ```bash
   npm test
   ```

4. **Browser Smoke Test**:
   ```bash
   node scripts/browser-smoke.mjs
   ```

5. **Manual Testing**:
   - Test in Chrome
   - Test in Firefox
   - Test on mobile (or mobile viewport)

## Code Style

### Formatting

We use **Prettier** for code formatting. Run it before committing:

```bash
npm run format
```

### Linting

We use **ESLint** for code quality. Run it before committing:

```bash
npm run lint
```

### TypeScript

- Use type annotations for all function parameters and return values
- Prefer interfaces over type aliases for object shapes
- Use `unknown` instead of `any`
- Always handle errors gracefully

### React

- Use PascalCase for component names
- Use camelCase for props
- Always define prop types (TypeScript)
- Use functional components with hooks
- Keep components small and focused
- Use meaningful prop names

### CSS (Tailwind)

- Use Tailwind utility classes
- Group related classes together
- Use semantic class names when Tailwind isn't sufficient
- Follow the existing color scheme:
  - `--color-bg`: Background
  - `--color-surface`: Card/container background
  - `--color-card`: Card background
  - `--color-fg`: Foreground text
  - `--color-muted`: Secondary text
  - `--color-subtle`: Tertiary text
  - `--color-border`: Borders
  - `--color-accent`: Primary accent color (terracotta)
  - `--color-accent-fg`: Accent text color

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `my-component.tsx` |
| Folders | kebab-case | `src/components/` |
| Components | PascalCase | `MyComponent` |
| Variables | camelCase | `myVariable` |
| Constants | UPPER_SNAKE_CASE | `MY_CONSTANT` |
| Functions | camelCase | `myFunction` |
| Classes | PascalCase | `MyClass` |
| Interfaces | PascalCase | `MyInterface` |
| Types | PascalCase | `MyType` |

## Pull Request Guidelines

### Before Submitting

- [ ] Code passes all tests
- [ ] Code is formatted (`npm run format`)
- [ ] No linting errors (`npm run lint`)
- [ ] TypeScript compiles without errors
- [ ] Build completes successfully
- [ ] Manual testing completed
- [ ] Documentation updated (if applicable)
- [ ] CHANGELOG updated (if applicable)

### Pull Request Template

```markdown
## Description

[Brief description of what this PR does]

## Related Issues

[Link to any related issues]

## Changes Made

- [ ] New feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring
- [ ] Tests
- [ ] Dependencies

## Testing

- [ ] TypeScript check passes
- [ ] Build succeeds
- [ ] Unit tests pass
- [ ] Browser smoke test passes
- [ ] Manual testing completed

## Screenshots (if applicable)

[Add screenshots if UI changes]

## Notes

[Any additional notes or context]
```

### PR Title Format

```
feat: add code viewer component
fix: zip export encoding issue
docs: update deployment guide
chore: update dependencies
```

## Review Process

1. **Submit PR** to the `cosy-seed` branch (or `main` for production-ready changes)
2. **CI Checks** will run automatically
3. **Code Review** by maintainers
4. **Feedback** - Address any comments
5. **Merge** - Once approved, a maintainer will merge

### Common Review Comments

- "Please add tests for this new functionality"
- "Please update the documentation"
- "Please follow the code style guidelines"
- "Please split this into smaller PRs"
- "Please add a CHANGELOG entry"

## Reporting Issues

### Before Reporting

1. Check the [DOCS](./) folder for existing documentation
2. Search existing issues
3. Test with the latest version

### Issue Template

```markdown
## Description

[Clear and concise description of the issue]

## Steps to Reproduce

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior

[What you expected to happen]

## Actual Behavior

[What actually happened]

## Screenshots

[Add screenshots if applicable]

## Environment

- OS: [e.g. Windows 10, macOS, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]

## Additional Context

[Any other context about the problem]
```

## Code of Conduct

We expect all contributors to follow our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, inclusive, and professional.

## License

By contributing, you agree that your contributions will be licensed under the **MIT License** (same as the project).

## Questions?

If you have any questions about contributing, feel free to:

1. Open a discussion
2. Ask in the issues
3. Contact the maintainers directly

We're happy to help you get started!

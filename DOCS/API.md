# API Documentation

## Overview

Cosy Pocket Builder provides both **client-side API** (React components, hooks, stores) and **server-side API** (server functions, auth endpoints). This document covers both for extension and integration purposes.

## Server Functions

Server functions are the primary way to interact with backend services. They're defined using TanStack Start's `createServerFn`.

### Generate Preview

**Endpoint**: `POST /api/generate/preview`

**Server Function**: `generatePreview`

**Location**: `src/lib/ai/generate.ts`

**Request Body**:
```typescript
{
  prompt: string;      // User's brief/description
  html?: string;      // Existing HTML for revision
  signal?: AbortSignal; // For cancellation
}
```

**Response**:
```typescript
{
  ok: boolean;           // Success status
  title: string;        // Generated title
  html: string;         // Full HTML output
  code: string;         // Formatted code
  provider: string;     // "grok" or "local"
  assistantText?: string; // AI assistant message
  error?: string;       // Error message (if ok: false)
  status?: number;      // HTTP status code
  retryAfter?: number;  // Seconds to wait before retry (rate limit)
  aborted?: boolean;    // Whether request was aborted
}
```

**Usage Example**:
```typescript
import { generatePreview } from "@/lib/ai/generate";

const result = await generatePreview({
  data: { prompt: "Create a landing page for my startup" }
});

if (result.ok) {
  // Use the generated HTML
  console.log(result.html);
}
```

**Rate Limiting**:
- 10 requests/minute/IP
- 100 requests/day/IP
- Can be configured via `GENERATE_RATE_LIMIT_MIN` and `GENERATE_RATE_LIMIT_DAY`

### Get AI Status

**Endpoint**: `GET /api/ai/status`

**Server Function**: `getAiStatus`

**Location**: `src/lib/ai/generate.ts`

**Response**:
```typescript
{
  grok: boolean;     // Whether Grok AI is configured
  locked: boolean;   // Whether access token is set
}
```

**Usage Example**:
```typescript
import { getAiStatus } from "@/lib/ai/generate";

const status = await getAiStatus();
console.log({ grok: status.grok, locked: status.locked });
```

## Authentication API

### Sign In

**Endpoint**: `POST /api/auth/sign-in`

**Method**: OAuth flow via Better Auth

**Providers**:
- Google
- X (Twitter)
- GitHub (if configured)
- Email/Password (if enabled)

**Flow**:
1. Client redirects to `/api/auth/sign-in/[provider]`
2. Better Auth handles OAuth flow
3. On success, redirects back with session cookie

### Sign Out

**Endpoint**: `POST /api/auth/sign-out`

**Method**: Clear session

**Usage**:
```typescript
import { signOut } from "@/lib/auth/client";

await signOut();
```

### Get Session

**Endpoint**: `GET /api/auth/get-session`

**Response**:
```typescript
{
  user: {
    id: string;
    email?: string;
    name?: string;
    image?: string;
    // ... other user fields
  } | null;
  session: {
    id: string;
    expiresAt: Date;
    // ... other session fields
  } | null;
}
```

**Usage**:
```typescript
import { getSession } from "@/lib/auth/client";

const { user, session } = await getSession();
```

## Database API

### Migrations

**Script**: `npm run db:migrate`

**Location**: `scripts/migrate.mjs`

**Process**:
1. Reads SQL files from `migrations/` directory
2. Applies them to the database
3. Tracks applied migrations in `auth_schema_version` table

**Migration Files**:
- `migrations/auth/0001_auth.sql` - Better Auth schema
- `migrations/0001_init.sql` - App data schema
- `migrations/0002_*.sql` - Custom migrations (if any)

## Client-side API

### Stores

#### Studio Store

**Location**: `src/stores/studio-store.ts`

**State**:
```typescript
{
  // Input
  brief: string;
  
  // Generation state
  running: boolean;
  error: string | null;
  
  // Results
  html: string;
  code: string;
  title: string;
  provider: string;
  assistantText: string;
  
  // Messages (chat history)
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    text: string;
  }>;
  
  // Abort control
  abortController: AbortController | null;
}
```

**Actions**:
```typescript
{
  // Input
  setBrief: (brief: string) => void;
  
  // Generation lifecycle
  beginGenerate: () => AbortSignal;
  stopGenerate: () => void;
  finishGenerate: () => void;
  failGenerate: (error: string) => void;
  
  // Results
  applyResult: (result: { title: string; html: string; code: string; provider: string; assistantText?: string }) => void;
  updateCode: (code: string) => void;
  
  // Messages
  pushUser: (text: string) => void;
  pushAssistant: (text: string) => void;
  
  // History
  hydratePreview: (preview: { title: string; html: string; code: string }) => void;
  loadPreview: (preview: { title: string; html: string; code: string }) => void;
  reset: () => void;
}
```

**Usage**:
```typescript
import { useStudioStore } from "@/stores/studio-store";

function MyComponent() {
  const brief = useStudioStore((s) => s.brief);
  const setBrief = useStudioStore((s) => s.setBrief);
  const html = useStudioStore((s) => s.html);
  const running = useStudioStore((s) => s.running);
  
  return (
    <div>
      <textarea value={brief} onChange={(e) => setBrief(e.target.value)} />
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
```

#### Workspace Store

**Location**: `src/stores/workspace-store.ts`

**State**:
```typescript
{
  projects: Array<{
    id: string;
    title: string;
    html: string;
    code: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  currentProjectId: string | null;
}
```

**Actions**:
```typescript
{
  upsertProject: (project: { id?: string; title: string; html: string; code: string }) => void;
  removeProject: (id: string) => void;
  setCurrentProjectId: (id: string | null) => void;
}
```

**Usage**:
```typescript
import { useWorkspaceStore } from "@/stores/workspace-store";

function ProjectList() {
  const projects = useWorkspaceStore((s) => s.projects);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const setCurrentProjectId = useWorkspaceStore((s) => s.setCurrentProjectId);
  
  return (
    <ul>
      {projects.map((project) => (
        <li
          key={project.id}
          onClick={() => setCurrentProjectId(project.id)}
          className={currentProjectId === project.id ? "active" : ""}
        >
          {project.title}
        </li>
      ))}
    </ul>
  );
}
```

### Hooks

#### usePwaInstall

**Location**: `src/hooks/usePwaInstall.ts`

**Returns**:
```typescript
{
  isInstallable: boolean;
  isInstalled: boolean;
  install: () => Promise<void>;
}
```

**Usage**:
```typescript
import { usePwaInstall } from "@/hooks/usePwaInstall";

function InstallBanner() {
  const { isInstallable, isInstalled, install } = usePwaInstall();
  
  if (!isInstallable || isInstalled) return null;
  
  return (
    <button onClick={install}>
      Install App
    </button>
  );
}
```

#### useOnline

**Location**: `src/lib/pwa/use-online.ts`

**Returns**: `boolean` - Whether the browser is online

**Usage**:
```typescript
import { useOnline } from "@/lib/pwa/use-online";

function StatusBar() {
  const online = useOnline();
  
  return (
    <div className={online ? "online" : "offline"}>
      {online ? "Online" : "Offline"}
    </div>
  );
}
```

### Auth Hooks

#### useCurrentUser

**Location**: `src/lib/auth/use-current-user.ts`

**Returns**:
```typescript
{
  user: User | null;
  isPending: boolean;
  error: Error | null;
}
```

**Usage**:
```typescript
import { useCurrentUser } from "@/lib/auth/use-current-user";

function UserProfile() {
  const { user, isPending, error } = useCurrentUser();
  
  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Not signed in</div>;
  
  return (
    <div>
      <p>Hello, {user.name}!</p>
      <p>{user.email}</p>
    </div>
  );
}
```

## Utility Functions

### Syntax Highlighting

**Location**: `src/lib/studio/syntax.ts`

**Functions**:
```typescript
// Tokenize HTML with embedded CSS and JS
function tokenizeHtml(code: string): Token[];

// Convert tokens to lines for rendering
function tokensToLines(tokens: Token[]): CodeLine[];

// Extract CSS from <style> blocks
function extractStyles(html: string): string;

// Extract JS from <script> blocks
function extractScripts(html: string): string;

// Extract HTML markup (without style/script contents)
function extractMarkup(html: string): string;
```

**Types**:
```typescript
type TokenType = 
  | "plain"
  | "comment"
  | "doctype"
  | "tag-bracket"
  | "tag-name"
  | "attr-name"
  | "attr-value"
  | "string"
  | "keyword"
  | "number"
  | "selector"
  | "property"
  | "value"
  | "punctuation";

type Token = {
  type: TokenType;
  text: string;
};

type CodeLine = {
  lineNumber: number;
  tokens: Token[];
};
```

### Export Utilities

**Location**: `src/lib/studio/export.ts`

**Functions**:
```typescript
// Copy text to clipboard
async function copyText(text: string): Promise<boolean>;

// Download HTML file
function downloadHtml(filename: string, html: string): void;

// Generate safe slug from title
function slugFromTitle(title: string): string;
```

### PWA Offline

**Location**: `src/lib/pwa/offline.ts`

**Functions**:
```typescript
// Register service worker
function registerServiceWorker(): void;

// Persist preview to cache
async function persistOfflinePreview(payload: OfflinePreview): Promise<void>;

// Read cached preview
async function readOfflinePreview(): Promise<OfflinePreview | null>;

// Clear cached preview
async function clearOfflinePreview(): Promise<void>;
```

**Types**:
```typescript
type OfflinePreview = {
  title: string;
  code: string;
  html: string;
};
```

### Preview Templates

**Location**: `src/lib/preview/local-templates.ts`

**Function**:
```typescript
// Generate local preview HTML from brief
function localPreviewHtml(brief: string): { title: string; html: string; code: string };
```

**Usage**:
```typescript
import { localPreviewHtml } from "@/lib/preview/local-templates";

const { title, html, code } = localPreviewHtml("Create a landing page");
// Returns a simple, functional HTML page
```

## Routes

### Public Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | DashboardView | Home dashboard |
| `/studio` | StudioShell | AI generation studio |
| `/launch` | LaunchView | Deployment & export tools |
| `/prompts` | PromptsView | Predefined prompts |
| `/blueprints` | BlueprintsView | Reusable blueprints |
| `/settings` | SettingsView | App settings |

### Authentication Routes

| Path | Method | Description |
|------|--------|-------------|
| `/api/auth/sign-in/[provider]` | POST | OAuth sign-in |
| `/api/auth/sign-out` | POST | Sign out |
| `/api/auth/get-session` | GET | Get current session |
| `/api/auth/oauth2/callback/[provider]` | GET | OAuth callback |

### API Routes

| Path | Method | Function | Description |
|------|--------|----------|-------------|
| `/api/generate/preview` | POST | generatePreview | Generate HTML from prompt |
| `/api/ai/status` | GET | getAiStatus | Check AI configuration |

## Components

### Studio Components

#### CodeViewer

**Location**: `src/components/studio/CodeViewer.tsx`

**Props**:
```typescript
{
  code: string;           // HTML code to display
  title: string;          // Document title
  onUpdateCode?: (newCode: string) => void;  // Called when code is edited
}
```

**Features**:
- Syntax highlighting for HTML/CSS/JS
- Language filters (All/HTML/CSS/JS)
- Line numbers
- Line wrapping toggle
- Edit mode
- Copy to clipboard
- Download as file

#### LivePreview

**Location**: `src/components/studio/LivePreview.tsx`

**Props**:
```typescript
{
  html: string;           // HTML to preview
  title: string;          // Document title
}
```

**Features**:
- Renders HTML in an iframe
- Responsive
- Auto-updates when HTML changes

#### GenerateButton

**Location**: `src/components/studio/GenerateButton.tsx`

**Props**:
```typescript
{
  disabled?: boolean;     // Whether button is disabled
  hasHtml?: boolean;      // Whether there's existing HTML
  online?: boolean;       // Whether browser is online
}
```

### App Components

#### AppShell

**Location**: `src/components/app/AppShell.tsx`

**Props**:
```typescript
{
  children: ReactNode;
}
```

**Features**:
- Main layout with sidebar navigation
- Responsive (mobile-friendly)
- Theme support

#### LaunchView

**Location**: `src/components/app/LaunchView.tsx`

**Features**:
- Export tools (HTML, ZIP)
- SEO meta tag injection
- Google Analytics injection
- Domain management
- Production resources status
- Promo assets generation

## Extending the App

### Adding a New Route

1. **Create the route file**:
   ```typescript
   // src/routes/my-new-route.tsx
   import { createFileRoute } from "@tanstack/react-router";
   import { MyComponent } from "@/components/my-component";
   
   export const Route = createFileRoute("/my-new-route")({
     component: MyComponent,
     head: () => ({
       meta: [{ title: "My New Route" }],
     }),
   });
   ```

2. **Add to navigation** (optional):
   ```typescript
   // src/components/app/AppShell.tsx
   const NAV = [
     // ... existing items
     { to: "/my-new-route", label: "My New Route", icon: SomeIcon },
   ];
   ```

3. **Route will be auto-generated** in `routeTree.gen.ts`

### Adding a New Server Function

1. **Create the server function**:
   ```typescript
   // src/lib/api/my-function.server.ts
   import { createServerFn } from "@tanstack/react-start";
   import { z } from "zod";
   
   export const myFunction = createServerFn({ method: "POST" })
     .input(z.object({ name: z.string() }))
     .handler(async ({ data, context }) => {
       // Access database, auth, etc.
       return { success: true, message: `Hello, ${data.name}!` };
     });
   ```

2. **Call from client**:
   ```typescript
   import { myFunction } from "@/lib/api/my-function.server";
   
   const result = await myFunction({ name: "World" });
   ```

### Adding a New Store

1. **Create the store**:
   ```typescript
   // src/stores/my-store.ts
   import { create } from "zustand";
   
   type MyState = {
     count: number;
     increment: () => void;
     decrement: () => void;
   };
   
   export const useMyStore = create<MyState>((set) => ({
     count: 0,
     increment: () => set((state) => ({ count: state.count + 1 })),
     decrement: () => set((state) => ({ count: state.count - 1 })),
   }));
   ```

2. **Use in components**:
   ```typescript
   import { useMyStore } from "@/stores/my-store";
   
   function Counter() {
     const count = useMyStore((s) => s.count);
     const increment = useMyStore((s) => s.increment);
     
     return (
       <div>
         <p>Count: {count}</p>
         <button onClick={increment}>Increment</button>
       </div>
     );
   }
   ```

### Adding Database Tables

1. **Create migration file**:
   ```sql
   -- migrations/0003_my_table.sql
   CREATE TABLE my_table (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   CREATE INDEX idx_my_table_name ON my_table(name);
   ```

2. **Run migration**:
   ```bash
   npm run db:migrate
   ```

3. **Use in code**:
   ```typescript
   import { db } from "@/lib/db";
   
   const result = await db
     .insertInto("my_table")
     .values({ name: "Test" })
     .execute();
   ```

## Error Handling

### Client Errors

```typescript
import { AppErrorComponent } from "@/lib/error-component";

// Used in router.tsx as defaultErrorComponent
// Displays error message to user
```

### Server Errors

```typescript
// In server functions
throw new Error("Something went wrong");
// Returns 500 with error message

// Or with custom status
return {
  ok: false,
  error: "Invalid input",
  status: 400,
};
```

### Auth Errors

```typescript
// In auth middleware
import { auth } from "@/lib/auth/server";

const user = await auth.api.getUser();
if (!user) {
  throw new Error("Unauthorized");
  // Returns 401
}
```

## Best Practices

1. **Client-Server Boundary**: Never import server-only modules in client code
2. **Type Safety**: Use TypeScript types for all functions and components
3. **Error Handling**: Always handle errors gracefully
4. **Loading States**: Show loading indicators for async operations
5. **Accessibility**: Use proper ARIA attributes and semantic HTML
6. **Performance**: Use React.memo, useMemo, useCallback for optimization
7. **Security**: Validate all inputs, sanitize HTML output

## Testing

### Unit Tests

Use Node.js test runner for unit tests:

```typescript
// src/lib/api/my-function.test.ts
import { expect, test } from "node:test";
import { myFunction } from "./my-function";

test("myFunction returns correct result", async () => {
  const result = await myFunction({ name: "Test" });
  expect(result.success).toBe(true);
});
```

Run tests:
```bash
npm test
```

### E2E Tests

Use Playwright for end-to-end testing:

```typescript
// tests/e2e/studio.test.ts
import { test, expect } from "@playwright/test";

test("can generate and preview", async ({ page }) => {
  await page.goto("/studio");
  await page.fill("textarea", "Create a landing page");
  await page.click("button:has-text('Generate')");
  await expect(page.locator("iframe")).toBeVisible();
});
```

Run E2E tests:
```bash
npx playwright test
```

### Browser Tests

Use the built-in browser smoke test:
```bash
node scripts/browser-smoke.mjs
```

This tests:
- Page renders correctly
- No console errors
- Mobile responsiveness

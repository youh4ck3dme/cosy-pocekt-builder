# Mistral API Setup for Cosy Pocket Builder

## Overview

Cosy Pocket Builder now uses **Mistral API as the PRIMARY AI provider** with Grok (xAI) as an optional fallback.

## Environment Variables

### Primary (Required)
```bash
MISTRAL_API_KEY=your_mistral_api_key_here
```

### Optional Fallback
```bash
XAI_API_KEY=your_grok_api_key_here
```

## Provider Priority

1. **Mistral** (Primary) - Uses `mistral-large-latest` model
   - API Endpoint: `https://api.mistral.ai/v1/chat/completions`
   - If Mistral fails, falls back to Grok (if configured)

2. **Grok** (Fallback) - Uses `grok-4.5` model
   - API Endpoint: `https://api.x.ai/v1/chat/completions`
   - Only used if Mistral is not configured or fails

## Deployment

### Vercel
Set environment variables in your Vercel project:
- Go to Project Settings > Environment Variables
- Add `MISTRAL_API_KEY` with your Mistral API key
- Optionally add `XAI_API_KEY` for Grok fallback

### Local Development
Create a `.env.local` file in the project root:
```bash
MISTRAL_API_KEY=your_mistral_api_key_here
XAI_API_KEY=your_grok_api_key_here  # optional
```

## API Status Check

The app automatically checks which API keys are configured:
- ✅ Mistral API Key (Primary) - Required for full functionality
- ✅ XAI API Key (Grok Fallback) - Optional backup
- ✅ Access Token - For rate limiting

## Error Messages

If no API keys are configured:
```
"No AI API key configured. Set MISTRAL_API_KEY (primary) or XAI_API_KEY (Grok fallback)"
```

If Mistral is configured but fails:
- Automatically tries Grok if XAI_API_KEY is set
- Returns Grok error if Grok also fails

## Getting API Keys

### Mistral
1. Sign up at https://mistral.ai/
2. Get your API key from the dashboard
3. Set as `MISTRAL_API_KEY`

### Grok (xAI)
1. Sign up at https://x.ai/
2. Get your API key from the dashboard
3. Set as `XAI_API_KEY` (optional)

## Code Changes Summary

### Modified Files
- `src/lib/ai/generate.ts` - Added Mistral support, fallback logic
- `src/stores/studio-store.ts` - Updated StudioProvider type
- `src/components/app/LaunchView.tsx` - UI for both API statuses
- `src/components/studio/StudioShell.tsx` - Provider label handling

### Types Updated
```typescript
// Before
export type AiProvider = "grok";
export type AiStatus = { grok: boolean; locked: boolean };
export type StudioProvider = "grok" | "local" | null;

// After
export type AiProvider = "mistral" | "grok";
export type AiStatus = { mistral: boolean; grok: boolean; locked: boolean };
export type StudioProvider = "mistral" | "grok" | "local" | null;
```

## Testing

To test the API integration:
1. Set your `MISTRAL_API_KEY` environment variable
2. Run the app: `npm run dev`
3. Navigate to Launch page
4. Check "Production Resources" card - Mistral should show as "Aktívny"
5. Try generating a project - it should use Mistral API

## Production URL

The app is deployed at: https://cosy-pocekt-builder.vercel.app/

## Note

**MISTRAL_API_KEY must be set for the app to work.**
Without it, you'll get a 503 error when trying to generate.
Grok (XAI_API_KEY) is completely optional and only used as a fallback.

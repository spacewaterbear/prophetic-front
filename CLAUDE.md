# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application for "Prophetic Orchestra 7.5", a luxury investment advisor chatbot interface. The project uses the App Router architecture with TypeScript, Tailwind CSS, and shadcn/ui components.

## Development Commands

```bash
# Development server (with Turbopack, accessible on local network)
npm run dev
# or
bun dev

# Build for production
npm run build
# or
bun run build

# Start production server
npm run start
# or
bun start

# Lint (runs TypeScript type checking + ESLint)
npm run lint
# or
bunx tsc --noEmit && next lint

# Format code with Biome
npm run format
# or
bunx biome format --write
```

## Architecture

### Project Structure

- **src/app/** - Next.js App Router pages and layouts
  - `page.tsx` - Main chat interface (client component)
  - `layout.tsx` - Root layout with fonts and same-runtime integration
  - `ClientBody.tsx` - Client-side wrapper to handle hydration issues
  - `globals.css` - Global styles with Tailwind and CSS variables

- **src/components/ui/** - shadcn/ui component library
  - Reusable UI components (Button, Card, etc.)
  - All styled with Tailwind using the `cn()` utility

- **src/lib/** - Utility functions
  - `utils.ts` - Contains `cn()` helper for merging Tailwind classes

### Key Technologies

**same-runtime Integration**: This project integrates with same-runtime (loaded via external script in layout.tsx). The jsxImportSource is configured to use `same-runtime/dist` in tsconfig.json. This is a critical architectural decision that affects JSX compilation.

**Styling System**: Uses a CSS variables-based theming system defined in Tailwind config. Colors are defined as HSL CSS variables (--background, --foreground, --primary, etc.) allowing for easy theme customization.

**Image Configuration**: next.config.js is configured to allow images from:
- source.unsplash.com
- images.unsplash.com
- ext.same-assets.com (used for Prophetic Orchestra logo)
- ugc.same-assets.com

### Component Architecture

The main page (src/app/page.tsx) is a client component that implements:
- Chat interface with message history
- Collapsible sidebar with recent chats
- Mock AI responses (hardcoded for now)
- Example prompts for luxury investment queries

### Hydration Strategy

The ClientBody component exists specifically to handle browser extension interference during SSR hydration. It resets the body className on the client side to prevent hydration mismatches.

## Code Quality Tools

- **TypeScript**: Strict mode enabled
- **ESLint**: Using Next.js config with custom overrides
- **Biome**: Used for formatting with space indentation and double quotes
  - A11y rules are mostly disabled in biome.json
  - noUnusedVariables is disabled

## Path Aliases

TypeScript is configured with `@/*` alias pointing to `./src/*`:
```typescript
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
```

## shadcn/ui Configuration

Components use the "new-york" style variant with:
- Base color: zinc
- CSS variables enabled
- Lucide icons
- RSC (React Server Components) compatible

When adding new shadcn components, they should be placed in `src/components/ui/` and use the existing style configuration.
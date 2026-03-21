# Agent Guidelines for BeaconScope

Real-time beacon monitoring and incident response console with global receiver network.

**Tech Stack:** React 19, Vite 6, Tailwind CSS 4, TypeScript ~5.8, Express, WebSockets, better-sqlite3

---

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development (backend + frontend via tsx server.ts)
npm run build        # Production build (Vite build for frontend)
npm run preview      # Preview production build
npm run clean        # Clean build artifacts
npm run lint         # TypeScript type checking (tsc --noEmit)
```

**Environment Variables:**
- `RUNTIME_MODE` - `dev`, `demo`, `live`, or `mixed` (default: `dev`)
- `SIMULATOR_ENABLED` - Enable/disable simulator (default: true in dev/demo)
- `LOG_LEVEL` - `debug`, `info`, `warn`, `error`
- `PORT` - Server port (default: 3000)
- `DISABLE_HMR` - Disable Vite hot module replacement
- `GEMINI_API_KEY` - API key for Gemini integration

**Note:** No test framework configured in this project. Tests exist in `mission-control/` subdirectory.

---

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

- Use interfaces for object shapes; prefer string unions over enums
- ES2022 target with ESNext modules

---

## Imports (Path Aliases)

```typescript
import { something } from '@/components/Something';      // src/ directory
import { Incident } from '@shared/types/incidents';    // shared/ directory
```

Use path aliases (`@`, `@shared`) not relative imports.

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `layout.tsx`, `signal-events-repo.ts` |
| Components | PascalCase | `Layout.tsx` |
| Functions/variables | camelCase | `getIncidents()` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Types/interfaces | PascalCase | `IncidentDto` |
| Repositories | PascalCase with Repo suffix | `IncidentsRepo` |
| Services | PascalCase with Service suffix | `SystemHealthService` |

---

## React Components

- Functional components with hooks
- Named exports: `export function ComponentName() {}`
- React 19 JSX transform available (but React is still imported for useState, useEffect, etc.)
- Use `react-router` with `BrowserRouter`, `Routes`, `Route`
- Pages are thin composition shells; business logic in hooks/selectors

### Conditional Classes (clsx + tailwind-merge)

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn("base-class", isActive && "active-class", className)} />
```

---

## Backend (Express/Node.js)

### Project Structure
```
server/
├── api/routes/          # REST route handlers
├── api/dto/             # Data transfer objects
├── db/client.ts         # SQLite client (better-sqlite3)
├── db/repositories/     # Database access layer (Repository pattern)
├── domain/              # Business logic services
├── app/                 # App-level (errorHandling, logger, featureFlags)
├── realtime/            # WebSocket handling (ws package)
└── ingestion/adapters/ # External data adapters
```

### Route Handler Pattern

```typescript
// Wrap async route handlers with asyncHandler
app.get('/api/resource/:id', asyncHandler(async (req, res) => {
  const resource = await resourceService.getById(req.params.id);
  if (!resource) throw new NotFoundError('Resource not found');
  res.json(resource);
}));
```

### Error Classes

```typescript
// Use operational error classes for known errors
throw new NotFoundError('Resource not found');      // 404
throw new ValidationError('Invalid input');          // 400
throw new ConflictError('Resource already exists'); // 409
throw new OperationalError('Message', 500, 'CODE'); // Generic with status

// Global error handler catches all errors
// Non-operational errors return generic 500 message
```

### Logging

```typescript
import { logger } from './server/app/logger';

logger.info('event_name', 'Message', { metadata });
logger.warn('event_name', 'Message', { metadata });
logger.error('event_name', 'Message', error, { metadata });
```

### Security Headers (applied globally in server.ts)

```typescript
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
```

### Database Access
- All SQL in repository files or `schema.sql`
- Use parameterized queries: `.get(id)`, `.run(values...)`, `.all()`
- Repositories are singletons exported as `export const repo = new RepoClass()`

---

## Folder Structure

```
/map-repo
├── src/                     # React frontend
│   ├── app/providers.tsx    # App-level providers
│   ├── components/          # Reusable UI components
│   ├── features/            # Feature modules (api.ts, hooks.ts, selectors.ts)
│   └── pages/              # Route pages
├── server/                  # Express backend
│   ├── api/routes/          # REST route handlers
│   ├── api/dto/             # Data transfer objects
│   ├── db/client.ts         # SQLite client
│   ├── db/repositories/     # Database access layer
│   ├── domain/              # Business logic services
│   └── ingestion/adapters/  # External data adapters
├── shared/
│   ├── types/               # TypeScript definitions
│   └── constants/           # Shared constants
├── package.json
├── vite.config.ts
├── tsconfig.json
└── server.ts                # Entry point
```

### Shared Types (`shared/types/`)
`analytics.ts`, `api.ts`, `domain.ts`, `events.ts`, `incidents.ts`, `receivers.ts`, `replay.ts`, `sources.ts`, `websocket.ts`

---

## Architecture

### Backend Layers
**routes → services → repositories** - Domain logic goes in `server/domain/`

### Frontend Organization
- TanStack React Query for server state
- Zustand for global client state
- WebSocket handling centralized (avoid per-page connections)

### Implemented Features
- **Replay System** — Backend-driven deterministic replay via `GET /api/incidents/:id/replay` and `/frames`
- **Analytics** — Backend-computed metrics via `GET /api/analytics`
- **Incident Transitions** — Explicit state transitions persisted to `incident_state_transitions` table
- **Live Data Adapters** — AIS (vessels), OpenSky (aircraft), NWS (weather alerts), CelesTrak (satellites)

---

## Critical Path Priority

1. Shared types/constants (avoid duplication)
2. Repository pattern for DB access
3. Service layer for business logic
4. DTO mapping for API responses
5. Feature-based frontend organization

---

## Recommended Workflow

1. Run `npm run dev` to start development
2. Run `npm run lint` before committing
3. Use path aliases (`@`, `@shared`) not relative imports
4. Follow existing code patterns
5. See `ROADMAP.md` for project roadmap

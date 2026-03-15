# Agent Guidelines for BeaconScope

This document provides guidelines for agents working on the BeaconScope codebase.

## Project Overview

BeaconScope is a real-time, full-stack beacon monitoring and incident response console. It simulates a global network of receiver stations detecting distress signals.

**Tech Stack:**
- Frontend: React 19, Vite 6, Tailwind CSS 4, TypeScript ~5.8
- Backend: Express, Node.js, WebSockets (ws), better-sqlite3
- Additional: React Router 7, Zustand, TanStack React Query, Recharts, Leaflet

## Build Commands

```bash
# Install dependencies
npm install

# Start development server (runs both backend and frontend)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Clean build artifacts
npm run clean

# Run TypeScript type checking (linting)
npm run lint
```

**Environment Variables:**
- `RUNTIME_MODE` - Set to `dev`, `demo`, `live`, or `mixed` (default: `dev`)
- `SIMULATOR_ENABLED` - Enable/disable simulator (default: true in dev/demo)
- `LOG_LEVEL` - Set logging level (`debug`, `info`, `warn`, `error`)
- `PORT` - Server port (default: 3000)

**Note:** There is currently no test framework configured. Do not add tests unless explicitly requested.

## Code Style Guidelines

### General

- Use TypeScript for all new code
- Use ES2022 target with ESNext modules
- Use `moduleResolution: "bundler"` for imports

### Imports and Path Aliases

The project uses path aliases configured in `tsconfig.json` and `vite.config.ts`:

```typescript
// Use @ for src directory
import { something } from '@/components/Something';

// Use @shared for shared types and constants
import { Incident } from '@shared/types/incidents';
```

### React Components

- Use functional components with hooks
- Use named exports for components: `export function ComponentName() {}`
- Use React 19 JSX transform (no React import needed for JSX)
- Use `react-router` for routing with `BrowserRouter`, `Routes`, `Route`

Example:
```typescript
import { Outlet, NavLink } from "react-router";

export function Layout() {
  return (
    <div>
      <nav>
        <NavLink to="/path">Label</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
```

### Type Definitions

- Place shared types in `shared/types/` directory
- Place shared constants in `shared/constants/` directory
- Use interfaces for object shapes
- Use TypeScript enums sparingly; prefer string unions or const objects

Example:
```typescript
// shared/types/domain.ts
export type DomainType = 'marine' | 'aviation' | 'personal' | 'ground';

// In types/index.ts
export * from '@shared/types/domain';
export * from '@shared/types/incidents';
```

### Naming Conventions

- **Files**: kebab-case for files (`layout.tsx`, `signal-events-repo.ts`)
- **Components**: PascalCase (`.tsx` files)
- **Functions/variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Types/interfaces**: PascalCase

### CSS and Styling

- Use Tailwind CSS 4 with `@tailwindcss/vite` plugin
- Use Tailwind utility classes for styling
- Use `tailwind-merge` with `clsx` for conditional classes:

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}
```

### Backend (Express/Node.js)

- Use Express for REST API
- Use `better-sqlite3` for database operations
- Use WebSockets (`ws`) for real-time communication
- Use repository pattern for database access (`server/db/repositories/`)
- Use DTO functions for transforming data to API responses

Example:
```typescript
// server/api.ts
app.get('/api/incidents', (req, res) => {
  const incidents = incidentsRepo.listWithFilters();
  res.json(incidents.map(toIncidentDto));
});
```

### Error Handling

- Use proper HTTP status codes (404 for not found, 500 for server errors)
- Return JSON error responses: `res.status(404).json({ error: 'Not found' })`
- Use try/catch for async operations

### Database

- Use SQLite with `better-sqlite3`
- Database client in `server/db/client.ts`
- Repositories in `server/db/repositories/`
- Schema in `server/schema.sql`

### State Management

- Use Zustand for global client state
- Use TanStack React Query for server state/data fetching

### Folder Structure

```
/workspaces/map
├── src/                    # React frontend source
│   ├── app/               # App-level providers and config
│   ├── components/       # Reusable UI components
│   ├── features/         # Feature-specific code
│   ├── pages/            # Page components
│   └── types.ts          # Type re-exports
├── server/               # Express backend source
│   ├── api/              # REST API routes and DTOs
│   ├── db/               # Database client and repositories
│   ├── domain/           # Domain logic
│   ├── ingestion/        # Data ingestion/simulation
│   └── realtime/         # WebSocket handlers
├── shared/               # Shared types and constants
│   ├── types/            # TypeScript type definitions
│   └── constants/        # Constants
├── package.json
├── vite.config.ts
├── tsconfig.json
└── server.ts             # Entry point
```

### Important Configuration Notes

- Vite HMR can be disabled via `DISABLE_HMR` environment variable
- Server runs on port 3000 by default
- Database is SQLite (file-based: `beaconscope.db`)
- Production builds are served from `dist/` directory

### Recommended Workflow

1. Run `npm run dev` to start development
2. Run `npm run lint` before committing to check for type errors
3. Use path aliases (`@`, `@shared`) instead of relative imports
4. Follow existing code patterns in the codebase

## Architecture Guidelines

This project is undergoing phased architectural improvements. See `plan.md` for detailed refactoring plans.

### Current Implementation Status (Sprint 3)

**Completed:**
- ✅ Shared types (`shared/types/`) - domain, incidents, receivers, events, websocket, replay, analytics
- ✅ Shared constants (`shared/constants/`) - statuses, thresholds
- ✅ Backend layers - routes → services → repositories
- ✅ Incident transitions - `incident_state_transitions` table, service, and repo
- ✅ Replay service - `replayService.ts`, `replayFrameBuilder.ts` for deterministic frames
- ✅ Analytics service - `analyticsService.ts` with backend-computed metrics
- ✅ DTOs - incident, receiver, timeline, replay, analytics DTOs

### Current Implementation Status (Phase 4)

**Completed:**
- ✅ Adapter interface - `adapterInterface.ts` with normalized event types
- ✅ Adapter registry - centralized adapter management
- ✅ Polling scheduler - for polling-based adapters
- ✅ Base adapter class - common functionality
- ✅ AIS adapter - marine vessel tracking
- ✅ OpenSky adapter - aviation tracking with stale track detection
- ✅ Satellite adapter - orbital position tracking
- ✅ GTFS adapter - ground vehicle/protobuf ingestion
- ✅ Source health service - monitoring and observability
- ✅ Config management - feature flags per adapter
- ✅ Source DTOs - vessel, aircraft, satellite, ground asset positions

### Current Implementation Status (Phase 5)

**Completed:**
- ✅ Structured logging - `server/app/logger.ts` with JSON logs and subsystem loggers
- ✅ Error handling - centralized error handling middleware with proper HTTP responses
- ✅ Feature flags - `server/app/featureFlags.ts` with dev/demo/live modes
- ✅ System health - health endpoints and systemHealthService
- ✅ Operator actions - service and repo for incident management actions
- ✅ Audit trail - database table and repository for system events
- ✅ Background jobs - stale incident, source health, and cleanup jobs
- ✅ Data retention - cleanup job with configurable retention policies
- ✅ Graceful shutdown - SIGTERM/SIGINT handlers

### Backend Architecture (Phase 1)

- **Layers**: routes -> services -> repositories
- **Services**: Place domain logic in `server/domain/` (e.g., `incidentService.ts`, `confidenceEngine.ts`, `receiverHealthService.ts`)
- **Repositories**: Database access in `server/db/repositories/`
- **DTOs**: Transform data in `server/api/dto/` - routes should return DTOs, not raw rows
- **Ingestion**: Normalize external inputs in `server/ingestion/` before passing to domain services
- **WebSocket**: Use centralized message contracts in `shared/types/websocket.ts`
- **No raw SQL** outside repository files or schema files

### Frontend Architecture (Phase 2)

- **Providers**: App-level setup in `src/app/providers.tsx`
- **State**: Use TanStack Query for server state, Zustand for global client state
- **Features**: Organize by feature in `src/features/` with:
  - `api.ts` - endpoint calls
  - `hooks.ts` - data fetching hooks
  - `selectors.ts` - derived state
- **Socket**: Centralize WebSocket handling, avoid per-page socket connections
- **Pages**: Should be thin composition shells that use feature hooks/selectors

### Critical Path Priority

When working on this codebase, prioritize:
1. Shared types/constants (avoid duplication)
2. Repository pattern for DB access
3. Service layer for business logic
4. DTO mapping for API responses
5. Feature-based frontend organization

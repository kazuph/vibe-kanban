# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 Quality Assurance Requirements

### MANDATORY: Testing and Verification After Implementation

**CRITICAL RULE**: After implementing any feature or fix, you MUST:

1. **Install Dependencies**
   - Run `pnpm install` to ensure all dependencies are installed
   - This is essential for both frontend and backend functionality

2. **Run Existing Tests**
   - Execute `npm run check` to run all validation checks
   - Execute `cargo test --workspace` to run Rust tests
   - Ensure no tests are broken by your changes

3. **Start Development Server**
   - Run `pnpm run dev` to start both frontend and backend
   - Verify the application runs without errors
   - Allow the user to manually test the changes

4. **Database and Configuration in Worktrees**
   - When working in a worktree, copy necessary data from the main branch BEFORE running dev server:
     ```bash
     # Copy database files if they exist in main branch
     cp ../../*.db . 2>/dev/null || echo "No database files to copy"
     cp ../../*.sqlite . 2>/dev/null || echo "No SQLite files to copy"
     
     # Copy dev_assets_seed if it has data
     cp -r ../../dev_assets_seed/* dev_assets_seed/ 2>/dev/null || echo "Using default seed data"
     
     # Note: If no database exists, it will be created automatically on first run
     # The dev server will auto-copy from dev_assets_seed/ on startup
     ```
   - Database files (*.db, *.sqlite) from main branch
   - Configuration files from main branch
   - Test data and seed files from dev_assets_seed/
   - This ensures the application has proper test data even in isolated worktrees

**IMPORTANT**: Never mark a task as complete without running tests and starting the dev server for user verification.

## Essential Commands

### Development
```bash
# Start development servers with hot reload (frontend + backend)
pnpm run dev

# Individual dev servers
npm run frontend:dev    # Frontend only (port 3000)
npm run backend:dev     # Backend only (port auto-assigned)

# Build production version
./build-npm-package.sh
```

### Testing & Validation
```bash
# Run all checks (frontend + backend)
npm run check

# Frontend specific
cd frontend && npm run lint          # Lint TypeScript/React code
cd frontend && npm run format:check  # Check formatting
cd frontend && npx tsc --noEmit     # TypeScript type checking

# Backend specific  
cargo test --workspace               # Run all Rust tests
cargo test -p <crate_name>          # Test specific crate
cargo test test_name                # Run specific test
cargo fmt --all -- --check          # Check Rust formatting
cargo clippy --all --all-targets --all-features -- -D warnings  # Linting

# Type generation (after modifying Rust types)
npm run generate-types               # Regenerate TypeScript types from Rust
npm run generate-types:check        # Verify types are up to date
```

### Database Operations
```bash
# SQLx migrations
sqlx migrate run                     # Apply migrations
sqlx database create                 # Create database

# Database is auto-copied from dev_assets_seed/ on dev server start
```

## Architecture Overview

### Tech Stack
- **Backend**: Rust with Axum web framework, Tokio async runtime, SQLx for database
- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui components  
- **Database**: SQLite with SQLx migrations
- **Type Sharing**: ts-rs generates TypeScript types from Rust structs
- **MCP Server**: Built-in Model Context Protocol server for AI agent integration

### Project Structure
```
crates/
├── server/         # Axum HTTP server, API routes, MCP server
├── db/            # Database models, migrations, SQLx queries
├── executors/     # AI coding agent integrations (Claude, Gemini, etc.)
├── services/      # Business logic, GitHub, auth, git operations
├── local-deployment/  # Local deployment logic
└── utils/         # Shared utilities

frontend/          # React application
├── src/
│   ├── components/  # React components (TaskCard, ProjectCard, etc.)
│   ├── pages/      # Route pages
│   ├── hooks/      # Custom React hooks (useEventSourceManager, etc.)
│   └── lib/        # API client, utilities

shared/types.ts    # Auto-generated TypeScript types from Rust
```

### Key Architectural Patterns

1. **Event Streaming**: Server-Sent Events (SSE) for real-time updates
   - Process logs stream to frontend via `/api/events/processes/:id/logs`
   - Task diffs stream via `/api/events/task-attempts/:id/diff`

2. **Git Worktree Management**: Each task execution gets isolated git worktree
   - Managed by `WorktreeManager` service
   - Automatic cleanup of orphaned worktrees

3. **Executor Pattern**: Pluggable AI agent executors
   - Each executor (Claude, Gemini, etc.) implements common interface
   - Actions: `coding_agent_initial`, `coding_agent_follow_up`, `script`

4. **MCP Integration**: Vibe Kanban acts as MCP server
   - Tools: `list_projects`, `list_tasks`, `create_task`, `update_task`, etc.
   - AI agents can manage tasks via MCP protocol

### API Patterns

- REST endpoints under `/api/*`
- Frontend dev server proxies to backend (configured in vite.config.ts)
- Authentication via GitHub OAuth (device flow)
- All database queries in `crates/db/src/models/`

### Development Workflow

1. **Backend changes first**: When modifying both frontend and backend, start with backend
2. **Type generation**: Run `npm run generate-types` after modifying Rust types
3. **Database migrations**: Create in `crates/db/migrations/`, apply with `sqlx migrate run`
4. **Component patterns**: Follow existing patterns in `frontend/src/components/`

### Testing Strategy

- **Unit tests**: Colocated with code in each crate
- **Integration tests**: In `tests/` directory of relevant crates  
- **Frontend tests**: TypeScript compilation and linting only
- **CI/CD**: GitHub Actions workflow in `.github/workflows/test.yml`

### Environment Variables

Build-time (set when building):
- `GITHUB_CLIENT_ID`: GitHub OAuth app ID (default: Bloop AI's app)
- `POSTHOG_API_KEY`: Analytics key (optional)

Runtime:
- `BACKEND_PORT`: Backend server port (default: auto-assign)
- `FRONTEND_PORT`: Frontend dev port (default: 3000)
- `HOST`: Backend host (default: 127.0.0.1)
- `DISABLE_WORKTREE_ORPHAN_CLEANUP`: Debug flag for worktrees
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

## 🔍 **Semantic Code Navigation with LSP**

You are a professional coding agent with access to advanced semantic coding tools. You rely heavily on Language Server Protocol (LSP) features to efficiently navigate and understand this codebase without reading unnecessary code.

### Core Principles for Intelligent Code Reading

When reading code to answer questions or complete tasks, follow these principles:

1. **Minimize Code Reading**: Avoid reading entire files unless absolutely necessary
2. **Use Symbol Indexing**: Leverage symbol search tools to find specific code elements quickly  
3. **Step-by-Step Information Acquisition**: Build understanding incrementally using targeted queries
4. **Semantic Navigation**: Use LSP features to trace relationships between code elements

### IMPORTANT: Always use semantic tools to minimize code reading

- Use `search_symbol_from_index` to find specific symbols quickly (after indexing)
- Use `get_document_symbols` to understand file structure without reading full content
- Use `find_references` to trace symbol usage across the codebase
- Use `get_definitions` to navigate to symbol definitions
- Only read full files when absolutely necessary

### Intelligent Code Reading Workflow

1. **Index First**: Use `index_symbols` to build symbol index for fast searching
2. **Search Symbols**: Use `search_symbol_from_index` with filters (name, kind, file, container)
3. **Understand Structure**: Use `get_document_symbols` to get file organization
4. **Trace Relationships**: Use `get_definitions`, `find_references` to understand connections
5. **Targeted Reading**: Use standard file operations only for specific code sections

### Available LSP Tools

#### Symbol Management
- `index_symbols` - Build symbol index for files matching pattern (e.g., '**/*.ts', '**/*.rs')
- `search_symbol_from_index` - Fast search by name, kind (Class, Function, Method, etc.), file pattern, or container
- `get_document_symbols` - Get all symbols in a specific file with hierarchical structure
- `get_workspace_symbols` - Search symbols across the entire workspace

#### Code Navigation
- `get_definitions` - Navigate to symbol definitions  
- `find_references` - Find all references to a symbol
- `get_hover` - Get hover information (type signature, documentation)

#### Code Quality
- `get_diagnostics` - Get errors and warnings for a file
- `get_all_diagnostics` - Get diagnostics for all files matching a pattern
- `format_document` - Format code using language server

#### Code Modification  
- `rename_symbol` - Rename symbols across the codebase
- `get_code_actions` - Get available quick fixes and refactorings

### Symbol Types and Filtering

Use the `kind` parameter to filter symbols by type:
- **File, Module, Namespace, Package**: Organizational structures
- **Class, Interface, Enum, Struct**: Type definitions  
- **Method, Function, Constructor**: Executable code
- **Property, Field, Variable, Constant**: Data storage
- **TypeParameter**: Generic type parameters

### Best Practices

1. **Always prefer indexed searches** (tools with `_from_index` suffix) over reading entire files
2. **Use semantic navigation** to understand code relationships efficiently
3. **Filter searches** using kind, container, and file patterns to get precise results
4. **Build understanding incrementally** rather than reading large amounts of code upfront
5. **Use diagnostics** to identify and fix issues without manual code inspection

### Language-Specific Features

#### TypeScript/JavaScript (`mcp__typescript-lsmcp__*`)
- Full LSP support with rich type information
- Auto-import suggestions and code completion
- Advanced refactoring capabilities

#### Rust (`mcp__rust-lsmcp__*`) 
- rust-analyzer integration
- Comprehensive symbol indexing
- Macro and trait support

Always leverage these semantic tools to work efficiently and avoid unnecessary code reading.

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
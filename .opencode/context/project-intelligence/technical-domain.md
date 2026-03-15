<!-- Context: project-intelligence/technical | Priority: high | Version: 1.1 | Updated: 2026-03-15 -->

# Technical Domain

> Technical foundation, architecture, and key implementation details for booklore-mcp.

## Quick Reference

- **Purpose**: Understand how the project works technically
- **Update When**: New tools added, stack changes, architecture refactors
- **Audience**: Developers, contributors, AI agents working on the codebase

## Primary Stack

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Language | TypeScript | ^5.8.0 | Strong typing critical for MCP tool schemas and API contracts |
| Runtime | Node.js | 20+ | ESM native, stable async, wide MCP SDK support |
| Module System | Node16 ESM | — | `"type": "module"` in package.json; all imports use `.js` extensions |
| MCP Protocol | @modelcontextprotocol/sdk | ^1.12.0 | Official SDK — McpServer, StdioServerTransport, tool registration |
| Schema/Validation | Zod | ^3.25.6 | Runtime API response validation; types inferred from schemas |
| Dev Runner | tsx | ^4.19.0 | Fast dev loop without pre-compiling (watch mode) |
| Build | tsc | (TypeScript compiler) | Outputs to `dist/` with `.d.ts` + source maps |
| Transport | stdio | — | Standard MCP transport — no HTTP server involved |

**Not present**: Test framework, linter (ESLint), formatter (Prettier), Docker, CI/CD.

## Architecture Pattern

```
Type: Single-process stdio MCP server
Pattern: Flat layered — Config → Client → Tool Registrations → MCP SDK → Transport

AI Client (Claude Desktop, Cursor)
        │ stdio (MCP protocol messages)
        ▼
   McpServer (MCP SDK)
        │ routes tool calls by name
        ▼
  registerXxxTools()    ← per-domain: books, libraries, shelves, series, authors, notebooks
        │ typed method calls
        ▼
  BookLoreClient        ← HTTP client with Zod validation + auto token refresh
        │ fetch() REST calls
        ▼
  BookLore REST API     ← /api/v1/app/... (self-hosted instance)
```

### Why This Architecture?

MCP servers must communicate via stdio — this is a protocol constraint, not a choice. The flat layered structure (no microservices, no event bus) matches the single-process, single-user nature of a personal MCP tool. Domain-organized tool files keep the 23 tools navigable without a complex plugin system.

## Project Structure

```
booklore-mcp/
├── src/
│   ├── index.ts          # Entry point: env config, server bootstrap, transport connect, auth
│   ├── client.ts         # BookLoreClient: typed HTTP client, dual-auth, Zod parsing
│   ├── types.ts          # All Zod schemas + inferred TypeScript types (single source of truth)
│   └── tools/
│       ├── index.ts      # Aggregator: registerAllTools(server, client)
│       ├── books.ts      # 6 tools: search_books, get_book, update_book_rating, update_book_status, get_continue_reading, get_recently_added
│       ├── libraries.ts  # 2 tools: list_libraries, get_library_books
│       ├── shelves.ts    # 3 tools: list_shelves, list_magic_shelves, get_magic_shelf_books
│       ├── series.ts     # 2 tools: list_series, get_series_books
│       ├── authors.ts    # 3 tools: list_authors, get_author, get_author_books
│       ├── notebooks.ts  # 2 tools: list_notebook_books, get_book_notebook_entries
│       └── format.ts     # Pure formatting functions — no tool logic, only text output builders
├── dist/                 # Compiled output (tsc → ES2022 + .d.ts + source maps)
├── package.json          # ESM package, scripts: build/dev/start
├── tsconfig.json         # ES2022 target, Node16 module resolution, strict mode
└── README.md
```

**Key Directories**:
- `src/tools/` — One file per BookLore domain; each exports a single `registerXxxTools()` function
- `src/types.ts` — Never duplicate types here; always use `z.infer<typeof XxxSchema>`
- `dist/` — Git-ignored compiled output; run `npm run build` to populate

## Key Technical Decisions

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Zod for all API parsing | BookLore API is unversioned and can change silently; Zod provides runtime safety | Errors surface immediately at the boundary instead of propagating as undefined |
| Discriminated union auth config | Token mode vs credential mode are mutually exclusive; discriminated union enforces this at compile time | Eliminates mixed/invalid config at type level |
| Auto 401 refresh | Credential-mode tokens expire; silent retry on 401 prevents tool failures mid-session | Transparent to the AI client — tools just work |
| `format.ts` isolation | All text formatting in pure functions, never inline in tool handlers | Consistent output, testable in isolation, easy to update output format globally |
| `process.stderr` for logs | MCP protocol uses stdout; mixing logs into stdout corrupts messages | All diagnostics visible in MCP client logs without breaking the protocol |
| Domain-per-file tool structure | 23 tools across 6 domains; per-file organization prevents a single massive file | Easy to locate and add tools by domain |

See `decisions-log.md` for full decision history with alternatives.

## Integration Points

| System | Purpose | Protocol | Direction |
|--------|---------|----------|-----------|
| BookLore REST API | Read/write book library data | HTTP REST (`/api/v1/app/...`) | Outbound |
| MCP AI Client (Claude Desktop, Cursor) | Receives tool calls, returns formatted text | stdio (MCP protocol) | Inbound |
| BookLore Auth API | Login + JWT token management | HTTP REST (`/api/v1/app/auth/login`) | Outbound (credential mode) |

## Technical Constraints

| Constraint | Origin | Impact |
|------------|--------|--------|
| BookLore API is unversioned | Upstream design choice | Any BookLore update may break Zod schemas or endpoint paths |
| stdio-only transport | MCP protocol requirement | No HTTP server, no web dashboard, no concurrent clients |
| No BookLore SDK | BookLore doesn't publish one | Must maintain Zod schemas manually; API shapes discovered empirically |
| Node.js ESM strict | `"type": "module"` + Node16 | All imports must use `.js` extensions even for `.ts` source files |

## Development Environment

```
Requirements: Node.js 20+, npm
Setup:        git clone → npm install → npm run build
Local Dev:    npm run dev   (tsx watch mode — auto-recompile on change)
Type Check:   npx tsc --noEmit
Build:        npm run build  (outputs to dist/)
Run:          npm start      (node dist/index.js)
```

**Environment Variables** (required at runtime):

| Variable | Required | Default | Description |
|---|---|---|---|
| `BOOKLORE_BASE_URL` | No | `http://localhost:6060` | BookLore instance URL |
| `BOOKLORE_TOKEN` | Option A | — | Static API token (preferred) |
| `BOOKLORE_USERNAME` | Option B | — | Username for credential auth |
| `BOOKLORE_PASSWORD` | Option B | — | Password for credential auth |

Set either `BOOKLORE_TOKEN` **or** `BOOKLORE_USERNAME`+`BOOKLORE_PASSWORD`, not both.

## Deployment

```
Environment: Local / personal machine
Platform:    Runs as a child process of the MCP client (Claude Desktop, Cursor, etc.)
CI/CD:       None configured
Monitoring:  process.stderr logs visible in MCP client's server log output
```

**Claude Desktop Config** (`~/.config/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "booklore": {
      "command": "node",
      "args": ["/absolute/path/to/booklore-mcp/dist/index.js"],
      "env": { "BOOKLORE_TOKEN": "...", "BOOKLORE_BASE_URL": "http://localhost:6060" }
    }
  }
}
```

## Complete Tool Inventory (23 tools)

| Domain | Tool | Operation |
|--------|------|-----------|
| Books | `search_books` | Read — filter by title/author/library/shelf/status/rating/language/format |
| Books | `get_book` | Read — full detail: metadata, progress, files, shelves, Goodreads rating |
| Books | `update_book_rating` | Write — set personal rating (1–5) |
| Books | `update_book_status` | Write — set status (WANT_TO_READ/IN_PROGRESS/READ/DNF) |
| Books | `get_continue_reading` | Read — in-progress books |
| Books | `get_recently_added` | Read — most recently added books |
| Libraries | `list_libraries` | Read — all libraries with book counts and allowed formats |
| Libraries | `get_library_books` | Read — paginated books in a library |
| Shelves | `list_shelves` | Read — user-created shelves |
| Shelves | `list_magic_shelves` | Read — smart/auto-populated shelves |
| Shelves | `get_magic_shelf_books` | Read — books on a magic shelf |
| Series | `list_series` | Read — series with reading progress, searchable |
| Series | `get_series_books` | Read — all books in a series |
| Authors | `list_authors` | Read — author list, searchable |
| Authors | `get_author` | Read — author bio and book count |
| Authors | `get_author_books` | Read — all books by an author |
| Notebooks | `list_notebook_books` | Read — books with highlights/notes |
| Notebooks | `get_book_notebook_entries` | Read — all highlights and notes for a book |

## Onboarding Checklist

- [x] Know the primary tech stack (TypeScript + MCP SDK + Zod)
- [x] Understand the stdio-only architecture
- [x] Know the key project directories (`src/tools/`, `src/types.ts`, `src/client.ts`)
- [x] Understand dual-auth (token vs credential) and auto-refresh
- [x] Know how to run locally (`npm run dev`) and build (`npm run build`)
- [x] Understand `.js` extension requirement in imports (ESM + Node16)

## Related Files

- `business-domain.md` - Why this technical foundation exists
- `business-tech-bridge.md` - How user needs map to specific tools
- `decisions-log.md` - Full decision history with alternatives considered

<!-- Context: project-intelligence/decisions | Priority: high | Version: 1.2 | Updated: 2026-03-15 -->

# Decisions Log

> Major architectural and design decisions with full context. Prevents "why was this done?" debates.

## Quick Reference

- **Purpose**: Document decisions so contributors understand context
- **Format**: Each decision as a separate entry
- **Status**: Decided | Pending | Under Review | Deprecated

---

## Decision: stdio-only MCP Transport

**Date**: 2024 (initial design)
**Status**: Decided
**Owner**: Author / Maintainer

### Context
MCP servers need a transport mechanism to communicate with AI clients (Claude Desktop, Cursor). Two options in the MCP SDK are `StdioServerTransport` and SSE/HTTP-based transports. This is a personal tool running as a child process spawned by the AI client.

### Decision
Use `StdioServerTransport` exclusively. No HTTP server, no SSE, no exposed ports.

### Rationale
- MCP clients (Claude Desktop, Cursor) spawn the server as a child process and communicate over stdin/stdout — stdio is the natural fit
- No exposed ports means no network security surface
- Simpler setup: no port conflicts, no firewall rules
- Perfectly matched to single-user, single-client personal tool use case

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected? |
|-------------|------|------|---------------|
| SSE transport | Could serve multiple clients | Requires HTTP server, port management, auth | Over-engineered for personal single-user tool |
| HTTP/REST wrapper | Familiar | Not MCP protocol; requires separate client integration | Defeats the purpose of MCP |

### Impact
- **Positive**: Zero network setup, secure by default, works exactly as AI clients expect
- **Negative**: Cannot serve multiple AI clients simultaneously; no web dashboard
- **Risk**: If MCP ecosystem moves away from stdio toward HTTP-first, would need transport change

---

## Decision: Zod for All API Response Parsing

**Date**: 2024 (initial design)
**Status**: Decided
**Owner**: Author / Maintainer

### Context
BookLore's REST API is internal and explicitly unversioned. Response shapes can change between BookLore releases without notice. We need to consume this API safely without a published SDK or type contract.

### Decision
Define all API response shapes as Zod schemas in `src/types.ts`. Parse every API response through Zod in `client.ts::parseResponse()`. Types are inferred from schemas (`z.infer<typeof XxxSchema>`) — schemas are the single source of truth.

### Rationale
- Runtime validation catches API breakage at the boundary immediately, not deep in tool logic
- `z.infer` eliminates type duplication between schema and TypeScript type
- `.nullable().optional()` on fields handles BookLore's loose contract (fields sometimes missing or null)
- Schema extension (`BookDetailSchema extends BookSummarySchema`) avoids duplication between list and detail views

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected? |
|-------------|------|------|---------------|
| Hand-written TypeScript interfaces | Familiar | No runtime validation; silent failures on API shape changes | Too risky given unversioned API |
| No validation (raw JSON) | Simpler | Would propagate undefined/null errors into tool output | Unacceptable for user-facing tool responses |
| io-ts | Runtime validation | Verbose, less ergonomic than Zod | Zod is simpler and widely adopted |

### Impact
- **Positive**: API breakage detected immediately with clear error messages; types always match runtime data
- **Negative**: Zod schemas must be updated when BookLore API changes
- **Risk**: Overly strict schemas will throw on valid data if BookLore adds new fields — mitigated by `.passthrough()` or `.strip()` where needed

---

## Decision: Discriminated Union for Auth Configuration

**Date**: 2024 (initial design)
**Status**: Decided
**Owner**: Author / Maintainer

### Context
BookLore supports two authentication methods: a static API token (long-lived) and username/password (which returns a short-lived JWT that must be refreshed). These are mutually exclusive — mixing them is invalid. The config loaded from environment variables needs to enforce this.

### Decision
`BookLoreConfig` is a TypeScript discriminated union: `TokenConfig` (has `token: string`) vs `CredentialConfig` (has `username` + `password`). The `loadConfigFromEnv()` function validates at startup and throws if neither or both are supplied.

### Rationale
- Discriminated union makes it impossible to write client code that tries to use both auth methods
- TypeScript narrows the type in branches, so token-mode code can't accidentally access credential fields
- Fail-fast at startup (env var validation) is better than failing mid-session when a tool call is made

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected? |
|-------------|------|------|---------------|
| Single config interface with optional fields | Simpler type | Allows invalid mixed state; requires runtime checks everywhere | Pushes validation burden to every consumer |
| Two separate client classes | Fully isolated | More code, harder to register tools against both | Over-engineered for this scale |

### Impact
- **Positive**: Auth config validity guaranteed at compile time; clear error messages at startup
- **Negative**: Slightly more complex config type to understand initially
- **Risk**: Low — well-established TypeScript pattern

---

## Decision: Formatting Isolated to `format.ts`

**Date**: 2024 (initial design)
**Status**: Decided
**Owner**: Author / Maintainer

### Context
MCP tools return text content to AI clients. Early in development, formatting logic (building human-readable strings from API data) could have been inlined into each tool handler.

### Decision
All text formatting lives exclusively in `src/tools/format.ts` as pure functions (`formatBookSummary()`, `formatBookDetail()`, `formatPageInfo()`, etc.). Tool handlers call formatters but never build strings inline.

### Rationale
- Pure functions are trivially testable in isolation
- Consistent output format across all tools (same field ordering, same null handling)
- When BookLore API shape changes, formatting updates are in one place
- Keeps tool handler functions focused on tool logic, not presentation

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected? |
|-------------|------|------|---------------|
| Inline formatting in each tool | Fewer files | Inconsistent output, duplication, harder to update globally | Violates single-responsibility |
| Template strings at call site | Flexible | Scatters formatting logic across 7 files | Same problem as inline |

### Impact
- **Positive**: DRY, consistent, testable formatting; easy to update output globally
- **Negative**: Minor indirection when tracing tool output
- **Risk**: Low

---

## Decision: `process.stderr` for All Diagnostics

**Date**: 2024 (initial design)
**Status**: Decided
**Owner**: Author / Maintainer

### Context
MCP protocol uses stdout for all protocol messages (JSON-RPC). Any writes to stdout that aren't valid MCP messages will corrupt the session and break the AI client connection.

### Decision
All diagnostic output (startup messages, auth status, connectivity check, errors) uses `process.stderr.write()`. `console.log()` is never used.

### Rationale
- MCP protocol owns stdout — contaminating it breaks the entire session
- `process.stderr` is visible in MCP client logs for debugging without interfering with the protocol
- `console.log` in Node.js writes to stdout by default — it's banned in this codebase

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected? |
|-------------|------|------|---------------|
| console.log | Familiar | Writes to stdout, breaks MCP protocol | Hard no |
| Logging library (winston, pino) | Structured logs | Overhead, configuration; stderr redirect works fine | Over-engineered |

### Impact
- **Positive**: Protocol integrity maintained; all logs still visible in client's MCP server log viewer
- **Negative**: Slightly unusual for Node.js developers used to console.log
- **Risk**: Any future contributor using console.log will break the server — worth documenting (done)

---

## Decision: Dynamic Tool Category Registration

**Date**: 2026-03-15
**Status**: Decided
**Owner**: Author / Maintainer

### Context
All 18 domain tools were eagerly registered at startup, injecting all their schemas into the LLM's context window on every request. With multiple MCP servers connected simultaneously, this wastes tokens and increases latency. MCP SDK v1.27.1+ provides `RegisteredTool.enable()` / `disable()` with automatic `listChanged` notifications.

### Decision
Register all 18 tools at startup but immediately `disable()` 5 of 6 categories before `server.connect()`. A `use_booklore_category` meta-tool (always visible) lets the LLM enable/disable categories on demand. Only the `books` category (6 tools) is enabled by default.

### Rationale
- `disable()` before `server.connect()` stores the flag without firing notifications — safe at startup
- LLM sees 7 tools at startup (6 book tools + 1 meta-tool) instead of 18, reducing per-request schema token cost
- Enable/disable is idempotent and reversible — handles stay valid; no re-registration needed
- `listChanged` notification fires automatically on `.enable()` / `.disable()` — no manual wiring required
- Books is the most universally needed category; all others are opt-in

### Alternatives Considered
| Alternative | Pros | Cons | Why Rejected? |
|-------------|------|------|---------------|
| `search_tools` meta-tool | Single tool for discovery | Returns tool schemas as text, not proper tool registrations; no native listChanged integration | Heavier prompt overhead per lookup |
| Remove/re-register pattern | Tools fully absent from memory | SDK throws on duplicate name registration; must track handles and null them out carefully | More fragile than enable/disable |
| Leave all tools always enabled | Simpler | Context window cost per request; scales poorly as more tools are added | Suboptimal for multi-server setups |

### Impact
- **Positive**: Per-request context window reduced by ~60% (18 → 7 visible tool schemas)
- **Negative**: Newly-enabled tools available only on the *next* LLM turn (listChanged round-trip latency)
- **Risk**: Clients that don't support `listChanged` won't see newly-enabled tools — meta-tool response includes tool names as text mitigation

---

## Deprecated Decisions

None yet.

## Onboarding Checklist

- [x] Understand why stdio transport was chosen (personal tool, child process model)
- [x] Know why Zod is used everywhere (unversioned API, runtime safety)
- [x] Understand discriminated union auth config (token vs credential are mutually exclusive)
- [x] Know why format.ts is isolated (DRY, consistent, testable)
- [x] Know why console.log is banned (stdout belongs to MCP protocol)

## Related Files

- `technical-domain.md` - Technical implementation affected by these decisions
- `business-tech-bridge.md` - How decisions connect business needs and technical solutions
- `living-notes.md` - Current open questions that may become future decisions

<!-- Context: domain/mcp-dynamic-tools | Priority: high | Version: 1.0 | Updated: 2026-03-15 -->

# MCP Dynamic Tool Registration — Research Findings

> Research findings on MCP dynamic tool registration patterns. Captured to inform a potential `use_booklore_category` meta-tool feature that reduces startup context window cost.

## Quick Reference

- **Problem**: All 18 tools eagerly registered at startup → full schema injected into LLM context on every request
- **Solution available**: MCP SDK v1.27.1+ provides `tool.enable()` / `tool.disable()` with automatic `listChanged` notifications
- **Proposed pattern**: Register all tools at startup, disable non-essential categories, expose one `use_booklore_category` meta-tool
- **Expected gain**: LLM sees 7 tools at startup instead of 18

---

## The Problem

Every registered tool's schema definition occupies context window space. With 18 tools and multiple MCP servers connected simultaneously, this:

- Wastes tokens on every request (schemas loaded regardless of whether tools are used)
- Increases response latency and cost
- Scales poorly: Anthropic's engineering blog reported 150,000 tokens at scale before optimization

**Source**: https://www.anthropic.com/engineering/code-execution-with-mcp

The blog post describes a `search_tools` meta-tool pattern: a single tool accepting a query + detail level (`name_only`, `name_and_description`, `full_schema`) that returns only matching definitions — avoiding loading all schemas upfront. Their implementation reduced token usage from 150,000 → 2,000 tokens (98.7% reduction).

---

## MCP SDK API: Dynamic Tool Registration

**SDK**: `@modelcontextprotocol/sdk` v1.27.1+

Every `server.registerTool(...)` call returns a `RegisteredTool` object with lifecycle methods:

| Method / Property | Behaviour |
|---|---|
| `tool.enable()` | Sets `enabled = true`, fires `sendToolListChanged()` automatically |
| `tool.disable()` | Sets `enabled = false`, fires `sendToolListChanged()` automatically |
| `tool.remove()` | Removes from registry entirely, fires `sendToolListChanged()` |
| `tool.update({...})` | Updates any property, fires `sendToolListChanged()` |
| `tool.enabled` | Readable boolean — current enabled state |

### How `listChanged` Works

1. Server emits `notifications/tools/list_changed` (JSON-RPC notification) on any enable/disable/remove
2. Client must re-issue `tools/list` after receiving this notification
3. Server capability `{ tools: { listChanged: true } }` is auto-declared by the SDK on the first `registerTool()` call
4. `tools/list` response filters to only `enabled === true` tools — disabled tools are **invisible** to the LLM
5. `sendToolListChanged()` is a no-op before `server.connect()` — safe to disable tools before connecting

### Disabled Tool Call Behaviour

Disabled tools **can still be called** via `tools/call`. The SDK throws:
```
McpError(ErrorCode.InvalidParams, "Tool X disabled")
```
This gives stale clients a clean error rather than silent failure.

---

## Recommended Pattern for booklore-mcp

### Pattern: `use_booklore_category` Meta-Tool

**At startup**: Register all 18 tools but immediately `disable()` non-essential categories before `server.connect()` (no notifications fire pre-connect).

**Meta-tool** (always visible):
```typescript
server.registerTool("use_booklore_category", {
  description: "Enable or disable a category of BookLore tools to manage context usage.",
  inputSchema: z.object({
    category: z.enum(["books", "libraries", "shelves", "series", "authors", "notebooks"]),
    action: z.enum(["enable", "disable"]),
  }),
}, async ({ category, action }) => {
  const tools = toolsByCategory[category];
  tools.forEach(t => action === "enable" ? t.enable() : t.disable());
  return {
    content: [{ type: "text", text: `${category} tools ${action}d. Re-check your available tools.` }],
  };
});
```

**Result**: LLM sees 7 tools at startup (6 book tools + 1 meta-tool) instead of 18.

### Tool Category Inventory

| Category | Tools | Count | Default State |
|----------|-------|:-----:|:-------------:|
| books | `search_books`, `get_book`, `update_book_rating`, `update_book_status`, `get_continue_reading`, `get_recently_added` | 6 | **enabled** |
| libraries | `list_libraries`, `get_library_books` | 2 | disabled |
| shelves | `list_shelves`, `list_magic_shelves`, `get_magic_shelf_books` | 3 | disabled |
| series | `list_series`, `get_series_books` | 2 | disabled |
| authors | `list_authors`, `get_author`, `get_author_books` | 3 | disabled |
| notebooks | `list_notebook_books`, `get_book_notebook_entries` | 2 | disabled |

---

## Gotchas

| Gotcha | Detail |
|--------|--------|
| **`listChanged` round-trip delay** | Newly-enabled tools are available on the *next* LLM turn, not the same one. Mitigate by telling the LLM "re-check your available tools" in the meta-tool response. |
| **No mid-conversation persistence** | Enabled state is in-memory only — resets on server restart. |
| **Duplicate name guard** | SDK throws if `registerTool()` is called twice with the same name. Use `enable()`/`disable()`, never `remove()` + re-register. |
| **Pre-connect disable is safe** | `disable()` before `server.connect()` stores the flag without firing notifications — no spurious list-changed events on startup. |
| **Clients without `listChanged` support** | Meta-tool still succeeds but LLM won't see newly-enabled tools until next `tools/list`. Mitigate by returning the enabled tool names explicitly in the success response. |

---

## Implementation Notes

### Where to implement

- `src/tools/index.ts` — `registerAllTools()` returns a `toolsByCategory` map; immediately disable non-books categories
- `src/tools/meta.ts` (new) — `registerMetaTool()` accepting the category map
- `src/index.ts` — call `registerMetaTool()` after `registerAllTools()`; all before `server.connect()`

### Return type change

`registerAllTools()` currently returns `void`. It would need to return:
```typescript
Record<Category, RegisteredTool[]>
```

### Codebase references

- Current tool registration: `src/tools/index.ts` — `registerAllTools(server, client)`
- Domain tool files: `src/tools/books.ts`, `libraries.ts`, `shelves.ts`, `series.ts`, `authors.ts`, `notebooks.ts`
- Server bootstrap: `src/index.ts` — where `server.connect()` is called

---

## Status

**Research complete.** Not yet implemented. See `project-intelligence/living-notes.md` for tracking of this as an open improvement.

## Related Files

- `project-intelligence/technical-domain.md` — Full tool inventory and architecture overview
- `project-intelligence/decisions-log.md` — Architecture decisions this pattern would extend
- `project-intelligence/living-notes.md` — Open questions and improvement backlog

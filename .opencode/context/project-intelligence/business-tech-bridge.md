<!-- Context: project-intelligence/bridge | Priority: high | Version: 1.1 | Updated: 2026-03-15 -->

# Business ↔ Tech Bridge

> How user needs translate to technical solutions in booklore-mcp.

## Quick Reference

- **Purpose**: Show how each technical tool/decision serves a concrete user need
- **Update When**: New tools added, existing tools changed, BookLore API breaks a mapping
- **Audience**: Contributors deciding where to add new features; agents reasoning about scope

---

## Core Mapping

| User Need | Technical Solution | Why This Mapping | Value Delivered |
|---------------|-------------------|------------------|----------------|
| "What am I currently reading?" | `get_continue_reading` tool → `client.getContinueReading()` → BookLore `/continue-reading` | Direct API endpoint for in-progress books | Instant answer without opening BookLore UI |
| "Find unread sci-fi books" | `search_books` tool with status + genre filters → `client.searchBooks()` | Exposes all BookLore filter dimensions as tool parameters | Natural language filtering across entire library |
| "Rate this book" | `update_book_rating` tool → `client.updateBookRating()` → PUT request | Write operation; rating stored in BookLore | Update library metadata mid-conversation |
| "What are my notes on this book?" | `get_book_notebook_entries` → `client.getBookNotebookEntries()` | Notebook entries are highlights + notes BookLore stores | Reference highlights in AI workflow without switching apps |
| "Show me all books in this series" | `get_series_books` → `client.getSeriesBooks()` | Series are a first-class entity in BookLore | Explore series reading order naturally |
| "Authenticate reliably" | Discriminated union config + auto-refresh on 401 | Token expires require silent re-login | Tools never fail mid-session due to auth expiry |
| "Readable output from AI" | `format.ts` pure formatters called by all tools | Consistent, human-readable text output | AI gets structured text it can reason about cleanly |

---

## Feature Group Mappings

### Feature Group: Book Discovery & Search

**User Need**: Find specific books or browse the library without knowing exact titles or IDs.

**Technical Implementation**:
- `search_books` — multi-dimensional filter: title, author, library ID, shelf ID, status, rating, language, file type, pagination
- `get_recently_added` — surface new additions without querying
- `get_book` — full detail view once a book is identified (ID required)

**Connection**: Users interact with large libraries (hundreds to thousands of books). The search tool maps every BookLore filter dimension to a tool parameter, so the AI can translate vague queries ("unread fantasy books added this year") into precise filter combinations.

**Gap**: No fuzzy title search — `search_books` requires exact or partial match; BookLore API determines matching behavior.

---

### Feature Group: Reading Progress & Status

**User Need**: Track what's been read, what's in progress, what to read next — without opening the web UI.

**Technical Implementation**:
- `get_continue_reading` — directly surfaces in-progress books
- `update_book_status` — sets `WANT_TO_READ | IN_PROGRESS | READ | DNF`
- `update_book_rating` — sets 1–5 personal rating
- `get_book` — includes progress percentage in the detail response

**Connection**: The core loop for an active reader: start a book (status update), read it, finish it (status update + rating), pick the next one (search + continue reading). All of this is now achievable mid-conversation.

**Gap**: Progress percentage is read-only — cannot set current page/percentage via MCP (BookLore API may not expose this as a write endpoint).

---

### Feature Group: Library & Shelf Organization

**User Need**: Understand how the library is organized and browse by collection.

**Technical Implementation**:
- `list_libraries` — all libraries with book counts and allowed formats
- `get_library_books` — paginated book list for a specific library
- `list_shelves` — user-created organizational shelves
- `list_magic_shelves` — smart shelves (auto-populated by BookLore rules)
- `get_magic_shelf_books` — books on a specific magic shelf

**Connection**: BookLore organizes books into Libraries (top-level, format-specific) and Shelves (user tags/categories). Exposing both lets users navigate their personal organization system naturally.

**Gap**: Cannot create, rename, or delete shelves via MCP. Cannot add/remove books from shelves. Write operations limited to rating and status only.

---

### Feature Group: Series & Author Exploration

**User Need**: Explore an author's catalog or a book series' reading order.

**Technical Implementation**:
- `list_series` + `get_series_books` — series with progress metadata, all books in order
- `list_authors` + `get_author` + `get_author_books` — author detail and full catalog

**Connection**: Readers following a series or discovering an author want to know: "what else is there and have I read it?" These tools answer that directly, with reading progress embedded in the response.

---

### Feature Group: Highlights & Notes (Notebooks)

**User Need**: Reference personal highlights and notes from books in AI conversations.

**Technical Implementation**:
- `list_notebook_books` — books that have at least one highlight or note
- `get_book_notebook_entries` — all entries (highlight text, note text, location) for a book

**Connection**: Highlights are the most valuable artifact from reading. By exposing them via MCP, users can ask Claude to summarize their notes, find connections between highlights, or use them as grounding context for deeper discussion.

---

### Feature Group: Authentication

**User Need**: Connect to BookLore reliably without managing auth manually.

**Technical Implementation**:
- Dual-auth config: `BOOKLORE_TOKEN` (static, long-lived) or `BOOKLORE_USERNAME`+`BOOKLORE_PASSWORD` (JWT, auto-refreshed)
- `ensureAuthenticated()` called at startup in credential mode
- Silent 401 retry in `get()` and `put()` — refreshes token and retries once before failing

**Connection**: Authentication failures mid-session are invisible to the user but break all tool calls. The auto-refresh pattern ensures token expiry is handled transparently.

---

## Trade-off Decisions

| Situation | Business Priority | Technical Priority | Decision Made | Rationale |
|-----------|-------------------|-------------------|---------------|-----------|
| No test framework | Ship working tools quickly | Code quality assurance | Shipped without tests | Personal tool at v0.1.0; correctness verified manually against live BookLore instance |
| Read-heavy, limited write ops | Cover the most common actions | API safety | Read-first with cautious writes | BookLore PUT endpoints are fewer and riskier to expose than GET endpoints |
| Zod strict parsing | Predictable tool behavior | Catch API drift | Strict by default | Better to fail loudly on schema mismatch than silently return corrupted data |
| No linter/formatter | Fast iteration | Consistent code style | Deferred | Small codebase; consistent patterns maintained manually |

---

## Common Misalignments to Watch For

| Misalignment | Warning Signs | Resolution Approach |
|--------------|---------------|---------------------|
| BookLore API shape changes | Zod parse errors in tool responses | Update affected schemas in `types.ts` |
| New BookLore feature not in MCP | Users asking for capability that doesn't exist | Add new tool in the relevant domain file |
| Write tool expanding scope too fast | Tool doing more than one atomic operation | Keep each tool to a single API call |
| Formatting divergence | Different tools outputting different styles for same data | All formatting must go through `format.ts` |

---

## Onboarding Checklist

- [x] Understand the core user need (natural language library interaction)
- [x] See how each tool group maps to a user workflow
- [x] Know the key trade-offs (no tests, read-heavy, strict Zod)
- [x] Know the current gaps (no shelf write ops, no progress write, no fuzzy search)
- [x] Understand the auth trade-off (token preferred, credential with auto-refresh as fallback)

## Related Files

- `business-domain.md` - Business needs in detail
- `technical-domain.md` - Technical implementation in detail
- `decisions-log.md` - Decisions made with full context
- `living-notes.md` - Current open questions and known gaps

# booklore-mcp

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for [BookLore](https://github.com/booklore-app/booklore) — your self-hosted digital library manager.

Connect Claude (or any MCP-compatible AI client) directly to your BookLore instance to search your library, check reading progress, update statuses and ratings, browse series, explore highlights, and more — all through natural conversation.

---

## Requirements

- [BookLore](https://github.com/booklore-app/booklore) v2.x running and accessible
- Node.js 20+
- An MCP-compatible client (Claude Desktop, Cursor, etc.)

---

## Installation

```bash
git clone https://github.com/cyberglitchlabs/booklore-mcp.git
cd booklore-mcp
npm install
npm run build
```

---

## Configuration

BookLore MCP supports two authentication methods.

### Option A — API token (recommended if available)

1. Log in to your BookLore instance
2. Go to **Settings → Profile**
3. Copy your API token

### Option B — Username / password

If you don't have easy access to an API token, you can authenticate with your BookLore username and password. The server will log in on startup, cache the access token, and automatically refresh it when it expires.

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `BOOKLORE_BASE_URL` | ❌ | `http://localhost:6060` | Base URL of your BookLore instance |
| `BOOKLORE_TOKEN` | ✅ (Option A) | — | Your BookLore API token |
| `BOOKLORE_USERNAME` | ✅ (Option B) | — | BookLore username |
| `BOOKLORE_PASSWORD` | ✅ (Option B) | — | BookLore password |

Set either `BOOKLORE_TOKEN` **or** `BOOKLORE_USERNAME` + `BOOKLORE_PASSWORD` — not both.

---

## Claude Desktop setup

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**Linux**: `~/.config/Claude/claude_desktop_config.json`

**Option A — API token:**

```json
{
  "mcpServers": {
    "booklore": {
      "command": "node",
      "args": ["/absolute/path/to/booklore-mcp/dist/index.js"],
      "env": {
        "BOOKLORE_TOKEN": "your-token-here",
        "BOOKLORE_BASE_URL": "http://localhost:6060"
      }
    }
  }
}
```

**Option B — Username / password:**

```json
{
  "mcpServers": {
    "booklore": {
      "command": "node",
      "args": ["/absolute/path/to/booklore-mcp/dist/index.js"],
      "env": {
        "BOOKLORE_USERNAME": "your-username",
        "BOOKLORE_PASSWORD": "your-password",
        "BOOKLORE_BASE_URL": "http://localhost:6060"
      }
    }
  }
}
```

Replace `/absolute/path/to/booklore-mcp` with the actual path where you cloned the repo.

Restart Claude Desktop after saving.

---

## Available tools

### Books

| Tool | Description |
|---|---|
| `search_books` | Search and filter books by title, author, library, shelf, status, rating, language, and file type |
| `get_book` | Full book details — metadata, progress, files, shelves, Goodreads rating |
| `update_book_rating` | Set personal rating (1–5) |
| `update_book_status` | Set read status (`WANT_TO_READ`, `IN_PROGRESS`, `READ`, `DNF`) |
| `get_continue_reading` | Books currently in progress |
| `get_recently_added` | Most recently added books |

### Libraries

| Tool | Description |
|---|---|
| `list_libraries` | List all libraries with book counts and allowed formats |
| `get_library_books` | Browse books in a specific library |

### Shelves

| Tool | Description |
|---|---|
| `list_shelves` | List all user-created shelves |
| `list_magic_shelves` | List all smart/auto-populated shelves |
| `get_magic_shelf_books` | Browse books on a specific magic shelf |

### Series

| Tool | Description |
|---|---|
| `list_series` | List or search series with reading progress |
| `get_series_books` | Get all books in a specific series |

### Authors

| Tool | Description |
|---|---|
| `list_authors` | List or search authors |
| `get_author` | Author bio and book count |
| `get_author_books` | All books by a specific author |

### Notebooks

| Tool | Description |
|---|---|
| `list_notebook_books` | Books that have highlights or notes |
| `get_book_notebook_entries` | All highlights and notes for a specific book |

---

## Usage examples

> "What books am I currently reading?"

> "Search for sci-fi books I haven't read yet, sorted by most recently added"

> "Show me all books in the Dune series"

> "What are my highlights from Project Hail Mary?"

> "Mark book 42 as read and give it a 5-star rating"

> "List all my libraries"

---

## Development

```bash
# Run in watch mode (auto-recompile on change)
npm run dev

# Type-check without emitting
npx tsc --noEmit

# Build for production
npm run build
```

---

## Disclaimer

BookLore's API is internal and unversioned — it may change between BookLore releases without notice. This MCP server targets BookLore v2.x. If your BookLore instance is updated and tools start failing, check whether the API endpoints or response shapes have changed.

---

## License

MIT

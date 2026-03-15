import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BookLoreClient } from "../client.js";
import { registerBookTools } from "./books.js";
import { registerLibraryTools } from "./libraries.js";
import { registerShelfTools } from "./shelves.js";
import { registerSeriesTools } from "./series.js";
import { registerAuthorTools } from "./authors.js";
import { registerNotebookTools } from "./notebooks.js";
import type { CategoryName, ToolRegistry } from "./meta.js";

// ---------------------------------------------------------------------------
// Register all tools; disable non-essential categories pre-connect so the
// LLM sees only 7 tools at startup (6 book tools + use_booklore_category).
// ---------------------------------------------------------------------------

export function registerAllTools(server: McpServer, client: BookLoreClient): ToolRegistry {
  const registry: ToolRegistry = {
    books: registerBookTools(server, client),
    libraries: registerLibraryTools(server, client),
    shelves: registerShelfTools(server, client),
    series: registerSeriesTools(server, client),
    authors: registerAuthorTools(server, client),
    notebooks: registerNotebookTools(server, client),
  };

  // Disable non-essential categories before server.connect() — no notifications fire
  const nonDefault: CategoryName[] = ["libraries", "shelves", "series", "authors", "notebooks"];
  nonDefault.forEach((cat) => registry[cat].forEach((t) => t.disable()));

  return registry;
}

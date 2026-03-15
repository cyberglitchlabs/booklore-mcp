import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BookLoreClient } from "../client.js";
import { registerBookTools } from "./books.js";
import { registerLibraryTools } from "./libraries.js";
import { registerShelfTools } from "./shelves.js";
import { registerSeriesTools } from "./series.js";
import { registerAuthorTools } from "./authors.js";
import { registerNotebookTools } from "./notebooks.js";

// ---------------------------------------------------------------------------
// Register all static tools (safe to call before or after server.connect)
// ---------------------------------------------------------------------------

export function registerAllTools(server: McpServer, client: BookLoreClient): void {
  registerBookTools(server, client);
  registerLibraryTools(server, client);
  registerShelfTools(server, client);
  registerSeriesTools(server, client);
  registerAuthorTools(server, client);
  registerNotebookTools(server, client);
}

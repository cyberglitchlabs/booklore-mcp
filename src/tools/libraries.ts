import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { formatBookSummary, formatPageInfo, pluralize } from "./format.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerLibraryTools(server: McpServer, client: BookLoreClient): void {
  registerListLibraries(server, client);
  registerGetLibraryBooks(server, client);
}

// ---------------------------------------------------------------------------
// list_libraries
// ---------------------------------------------------------------------------

function registerListLibraries(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "list_libraries",
    {
      description: "List all libraries in your BookLore instance, including book counts and allowed formats.",
      inputSchema: z.object({}),
    },
    async () => {
      const libraries = await client.listLibraries();
      if (libraries.length === 0) {
        return { content: [{ type: "text", text: "No libraries found." }] };
      }

      const lines = libraries.map((lib) => {
        const formats = lib.allowedFormats?.join(", ") ?? "all";
        return `• [${lib.id}] ${lib.name} — ${lib.bookCount} book(s), formats: ${formats}`;
      });

      return { content: [{ type: "text", text: [`${libraries.length} ${pluralize(libraries.length, "library", "libraries")}:`, "", ...lines].join("\n") }] };
    }
  );
}

// ---------------------------------------------------------------------------
// get_library_books
// ---------------------------------------------------------------------------

function registerGetLibraryBooks(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "get_library_books",
    {
      description: "Browse books within a specific library with optional sorting and pagination.",
      inputSchema: z.object({
        libraryId: z.number().int().positive().describe("The library ID (use list_libraries to find IDs)"),
        sort: z
          .string()
          .optional()
          .describe("Sort field (e.g. 'title', 'addedOn', 'lastReadTime')"),
        dir: z.enum(["asc", "desc"]).optional().describe("Sort direction: asc or desc"),
        page: z.number().int().min(0).optional().default(0).describe("Page number (0-indexed)"),
        size: z.number().int().min(1).max(100).optional().default(20).describe("Page size (1–100)"),
      }),
    },
    async ({ libraryId, sort, dir, page, size }) => {
      const result = await client.listBooks({ libraryId, sort, dir, page, size });

      const lines = [
        formatPageInfo(result, "book"),
        "",
        ...result.content.map(formatBookSummary),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { formatBookPage, formatPageInfo, pluralize } from "./format.js";
import { wrapToolHandler } from "./errors.js";
import { PaginationSchema, SortSchema, BookSortSchema } from "./schemas.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerLibraryTools(server: McpServer, client: BookLoreClient): RegisteredTool[] {
  return [
    registerListLibraries(server, client),
    registerGetLibraryBooks(server, client),
  ];
}

// ---------------------------------------------------------------------------
// list_libraries
// ---------------------------------------------------------------------------

function registerListLibraries(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "list_libraries",
    {
      description: "List all libraries in your BookLore instance, including book counts and allowed formats.",
      inputSchema: z.object({}),
    },
    wrapToolHandler(async () => {
      const libraries = await client.listLibraries();
      if (libraries.length === 0) {
        return { content: [{ type: "text", text: "No libraries found." }] };
      }

      const lines = libraries.map((lib) => {
        const formats = lib.allowedFormats?.join(", ") ?? "all";
        return `• [${lib.id}] ${lib.name} — ${lib.bookCount} book(s), formats: ${formats}`;
      });

      return { content: [{ type: "text", text: [`${libraries.length} ${pluralize(libraries.length, "library", "libraries")}:`, "", ...lines].join("\n") }] };
    })
  );
}

// ---------------------------------------------------------------------------
// get_library_books
// ---------------------------------------------------------------------------

function registerGetLibraryBooks(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "get_library_books",
    {
      description: "Browse books within a specific library with optional sorting and pagination.",
      inputSchema: z.object({
        ...PaginationSchema.shape,
        ...SortSchema.shape,
        sort: BookSortSchema,
        libraryId: z.number().int().positive().describe("The library ID (use list_libraries to find IDs)"),
      }),
    },
    wrapToolHandler(async ({ libraryId, sort, dir, page, size }) => {
      const result = await client.listBooks({ libraryId, sort, dir, page, size });

      const lines = [
        formatPageInfo(result, "book"),
        "",
        ...result.content.map(formatBookPage),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    })
  );
}

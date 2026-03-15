import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { formatBookSummary, formatPageInfo, pluralize } from "./format.js";
import { wrapToolHandler } from "./errors.js";
import { PaginationSchema } from "./schemas.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerShelfTools(server: McpServer, client: BookLoreClient): RegisteredTool[] {
  return [
    registerListShelves(server, client),
    registerListMagicShelves(server, client),
    registerGetMagicShelfBooks(server, client),
  ];
}

// ---------------------------------------------------------------------------
// list_shelves
// ---------------------------------------------------------------------------

function registerListShelves(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "list_shelves",
    {
      description: "List all user-created shelves in BookLore, including book counts.",
      inputSchema: z.object({}),
    },
    wrapToolHandler(async () => {
      const shelves = await client.listShelves();
      if (shelves.length === 0) {
        return { content: [{ type: "text", text: "No shelves found." }] };
      }

      const lines = shelves.map((shelf) => {
        const visibility = shelf.publicShelf ? "public" : "private";
        return `• [${shelf.id}] ${shelf.name} — ${shelf.bookCount} book(s), ${visibility}`;
      });

      return {
        content: [{ type: "text", text: [`${shelves.length} ${pluralize(shelves.length, "shelf", "shelves")}:`, "", ...lines].join("\n") }],
      };
    })
  );
}

// ---------------------------------------------------------------------------
// list_magic_shelves
// ---------------------------------------------------------------------------

function registerListMagicShelves(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "list_magic_shelves",
    {
      description:
        "List all smart/magic shelves in BookLore. Magic shelves are automatically populated " +
        "based on rules (e.g. 'Recently Added', 'Currently Reading'). " +
        "Use get_magic_shelf_books to browse their contents.",
      inputSchema: z.object({}),
    },
    wrapToolHandler(async () => {
      const shelves = await client.listMagicShelves();
      if (shelves.length === 0) {
        return { content: [{ type: "text", text: "No magic shelves found." }] };
      }

      const lines = shelves.map((shelf) => {
        const visibility = shelf.publicShelf ? "public" : "private";
        return `• [${shelf.id}] ${shelf.name} — ${visibility}`;
      });

      return {
        content: [{ type: "text", text: [`${shelves.length} magic ${pluralize(shelves.length, "shelf", "shelves")}:`, "", ...lines].join("\n") }],
      };
    })
  );
}

// ---------------------------------------------------------------------------
// get_magic_shelf_books
// ---------------------------------------------------------------------------

function registerGetMagicShelfBooks(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "get_magic_shelf_books",
    {
      description: "Get books from a specific magic/smart shelf by its ID.",
      inputSchema: z.object({
        ...PaginationSchema.shape,
        magicShelfId: z.number().int().positive().describe("The magic shelf ID (use list_magic_shelves to find IDs)"),
      }),
    },
    wrapToolHandler(async ({ magicShelfId, page, size }) => {
      const result = await client.getMagicShelfBooks(magicShelfId, { page, size });

      const lines = [
        formatPageInfo(result, "book"),
        "",
        ...result.content.map(formatBookSummary),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    })
  );
}

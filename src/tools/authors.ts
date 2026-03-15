import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { formatBookSummary, formatPageInfo } from "./format.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerAuthorTools(server: McpServer, client: BookLoreClient): void {
  registerListAuthors(server, client);
  registerGetAuthor(server, client);
  registerGetAuthorBooks(server, client);
}

// ---------------------------------------------------------------------------
// list_authors
// ---------------------------------------------------------------------------

function registerListAuthors(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "list_authors",
    {
      description: "List or search authors in your BookLore library.",
      inputSchema: z.object({
        search: z.string().optional().describe("Search by author name"),
        libraryId: z.number().int().positive().optional().describe("Filter by library ID"),
        hasPhoto: z.boolean().optional().describe("Filter to authors with profile photos only"),
        sort: z.string().optional().describe("Sort field (e.g. 'name', 'bookCount')"),
        dir: z.enum(["asc", "desc"]).optional().describe("Sort direction: asc or desc"),
        page: z.number().int().min(0).optional().default(0).describe("Page number (0-indexed)"),
        size: z.number().int().min(1).max(100).optional().default(20).describe("Page size (1–100)"),
      }),
    },
    async ({ search, libraryId, hasPhoto, sort, dir, page, size }) => {
      const result = await client.listAuthors({ search, libraryId, hasPhoto, sort, dir, page, size });

      if (result.content.length === 0) {
        return { content: [{ type: "text", text: "No authors found matching your criteria." }] };
      }

      const authorLines = result.content.map((a) => {
        const photo = a.hasPhoto ? " 📷" : "";
        return `• [${a.id}] ${a.name}${photo} — ${a.bookCount} book(s)`;
      });

      const lines = [formatPageInfo(result, "author"), "", ...authorLines];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

// ---------------------------------------------------------------------------
// get_author
// ---------------------------------------------------------------------------

function registerGetAuthor(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "get_author",
    {
      description: "Get detailed information about a specific author by ID.",
      inputSchema: z.object({
        authorId: z.number().int().positive().describe("The author ID (use list_authors to find IDs)"),
      }),
    },
    async ({ authorId }) => {
      const author = await client.getAuthor(authorId);

      const lines = [
        `**${author.name}**`,
        `Books: ${author.bookCount}`,
      ];

      if (author.description) {
        lines.push("", author.description);
      }

      if (author.asin) {
        lines.push("", `Amazon ASIN: ${author.asin}`);
      }

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

// ---------------------------------------------------------------------------
// get_author_books
// ---------------------------------------------------------------------------

function registerGetAuthorBooks(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "get_author_books",
    {
      description: "Get all books by a specific author.",
      inputSchema: z.object({
        authors: z.string().describe("Author name to filter by (use list_authors to find exact names)"),
        libraryId: z.number().int().positive().optional().describe("Filter by library ID"),
        sort: z.string().optional().describe("Sort field (e.g. 'title', 'addedOn')"),
        dir: z.enum(["asc", "desc"]).optional().describe("Sort direction: asc or desc"),
        page: z.number().int().min(0).optional().default(0).describe("Page number (0-indexed)"),
        size: z.number().int().min(1).max(100).optional().default(50).describe("Page size (1–100)"),
      }),
    },
    async ({ authors, libraryId, sort, dir, page, size }) => {
      const result = await client.listBooks({ authors, libraryId, sort, dir, page, size });

      const lines = [
        `Books by "${authors}":`,
        formatPageInfo(result, "book"),
        "",
        ...result.content.map(formatBookSummary),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

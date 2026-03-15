import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { formatPageInfo, formatBookPage } from "./format.js";
import { wrapToolHandler } from "./errors.js";
import { PaginationSchema, SortSchema } from "./schemas.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerAuthorTools(server: McpServer, client: BookLoreClient): RegisteredTool[] {
  return [
    registerListAuthors(server, client),
    registerGetAuthor(server, client),
    registerGetAuthorBooks(server, client),
  ];
}

// ---------------------------------------------------------------------------
// list_authors
// ---------------------------------------------------------------------------

function registerListAuthors(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "list_authors",
    {
      description: "List or search authors in your BookLore library.",
      inputSchema: z.object({
        ...PaginationSchema.shape,
        ...SortSchema.shape,
        // P3-H: narrow sort to known valid values for the authors endpoint
        sort: z
          .enum(["name", "bookCount"])
          .optional()
          .describe("Sort field: name or bookCount"),
        search: z.string().optional().describe("Search by author name"),
        libraryId: z.number().int().positive().optional().describe("Filter by library ID"),
        hasPhoto: z.boolean().optional().describe("Filter to authors with profile photos only"),
      }),
    },
    wrapToolHandler(async ({ search, libraryId, hasPhoto, sort, dir, page, size }) => {
      const result = await client.listAuthors({ search, libraryId, hasPhoto, sort, dir, page, size });

      if (result.content.length === 0) {
        return { content: [{ type: "text", text: "No authors found matching your criteria." }] };
      }

      const authorLines = result.content.map((a) => {
        const photo = a.hasPhoto ? " [photo]" : "";
        return `• [${a.id}] ${a.name}${photo} — ${a.bookCount} book(s)`;
      });

      const lines = [formatPageInfo(result, "author"), "", ...authorLines];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    })
  );
}

// ---------------------------------------------------------------------------
// get_author
// ---------------------------------------------------------------------------

function registerGetAuthor(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "get_author",
    {
      description: "Get detailed information about a specific author by ID.",
      inputSchema: z.object({
        authorId: z.number().int().positive().describe("The author ID (use list_authors to find IDs)"),
      }),
    },
    wrapToolHandler(async ({ authorId }) => {
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
    })
  );
}

// ---------------------------------------------------------------------------
// get_author_books
// ---------------------------------------------------------------------------

function registerGetAuthorBooks(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "get_author_books",
    {
      description: "Get all books by a specific author.",
      inputSchema: z.object({
        ...PaginationSchema.shape,
        ...SortSchema.shape,
        // P2-C: authors is required — add .min(1) to reject empty strings
        authors: z.string().min(1).describe("Author name to filter by (use list_authors to find exact names)"),
        libraryId: z.number().int().positive().optional().describe("Filter by library ID"),
        // P3-H: narrow sort to known valid values for the books endpoint
        sort: z
          .enum(["title", "addedOn", "lastReadTime", "personalRating"])
          .optional()
          .describe("Sort field: title, addedOn, lastReadTime, or personalRating"),
        // size override: larger default for author book lists
        size: z.number().int().min(1).max(100).optional().default(50).describe("Page size (1–100)"),
      }),
    },
    wrapToolHandler(async ({ authors, libraryId, sort, dir, page, size }) => {
      const result = await client.listBooks({ authors, libraryId, sort, dir, page, size });

      const lines = [
        `Books by "${authors}":`,
        formatPageInfo(result, "book"),
        "",
        ...result.content.map((book) => formatBookPage(book)),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    })
  );
}

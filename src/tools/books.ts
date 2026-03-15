import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { ReadStatusSchema, BookFileTypeSchema } from "../types.js";
import { formatBookSummary, formatBookDetail, formatPageInfo } from "./format.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerBookTools(server: McpServer, client: BookLoreClient): void {
  registerSearchBooks(server, client);
  registerGetBook(server, client);
  registerUpdateBookRating(server, client);
  registerUpdateBookStatus(server, client);
  registerGetContinueReading(server, client);
  registerGetRecentlyAdded(server, client);
}

// ---------------------------------------------------------------------------
// search_books
// ---------------------------------------------------------------------------

function registerSearchBooks(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "search_books",
    {
      description:
        "Search and filter books in your BookLore library. Supports full-text search, " +
        "filtering by library, shelf, series, author, language, file type, rating, and read status. " +
        "Returns paginated results.",
      inputSchema: z.object({
        search: z.string().optional().describe("Full-text search across title, author, and description"),
        libraryId: z.number().int().positive().optional().describe("Filter by library ID"),
        shelfId: z.number().int().positive().optional().describe("Filter by shelf ID"),
        status: ReadStatusSchema.optional().describe(
          "Filter by read status: WANT_TO_READ, IN_PROGRESS, READ, or DNF"
        ),
        fileType: BookFileTypeSchema.optional().describe(
          "Filter by file type: EPUB, PDF, CBZ, CBR, CB7, MOBI, AZW3, MP3, M4B, M4A, or AUDIOBOOK"
        ),
        minRating: z.number().int().min(1).max(5).optional().describe("Minimum personal rating (1–5)"),
        maxRating: z.number().int().min(1).max(5).optional().describe("Maximum personal rating (1–5)"),
        authors: z.string().optional().describe("Filter by author name (comma-separated for multiple)"),
        language: z.string().optional().describe("Filter by language code (e.g. 'en', 'fr')"),
        sort: z
          .string()
          .optional()
          .describe("Sort field (e.g. 'title', 'addedOn', 'lastReadTime', 'personalRating')"),
        dir: z.enum(["asc", "desc"]).optional().describe("Sort direction: asc or desc"),
        page: z.number().int().min(0).optional().default(0).describe("Page number (0-indexed)"),
        size: z.number().int().min(1).max(100).optional().default(20).describe("Page size (1–100)"),
      }),
    },
    async (params) => {
      const result = await client.listBooks(params);

      const lines = [
        formatPageInfo(result, "book"),
        "",
        ...result.content.map(formatBookSummary),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

// ---------------------------------------------------------------------------
// get_book
// ---------------------------------------------------------------------------

function registerGetBook(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "get_book",
    {
      description:
        "Get full details for a specific book by its ID, including metadata, " +
        "reading progress, file information, shelves, and notebook statistics.",
      inputSchema: z.object({
        bookId: z.number().int().positive().describe("The BookLore book ID"),
      }),
    },
    async ({ bookId }) => {
      const book = await client.getBook(bookId);
      return { content: [{ type: "text", text: formatBookDetail(book) }] };
    }
  );
}

// ---------------------------------------------------------------------------
// update_book_rating
// ---------------------------------------------------------------------------

function registerUpdateBookRating(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "update_book_rating",
    {
      description: "Set a personal rating for a book (1–5 stars).",
      inputSchema: z.object({
        bookId: z.number().int().positive().describe("The BookLore book ID"),
        rating: z.number().int().min(1).max(5).describe("Rating from 1 (lowest) to 5 (highest)"),
      }),
    },
    async ({ bookId, rating }) => {
      await client.updateBookRating(bookId, rating);
      return {
        content: [{ type: "text", text: `Rating updated to ${rating}/5 for book ${bookId}.` }],
      };
    }
  );
}

// ---------------------------------------------------------------------------
// update_book_status
// ---------------------------------------------------------------------------

function registerUpdateBookStatus(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "update_book_status",
    {
      description: "Update the read status of a book.",
      inputSchema: z.object({
        bookId: z.number().int().positive().describe("The BookLore book ID"),
        status: ReadStatusSchema.describe(
          "Read status: WANT_TO_READ, IN_PROGRESS, READ, or DNF (Did Not Finish)"
        ),
      }),
    },
    async ({ bookId, status }) => {
      await client.updateBookStatus(bookId, status);
      return {
        content: [{ type: "text", text: `Status updated to "${status}" for book ${bookId}.` }],
      };
    }
  );
}

// ---------------------------------------------------------------------------
// get_continue_reading
// ---------------------------------------------------------------------------

function registerGetContinueReading(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "get_continue_reading",
    {
      description: "Get books that are currently in progress / ready to continue reading.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional().default(10).describe("Maximum number of books to return"),
      }),
    },
    async ({ limit }) => {
      const books = await client.getContinueReading(limit);
      if (books.length === 0) {
        return { content: [{ type: "text", text: "No books currently in progress." }] };
      }
      const lines = [`${books.length} book(s) in progress:`, "", ...books.map(formatBookSummary)];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

// ---------------------------------------------------------------------------
// get_recently_added
// ---------------------------------------------------------------------------

function registerGetRecentlyAdded(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "get_recently_added",
    {
      description: "Get the most recently added books across all libraries.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).optional().default(10).describe("Maximum number of books to return"),
      }),
    },
    async ({ limit }) => {
      const books = await client.getRecentlyAdded(limit);
      if (books.length === 0) {
        return { content: [{ type: "text", text: "No recently added books found." }] };
      }
      const lines = [`${books.length} recently added book(s):`, "", ...books.map(formatBookSummary)];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

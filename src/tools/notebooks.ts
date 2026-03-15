import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { formatPageInfo } from "./format.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerNotebookTools(server: McpServer, client: BookLoreClient): void {
  registerListNotebookBooks(server, client);
  registerGetBookNotebookEntries(server, client);
}

// ---------------------------------------------------------------------------
// list_notebook_books
// ---------------------------------------------------------------------------

function registerListNotebookBooks(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "list_notebook_books",
    {
      description:
        "List all books that have highlights or notes in your BookLore notebook. " +
        "Use get_book_notebook_entries to read the actual entries for a specific book.",
      inputSchema: z.object({
        search: z.string().optional().describe("Search by book title or author"),
        page: z.number().int().min(0).optional().default(0).describe("Page number (0-indexed)"),
        size: z.number().int().min(1).max(100).optional().default(20).describe("Page size (1–100)"),
      }),
    },
    async ({ search, page, size }) => {
      const result = await client.listNotebookBooks({ search, page, size });

      if (result.content.length === 0) {
        return { content: [{ type: "text", text: "No notebook entries found." }] };
      }

      const bookLines = result.content.map((b) => {
        const authors = b.authors?.join(", ") ?? "Unknown";
        return `• [${b.bookId}] ${b.bookTitle} — ${authors} | ${b.noteCount} note(s)/highlight(s)`;
      });

      const lines = [formatPageInfo(result, "book with notes"), "", ...bookLines];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

// ---------------------------------------------------------------------------
// get_book_notebook_entries
// ---------------------------------------------------------------------------

function registerGetBookNotebookEntries(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "get_book_notebook_entries",
    {
      description: "Get all highlights and notes for a specific book from the BookLore notebook.",
      inputSchema: z.object({
        bookId: z.number().int().positive().describe("The BookLore book ID"),
        search: z.string().optional().describe("Search within entries by text"),
        sort: z
          .enum(["date_desc", "date_asc"])
          .optional()
          .default("date_desc")
          .describe("Sort order: date_desc (newest first) or date_asc (oldest first)"),
        page: z.number().int().min(0).optional().default(0).describe("Page number (0-indexed)"),
        size: z.number().int().min(1).max(100).optional().default(50).describe("Page size (1–100)"),
      }),
    },
    async ({ bookId, search, sort, page, size }) => {
      const result = await client.getBookNotebookEntries(bookId, { search, sort, page, size });

      if (result.content.length === 0) {
        return {
          content: [{ type: "text", text: `No notebook entries found for book ${bookId}.` }],
        };
      }

      const entryLines = result.content.map((entry) => {
        const chapter = entry.chapterTitle ? ` [${entry.chapterTitle}]` : "";
        const date = entry.createdAt ? ` (${entry.createdAt.substring(0, 10)})` : "";
        const typeLabel = entry.type === "HIGHLIGHT" ? "📌" : "📝";

        const parts = [`${typeLabel} ${entry.type}${chapter}${date}`];
        if (entry.text) parts.push(`  "${entry.text}"`);
        if (entry.note) parts.push(`  Note: ${entry.note}`);

        return parts.join("\n");
      });

      const lines = [
        formatPageInfo(result, "entry"),
        "",
        ...entryLines.join("\n\n").split("\n"),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { formatPageInfo, formatNotebookEntry } from "./format.js";
import { wrapToolHandler } from "./errors.js";
import { PaginationSchema, withPageSizeDefault } from "./schemas.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerNotebookTools(server: McpServer, client: BookLoreClient): RegisteredTool[] {
  return [
    registerListNotebookBooks(server, client),
    registerGetBookNotebookEntries(server, client),
  ];
}

// ---------------------------------------------------------------------------
// list_notebook_books
// ---------------------------------------------------------------------------

function registerListNotebookBooks(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "list_notebook_books",
    {
      description:
        "List all books that have highlights or notes in your BookLore notebook. " +
        "Use get_book_notebook_entries to read the actual entries for a specific book.",
      inputSchema: z.object({
        ...PaginationSchema.shape,
        search: z.string().optional().describe("Search by book title or author"),
      }),
    },
    wrapToolHandler(async ({ search, page, size }) => {
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
    })
  );
}

// ---------------------------------------------------------------------------
// get_book_notebook_entries
// ---------------------------------------------------------------------------

const notebookEntriesSchema = withPageSizeDefault(
  z.object({
    ...PaginationSchema.shape,
    bookId: z.number().int().positive().describe("The BookLore book ID"),
    search: z.string().optional().describe("Search within entries by text"),
    sort: z
      .enum(["date_desc", "date_asc"])
      .optional()
      .default("date_desc")
      .describe("Sort order: date_desc (newest first) or date_asc (oldest first)"),
  }),
  50
);

function registerGetBookNotebookEntries(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "get_book_notebook_entries",
    {
      description: "Get all highlights and notes for a specific book from the BookLore notebook.",
      inputSchema: notebookEntriesSchema,
    },
    wrapToolHandler(async ({ bookId, search, sort, page, size }) => {
      const result = await client.getBookNotebookEntries(bookId, { search, sort, page, size });

      if (result.content.length === 0) {
        return {
          content: [{ type: "text", text: `No notebook entries found for book ${bookId}.` }],
        };
      }

      const entryLines = result.content.map(formatNotebookEntry);

      const lines = [
        formatPageInfo(result, "entry"),
        "",
        entryLines.join("\n\n"),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    })
  );
}

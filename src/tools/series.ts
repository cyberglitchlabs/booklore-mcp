import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { formatBookSummary, formatPageInfo } from "./format.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerSeriesTools(server: McpServer, client: BookLoreClient): void {
  registerListSeries(server, client);
  registerGetSeriesBooks(server, client);
}

// ---------------------------------------------------------------------------
// list_series
// ---------------------------------------------------------------------------

function registerListSeries(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "list_series",
    {
      description:
        "List or search book series in your BookLore library. " +
        "Shows each series with book count, reading progress, and authors.",
      inputSchema: z.object({
        search: z.string().optional().describe("Search by series name"),
        libraryId: z.number().int().positive().optional().describe("Filter by library ID"),
        status: z
          .literal("in-progress")
          .optional()
          .describe("Pass 'in-progress' to show only series you are currently reading"),
        sort: z.string().optional().describe("Sort field (e.g. 'seriesName', 'latestAddedOn')"),
        dir: z.enum(["asc", "desc"]).optional().describe("Sort direction: asc or desc"),
        page: z.number().int().min(0).optional().default(0).describe("Page number (0-indexed)"),
        size: z.number().int().min(1).max(100).optional().default(20).describe("Page size (1–100)"),
      }),
    },
    async ({ search, libraryId, status, sort, dir, page, size }) => {
      const result = await client.listSeries({ search, libraryId, status, sort, dir, page, size });

      if (result.content.length === 0) {
        return { content: [{ type: "text", text: "No series found matching your criteria." }] };
      }

      const seriesLines = result.content.map((s) => {
        const authors = s.authors?.join(", ") ?? "Unknown";
        const progress = `${s.booksRead}/${s.bookCount} read`;
        const total = s.seriesTotal != null ? ` (${s.seriesTotal} total planned)` : "";
        return `• ${s.seriesName} — ${authors} | ${progress}${total}`;
      });

      const lines = [formatPageInfo(result, "series"), "", ...seriesLines];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

// ---------------------------------------------------------------------------
// get_series_books
// ---------------------------------------------------------------------------

function registerGetSeriesBooks(server: McpServer, client: BookLoreClient): void {
  server.registerTool(
    "get_series_books",
    {
      description: "Get all books in a specific series, ordered by series number.",
      inputSchema: z.object({
        seriesName: z.string().describe("The exact series name (use list_series to find names)"),
        libraryId: z.number().int().positive().optional().describe("Filter by library ID"),
        sort: z.string().optional().describe("Sort field (default: series number)"),
        dir: z.enum(["asc", "desc"]).optional().describe("Sort direction: asc or desc"),
        page: z.number().int().min(0).optional().default(0).describe("Page number (0-indexed)"),
        size: z.number().int().min(1).max(100).optional().default(50).describe("Page size (1–100)"),
      }),
    },
    async ({ seriesName, libraryId, sort, dir, page, size }) => {
      const result = await client.getSeriesBooks(seriesName, { libraryId, sort, dir, page, size });

      const lines = [
        `Series: "${seriesName}"`,
        formatPageInfo(result, "book"),
        "",
        ...result.content.map(formatBookSummary),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );
}

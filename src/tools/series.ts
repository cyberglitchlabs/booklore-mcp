import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BookLoreClient } from "../client.js";
import { formatPageInfo, formatBookPage } from "./format.js";
import { wrapToolHandler } from "./errors.js";
import { PaginationSchema, SortSchema, SeriesSortSchema } from "./schemas.js";

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

export function registerSeriesTools(server: McpServer, client: BookLoreClient): RegisteredTool[] {
  return [
    registerListSeries(server, client),
    registerGetSeriesBooks(server, client),
  ];
}

// ---------------------------------------------------------------------------
// list_series
// ---------------------------------------------------------------------------

function registerListSeries(server: McpServer, client: BookLoreClient): RegisteredTool {
  return server.registerTool(
    "list_series",
    {
      description:
        "List or search book series in your BookLore library. " +
        "Shows each series with book count, reading progress, and authors.",
      inputSchema: z.object({
        ...PaginationSchema.shape,
        ...SortSchema.shape,
        sort: SeriesSortSchema,
        search: z.string().optional().describe("Search by series name"),
        libraryId: z.number().int().positive().optional().describe("Filter by library ID"),
        status: z
          .enum(["in-progress"])
          .optional()
          .describe("Pass 'in-progress' to show only series you are currently reading"),
      }),
    },
    wrapToolHandler(async ({ search, libraryId, status, sort, dir, page, size }) => {
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
    })
  );
}

// ---------------------------------------------------------------------------
// get_series_books
// ---------------------------------------------------------------------------

// Helper to apply a larger default page size while keeping pagination fields consistent.
function withLargerPageSize<T extends z.ZodRawShape>(
  base: z.ZodObject<T>,
  newDefault: number
): z.ZodObject<T & { size: z.ZodOptional<z.ZodNumber> }> {
  return base.extend({
    // Override the default page size with a custom value.
    size: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(newDefault)
      .describe("Page size (1–100)"),
  }) as unknown as z.ZodObject<T & { size: z.ZodOptional<z.ZodNumber> }>; // base already has size from PaginationSchema; extend replaces it
}

function registerGetSeriesBooks(server: McpServer, client: BookLoreClient): RegisteredTool {
  const baseSchema = z.object({
    ...PaginationSchema.shape,
    ...SortSchema.shape,
    // P2-C: seriesName is required — add .min(1) to reject empty strings
    seriesName: z.string().min(1).describe("The exact series name (use list_series to find names)"),
    libraryId: z.number().int().positive().optional().describe("Filter by library ID"),
  });

  return server.registerTool(
    "get_series_books",
    {
      description: "Get all books in a specific series, ordered by series number.",
      inputSchema: withLargerPageSize(baseSchema, 50),
    },
    wrapToolHandler(async ({ seriesName, libraryId, sort, dir, page, size }) => {
      const result = await client.getSeriesBooks(seriesName, { libraryId, sort, dir, page, size });

      const lines = [
        `Series: "${seriesName}"`,
        formatPageInfo(result, "book"),
        "",
        ...result.content.map((book) => formatBookPage(book)),
      ];

      return { content: [{ type: "text", text: lines.join("\n") }] };
    })
  );
}

import { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export type CategoryName = "books" | "libraries" | "shelves" | "series" | "authors" | "notebooks";
export type ToolRegistry = Record<CategoryName, RegisteredTool[]>;

export function registerMetaTool(server: McpServer, registry: ToolRegistry): void {
  server.registerTool(
    "use_booklore_category",
    {
      description:
        "Enable or disable a BookLore tool category to manage context usage. " +
        "Call this to activate a category before using its tools. " +
        "Categories: books (default: enabled), libraries, shelves, series, authors, notebooks. " +
        "After enabling, re-check your available tools on the next request.",
      inputSchema: z.object({
        category: z.enum(["books", "libraries", "shelves", "series", "authors", "notebooks"]),
        action: z.enum(["enable", "disable"]),
      }),
    },
    async ({ category, action }) => {
      const tools = registry[category as CategoryName];
      if (action === "enable") {
        tools.forEach((t) => t.enable());
        return {
          content: [
            {
              type: "text" as const,
              text:
                `BookLore "${category}" tools enabled (${tools.length} tools). ` +
                `Re-check your available tools on the next request.`,
            },
          ],
        };
      } else {
        tools.forEach((t) => t.disable());
        return {
          content: [
            {
              type: "text" as const,
              text: `BookLore "${category}" tools disabled.`,
            },
          ],
        };
      }
    }
  );
}

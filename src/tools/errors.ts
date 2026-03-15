import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// ---------------------------------------------------------------------------
// wrapToolHandler — universal error normalizer for MCP tool callbacks
//
// MCP tool handlers that throw unhandled errors will crash the server's
// request handler and surface as protocol-level failures to the AI client.
// This wrapper catches all errors, logs them to stderr (never stdout — stdout
// belongs to the MCP protocol), and returns a well-formed MCP error response
// so the AI client always receives a meaningful message rather than a broken
// protocol frame.
//
// Usage:
//   server.registerTool("my_tool", config, wrapToolHandler(async (args) => {
//     ...
//   }));
// ---------------------------------------------------------------------------

/**
 * The callback type that `server.registerTool()` / `server.tool()` expects.
 * Kept deliberately broad so the wrapper is compatible with any tool — whether
 * the handler receives `(args, extra)` or just `(extra)`.  TypeScript will
 * propagate the concrete arg types from the call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyToolCallback = (...args: any[]) => CallToolResult | Promise<CallToolResult>;

/**
 * Wraps a tool handler callback with uniform error handling.
 *
 * - On success: returns the result unchanged.
 * - On error:  logs the full error (including stack) to `process.stderr`, then
 *   returns an MCP error response with a sanitized, human-readable message.
 *   Raw stack traces are never forwarded to the AI client.
 *
 * @param fn - The tool handler to wrap.
 * @returns  A new handler with identical call signature but guarded execution.
 */
export function wrapToolHandler<T extends AnyToolCallback>(fn: T): T {
  const wrapped = async (...args: Parameters<T>): Promise<CallToolResult> => {
    try {
      return await fn(...args);
    } catch (err: unknown) {
      const message = extractErrorMessage(err);

      // Log full diagnostic detail to stderr — visible in MCP client logs
      // but never written to stdout (which would corrupt the MCP protocol).
      process.stderr.write(
        `[booklore-mcp] Tool handler error: ${message}\n` +
          (err instanceof Error && err.stack != null ? `${err.stack}\n` : "")
      );

      // Return a safe, sanitized error response to the AI client.
      // We surface the error message (not the stack) — informative but clean.
      return {
        content: [{ type: "text", text: `Tool error: ${message}` }],
        isError: true,
      };
    }
  };

  // Preserve the original function name in stack traces for easier debugging.
  Object.defineProperty(wrapped, "name", { value: fn.name || "wrappedToolHandler" });

  return wrapped as T;
}

/**
 * Extracts a human-readable message from an unknown thrown value.
 *
 * - `Error` instances: use `.message` (not `.stack` — no traces to client)
 * - Strings thrown directly: use as-is
 * - Anything else: safe fallback
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message || "An unexpected error occurred.";
  }
  if (typeof err === "string" && err.length > 0) {
    return err;
  }
  return "An unexpected error occurred.";
}

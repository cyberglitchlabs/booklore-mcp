import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const SERVER_NAME = "booklore-mcp";
const SERVER_VERSION = "0.1.0";

function createServer(): McpServer {
  return new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
}

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  // Connect transport — tools registered after this point are valid (lazy loading)
  await server.connect(transport);

  process.stderr.write(`${SERVER_NAME} v${SERVER_VERSION} running on stdio\n`);

  // TODO Phase 4: Post-connect library discovery + dynamic tool registration
}

main().catch((error: unknown) => {
  process.stderr.write(`Fatal error: ${String(error)}\n`);
  process.exit(1);
});

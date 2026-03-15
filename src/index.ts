import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfigFromEnv, BookLoreClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";

const SERVER_NAME = "booklore-mcp";
const SERVER_VERSION = "0.1.0";

function createServer(): McpServer {
  return new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });
}

async function main(): Promise<void> {
  const config = loadConfigFromEnv();
  const client = new BookLoreClient(config);
  const server = createServer();

  // Register all tools before connecting
  registerAllTools(server, client);

  // Connect transport — tools registered after this point are also valid (lazy loading)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(`${SERVER_NAME} v${SERVER_VERSION} running on stdio\n`);
  process.stderr.write(`Connected to BookLore at ${config.baseUrl}\n`);

  // Phase 5: Post-connect lazy loading
  // Fire-and-forget: verify connectivity and log library count
  verifyConnectivity(client).catch((err: unknown) => {
    process.stderr.write(`Warning: BookLore connectivity check failed: ${String(err)}\n`);
  });
}

async function verifyConnectivity(client: BookLoreClient): Promise<void> {
  const libraries = await client.listLibraries();
  process.stderr.write(
    `BookLore connectivity OK — ${libraries.length} library/libraries available\n`
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`Fatal error: ${String(error)}\n`);
  process.exit(1);
});

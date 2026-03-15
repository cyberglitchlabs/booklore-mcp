import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfigFromEnv, BookLoreClient, BookLoreConfig } from "./client.js";
import { registerAllTools } from "./tools/index.js";
import { registerMetaTool } from "./tools/meta.js";
const SERVER_VERSION = "1.0.2";
const SERVER_NAME = "booklore-mcp";

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

  // Register all tools; non-books categories disabled pre-connect
  const registry = registerAllTools(server, client);
  // Register the meta-tool that lets the LLM enable/disable categories
  registerMetaTool(server, registry);

  // Connect transport — tools registered after this point are also valid (lazy loading)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(`${SERVER_NAME} v${SERVER_VERSION} running on stdio\n`);
  process.stderr.write(`Connected to BookLore at ${config.baseUrl}\n`);

  // Authenticate (no-op in token mode; performs login in credential mode)
  // then verify connectivity — both are fire-and-forget post-connect
  authenticate(client, config)
    .then(() => verifyConnectivity(client))
    .catch((err: unknown) => {
      const isAuthErr =
        err instanceof Error &&
        (err.message.includes("401") || err.message.includes("authentication") || err.message.toLowerCase().includes("unauthorized"));
      const hint = isAuthErr
        ? "Check BOOKLORE_TOKEN / BOOKLORE_USERNAME / BOOKLORE_PASSWORD"
        : "Check BOOKLORE_BASE_URL and that BookLore is running and accessible";
      process.stderr.write(`Warning: BookLore startup check failed: ${String(err)}\n${hint}\n`);
    });
}

async function authenticate(
  client: BookLoreClient,
  config: BookLoreConfig
): Promise<void> {
  if (config.token) {
    process.stderr.write("BookLore: using static token auth\n");
    return;
  }
  await client.ensureAuthenticated();
}

async function verifyConnectivity(client: BookLoreClient): Promise<void> {
  const libraries = await client.listLibraries();
  process.stderr.write(
    `BookLore connectivity OK — ${libraries.length} ${libraries.length === 1 ? "library" : "libraries"} available\n`
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`Fatal error: ${String(error)}\n`);
  process.exit(1);
});

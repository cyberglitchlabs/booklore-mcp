import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // MCP protocol constraint: stdout belongs to the protocol.
      // All diagnostics must go to process.stderr.write() only.
      "no-console": "error",
    },
  },
  {
    // Exclude test files and config from strict project-typed linting
    files: ["src/**/*.test.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "no-console": "error",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  }
);

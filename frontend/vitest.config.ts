import path from "path";
import { defineConfig } from "vitest/config";

const NODE_TESTS = "src/**/*.node.test.ts";

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [NODE_TESTS],
        },
      },
      {
        // Binary/stream parsing needs native Blob streams and DecompressionStream, which jsdom lacks
        extends: true,
        test: { name: "node", environment: "node", include: [NODE_TESTS] },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/shared/components/ui/**", // generated shadcn components
        "**/types.ts",
        "**/*.d.ts",
        "**/__tests__/mocks/**",
        "src/test/**",
      ],
    },
  },
  resolve: {
    alias: [
      { find: "@/components", replacement: path.resolve(__dirname, "./src/shared/components") },
      { find: "@/lib", replacement: path.resolve(__dirname, "./src/shared/lib") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});

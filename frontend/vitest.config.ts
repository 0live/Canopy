import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
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

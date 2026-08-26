import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  {
    settings: { react: { version: "19.2" } },
  },
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    "**/.next/**",
    "**/coverage/**",
    "**/dist/**",
    "**/drizzle/**",
    "**/node_modules/**",
    "DuouOLingo/**",
  ]),
  {
    files: ["packages/**/*.ts"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

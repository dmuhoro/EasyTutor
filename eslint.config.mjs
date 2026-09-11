import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const nodeGlobals = {
  require: "readonly",
  module: "readonly",
  __dirname: "readonly",
  process: "readonly",
  exports: "readonly",
  console: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  Buffer: "readonly",
  URL: "readonly",
  fetch: "readonly",
  Headers: "readonly",
  FormData: "readonly",
  URLSearchParams: "readonly",
  Request: "readonly",
  Response: "readonly",
  bundle: "readonly",
  globalThis: "readonly",
  structuredClone: "readonly",
  performance: "readonly",
};

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "archive/**",
      ".expo/**",
      "coverage/**",
      "supabase/.temp/**",
      "*.config.{js,mjs,cjs}",
      "vitest.config.js",
      "eslint.config.mjs",
      "babel.config.js",
      "metro.config.js",
      "postcss.config.js",
      "app.json",
      "vercel.json",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: nodeGlobals,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: nodeGlobals,
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-undef": "off",
    },
  },
];
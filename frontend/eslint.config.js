import js from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.jsx", "**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-vars": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": ["warn", { varsIgnorePattern: "^_" }],
      "semi": ["error", "always"],
      "quotes": ["error", "double"],
      "eqeqeq": "error",
      "curly": "error",
      "no-restricted-imports": [
        "error",
        {
          "paths": [
            {
              "name": "./api",
              "importNames": ["api"],
              "message": "Import av 'api' från './api' är förbjuden. Använd 'fetch' direkt istället."
            },
            {
              "name": "/src/api.js",
              "importNames": ["api"],
              "message": "Import av 'api' från '/src/api.js' är förbjuden. Använd 'fetch' direkt istället."
            },
            {
              "name": "@/api",
              "importNames": ["api"],
              "message": "Import av 'api' från '@/api' är förbjuden. Använd 'fetch' direkt istället."
            },
            {
              "name": "src/api.js",
              "importNames": ["api"],
              "message": "Import av 'api' från 'src/api.js' är förbjuden. Använd 'fetch' direkt istället."
            },
            {
              "name": "./src/api",
              "importNames": ["api"],
              "message": "Import av 'api' från './src/api' är förbjuden. Använd 'fetch' direkt istället."
            }
          ]
        }
      ]
    },
  },
];

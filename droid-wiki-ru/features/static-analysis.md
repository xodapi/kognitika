# Статический анализ и качество кода (Static Analysis & Linting)

**Инструменты**: ESLint 9 + TypeScript ESLint + Prettier + Knip + Depcheck · **CI**: `pnpm lint` + `pnpm typecheck` · **IDE**: VS Code + ESLint extension

---

## Обзор инструментов

| Инструмент | Назначение | Конфиг | CI Gate |
|---|---|---|---|
| **ESLint 9** | Линтинг JS/TS/JSX/TSX, best practices, a11y | `eslint.config.js` (flat config) | `pnpm lint` |
| **TypeScript ESLint** | Type-aware правила (`no-floating-promises`, `await-thenable`, `no-unnecessary-condition`) | `eslint.config.js` | `pnpm lint` |
| **Prettier** | Форматирование (single quotes, trailing commas, printWidth=100) | `prettier.config.js` | `pnpm format:check` |
| **Knip** | Неиспользуемые файлы, экспорты, зависимости | `knip.config.js` | `pnpm knip` |
| **Depcheck** | Неиспользуемые npm-зависимости | `package.json` `depcheck` | `pnpm depcheck` |
| **TypeScript** | `tsc --noEmit` — полная типизация без генерации | `tsconfig.json` | `pnpm typecheck` |
| **Vitest** | Unit/Integration тесты + coverage gates | `vitest.config.ts` | `pnpm test --run` |

---

## Конфигурация ESLint (Flat Config)

### `eslint.config.js`
```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginJsxA11y from 'eslint-plugin-jsx-a11y';
import pluginImport from 'eslint-plugin-import';
import pluginUnusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';

export default tseslint.config(
  // Base ignores
  { ignores: ['dist/**', 'node_modules/**', '*.config.*', 'coverage/**', '.turbo/**'] },

  // Recommended configs
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  pluginReact.configs.recommended,
  pluginReact.configs['jsx-runtime'],
  pluginReactHooks.configs.recommended,
  pluginJsxA11y.configs.recommended,
  prettier,

  // Custom rules
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.node.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.browser, ...globals.node, ...globals.es2024 },
    },
    settings: {
      react: { version: '18.3' },
      'import/resolver': { typescript: { project: ['tsconfig.json', 'tsconfig.node.json'] } },
    },
    rules: {
      // TypeScript strictness
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],

      // Unused code
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Import ordering
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      }],

      // React
      'react/self-closing-comp': 'error',
      'react/jsx-no-useless-fragment': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Accessibility
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',

      // Consistency
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'curly': ['error', 'all'],
    },
  },

  // Test files - relaxed rules
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },

  // Config files - no type-checking
  {
    files: ['*.config.{js,ts}', '*.config.*'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  }
);
```

---

## TypeScript Config

### `tsconfig.json` (App)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@server/*": ["src/server/*"]
    },
    "types": ["vitest/globals", "@testing-library/jest-dom", "vite/client"]
  },
  "include": ["src/**/*", "src/test/**/*", "vitest.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### `tsconfig.node.json` (Node/Server/Config)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["node", "vitest/globals"]
  },
  "include": ["vite.config.ts", "vitest.config.ts", "playwright.config.ts", "eslint.config.js", "*.config.*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Prettier Config

### `prettier.config.js`
```javascript
export default {
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
  proseWrap: 'never',
  htmlWhitespaceSensitivity: 'css',
  plugins: ['prettier-plugin-organize-imports'],
  organizeImportsSkipDestructiveCodeActions: true,
};
```

---

## Knip Config

### `knip.config.js`
```javascript
export default {
  entry: ['src/main.tsx', 'src/server/index.ts', 'vite.config.ts', 'vitest.config.ts'],
  project: ['src/**/*.{ts,tsx}', '!src/test/**'],
  ignore: ['src/test/**', 'src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/*.spec.ts'],
  ignoreDependencies: ['@types/*', 'vitest', '@vitest/*', 'playwright', '@playwright/*'],
  rules: {
    dependencies: 'error',
    devDependencies: 'error',
    exports: 'error',
    files: 'error',
    types: 'error',
  },
};
```

---

## Команды (package.json scripts)

```json
{
  "scripts": {
    "lint": "eslint . --cache",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "knip": "knip",
    "depcheck": "depcheck",
    "check:all": "pnpm lint && pnpm typecheck && pnpm knip && pnpm depcheck",
    "check:ci": "pnpm lint && pnpm typecheck && pnpm test --run"
  }
}
```

---

## CI Integration (`.github/workflows/ci.yml`)

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm lint
      - name: Typecheck
        run: pnpm typecheck
      - name: Knip
        run: pnpm knip
      - name: Depcheck
        run: pnpm depcheck
      - name: Format check
        run: pnpm format:check
```

---

## VS Code Setup (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "eslint.enable": true,
  "eslint.experimental.useFlatConfig": true,
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.turbo": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  }
}
```

### Рекомендуемые расширения (`.vscode/extensions.json`)
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "usernamehw.errorlens"
  ]
}
```

---

## Правила работы с кодом

| Ситуация | Действие |
|---|---|
| **Новый файл** | `pnpm lint:fix` + `pnpm format` перед коммитом |
| **Рефакторинг** | Запускать `pnpm check:all` после изменений |
| **Новая зависимость** | `pnpm add <pkg>` → `pnpm knip` → проверить unused |
| **Удаление кода** | `pnpm knip` найдёт мёртвые экспорты/файлы |
| **CI падает на lint** | Не пушить `--no-verify` — чинить локально |

---

## Игнорирование (eslint-disable) — только с обоснованием

```typescript
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment — third-party lib без типов
const data = externalLib.parse(input);

// eslint-disable-next-line @typescript-eslint/require-await — намеренно sync для performance
function fastSync(x: number): number { return x * 2; }
```

**Запрещено**: отключать правила во всем файле без комментария с причиной и тикетом.

---

## Метрики качества (CI Gates)

| Метрика | Порог | Действие при провале |
|---|---|---|
| ESLint errors | 0 | Block merge |
| TypeScript errors | 0 | Block merge |
| Knip unused | 0 | Block merge |
| Depcheck unused deps | 0 | Warn (не блокирует) |
| Prettier | 0 diffs | Block merge |
| Test coverage (lines) | ≥ 85% | Block merge |
| Test coverage (branches) | ≥ 75% | Block merge |

---

## Troubleshooting

| Проблема | Решение |
|---|---|
| `tsc --noEmit` медленный | Использовать `tsc --noEmit --incremental` + кэш Turbo |
| Knip false positives | Добавить в `knip.config.js` `ignore` или `ignoreDependencies` |
| ESLint cache corruption | `rm -rf node_modules/.cache/eslint` |
| TypeScript project references | Убедиться, что `tsconfig.json` включает все подпроекты через `references` |

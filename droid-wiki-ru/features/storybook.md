# Storybook (Component Development & Documentation)

**Статус**: 🔄 **Planned** — подготовка к внедрению · **Порт**: 6006 · **Publish**: Chromatic / GitHub Pages

---

## Зачем нужен

| Цель | Как решает |
|---|---|
| **Изолированная разработка** | Компоненты в вакууме, без запуска всего приложения |
| **Визуальное тестирование** | Chromatic: скриншотные диффы на каждом PR |
| **Документация UI** | Автогенерация docs из пропсов (Controls, Docs) |
| **a11y testing** | `@storybook/addon-a11y` — axe-core в браузере |
| **Design System** | Единый источник правды для дизайнеров и разработчиков |
| **Regression prevention** | Interaction tests (play functions) + visual tests |

---

## Архитектура

```
.storybook/
├── main.ts              # Core config, addons, framework
├── preview.ts           # Global decorators, parameters, types
├── preview-head.html    # Head injections (fonts, CSS vars)
├── manager-head.html    # Manager UI customizations
└── preview-body.html    # Body injections

src/
├── components/
│   ├── ui/              # Primitive components (Button, Input, Card, etc.)
│   ├── trainers/        # Trainer-specific components
│   ├── game/            # Game UI (Timer, Score, Grid, etc.)
│   ├── feedback/        # Toast, Modal, ErrorBoundary
│   └── layout/          # Header, Footer, Container
└── stories/
    ├── *.stories.tsx    # Component stories
    └── *.mdx            # Documentation pages
```

---

## Конфигурация

### `.storybook/main.ts`

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    '@storybook/addon-viewport',
    'storybook-addon-paddings',
    'storybook-addon-backgrounds',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
    defaultName: 'Documentation',
  },
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    // Tailwind, path aliases, etc.
    return config;
  },
};

export default config;
```

### `.storybook/preview.ts`

```typescript
import type { Preview } from '@storybook/react';
import React from 'react';
import { ThemeProvider } from 'styled-components'; // или ваш theme provider
import { AuthProvider } from '@/providers/AuthProvider';
import { RouterProvider } from '@/providers/RouterProvider';
import { Toaster } from '@/components/ui/Toaster';
import '../src/styles/globals.css'; // Tailwind + CSS variables

// Global decorators
const decorators = [
  (Story) => (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <RouterProvider>
          <Story />
          <Toaster />
        </RouterProvider>
      </AuthProvider>
    </ThemeProvider>
  ),
];

// Global parameters
const preview: Preview = {
  decorators,
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
        { name: 'gray', value: '#f1f5f9' },
      ],
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '720px' } },
      },
    },
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'keyboard', enabled: true },
        ],
      },
    },
    themes: {
      default: 'light',
      list: [
        { name: 'light', class: 'light', color: '#ffffff' },
        { name: 'dark', class: 'dark', color: '#0f172a' },
      ],
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
```

---

## Компоненты: Примеры Stories

### Primitive: Button

```tsx
// src/components/ui/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { fn } from '@storybook/test';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Основная кнопка. Поддерживает варианты, размеры, состояния.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Визуальный вариант',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Размер кнопки',
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: 'Button', variant: 'default' },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      {['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'].map((v) => (
        <Button key={v} variant={v as any}>
          {v}
        </Button>
      ))}
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon"><Plus className="h-4 w-4" /></Button>
    </div>
  ),
};

export const Loading: Story = {
  args: { children: 'Loading...', loading: true },
};

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};

// Interaction test
export const ClickInteraction: Story = {
  args: { children: 'Click me', onClick: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
  },
};
```

### Trainer Component: SchulteGrid

```tsx
// src/components/trainers/SchulteGrid.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { SchulteGrid } from './SchulteGrid';
import { useSchulteEngine } from '@/hooks/useSchulteEngine';

const meta: Meta<typeof SchulteGrid> = {
  title: 'Trainers/SchulteGrid',
  component: SchulteGrid,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Сетка Шульте. Поддерживает 3x3, 4x4, 5x5, 6x6. Клавиатурная навигация: стрелки.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SchulteGrid>;

const mockEngine = {
  grid: Array.from({ length: 25 }, (_, i) => ({ value: i + 1, found: false, x: i % 5, y: Math.floor(i / 5) })),
  currentTarget: 1,
  foundCount: 0,
  startTime: Date.now(),
  onCellClick: () => {},
};

export const Default: Story = {
  args: {
    gridSize: 5,
    engine: mockEngine as any,
  },
};

export const Small3x3: Story = {
  args: { gridSize: 3, engine: { ...mockEngine, grid: Array.from({ length: 9 }, ...) } },
};

export const Large6x6: Story = {
  args: { gridSize: 6, engine: { ...mockEngine, grid: Array.from({ length: 36 }, ...) } },
};

export const PartialProgress: Story = {
  args: {
    gridSize: 5,
    engine: {
      ...mockEngine,
      foundCount: 12,
      grid: mockEngine.grid.map((c, i) => ({ ...c, found: i < 12 })),
    },
  },
};

export const Completed: Story = {
  args: {
    gridSize: 5,
    engine: {
      ...mockEngine,
      foundCount: 25,
      grid: mockEngine.grid.map(c => ({ ...c, found: true })),
    },
  },
};

// Keyboard navigation test
export const KeyboardNavigation: Story = {
  args: { gridSize: 5, engine: mockEngine },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const firstCell = canvas.getByRole('gridcell', { name: /Число 1/i });
    await userEvent.tab();
    expect(firstCell).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(canvas.getByRole('gridcell', { name: /Число 2/i })).toHaveFocus();
  },
};
```

### Complex: DailyPracticePanel

```tsx
// src/components/DailyPracticePanel.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { DailyPracticePanel } from './DailyPracticePanel';
import { mockDailyPlan } from '@/test/fixtures/daily-plans';

const meta: Meta<typeof DailyPracticePanel> = {
  title: 'Features/DailyPracticePanel',
  component: DailyPracticePanel,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DailyPracticePanel>;

export const Default: Story = {
  args: { plan: mockDailyPlan },
};

export const AllCompleted: Story = {
  args: {
    plan: { ...mockDailyPlan, tasks: mockDailyPlan.tasks.map(t => ({ ...t, completed: true })) },
  },
};

export const EmptyState: Story = {
  args: { plan: { date: new Date().toISOString(), tasks: [], streak: 0 } },
};

export const LongStreak: Story = {
  args: { plan: { ...mockDailyPlan, streak: 47 } },
};
```

---

## Addons & Features

| Addon | Назначение | Конфиг |
|---|---|---|
| **@storybook/addon-a11y** |axe-core accessibility audit | `parameters.a11y` в preview.ts |
| **@storybook/addon-viewport** | Responsive testing | `parameters.viewport` |
| **@storybook/addon-themes** | Theme switching | `globalTypes.theme` |
| **@storybook/addon-interactions** | Play functions, userEvent | `play` в story |
| **storybook-addon-paddings** | Padding controls | Toolbar button |
| **storybook-addon-backgrounds** | Background colors | `parameters.backgrounds` |
| **@storybook/addon-links** | Navigate between stories | Auto |

---

## Visual Regression (Chromatic)

### Setup

```bash
# Install
pnpm add -D chromatic

# Run (local)
pnpm chromatic --project-token=<TOKEN>

# CI (GitHub Actions)
```

### `.github/workflows/chromatic.yml`

```yaml
name: Chromatic
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: build:storybook
          onlyChanged: true
          autoAcceptChanges: main
          exitZeroOnChanges: true
```

### Baselines

| Branch | Baseline |
|---|---|
| `main` | Авто-обновляется при merge |
| PR | Сравнивается с `main` baseline |
| `develop` | Отдельный baseline (опционально) |

---

## Testing in Storybook

### Interaction Tests (Vitest + Storybook)

```tsx
// src/components/ui/Button.test.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { within, userEvent } from '@storybook/test';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
};

export default meta;

export const ClickTest: StoryObj<typeof Button> = {
  args: { children: 'Click me', onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    await userEvent.click(button);
    expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const KeyboardTest: StoryObj<typeof Button> = {
  args: { children: 'Submit', onClick: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    await userEvent.tab(); // focus
    await userEvent.keyboard('{Enter}');
    expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
```

### Run Tests

```bash
# Storybook test runner (Vitest based)
pnpm test:storybook

# With UI
pnpm test:storybook --ui
```

---

## Documentation (MDX)

```mdx
<!-- src/stories/DesignSystem/Buttons.mdx -->
import { Meta, Title, Primary, Canvas, ArgsTable } from '@storybook/blocks';
import { Button } from '@/components/ui/Button';
import * as ButtonStories from '@/components/ui/Button.stories';

<Meta title="Design System/Buttons" component={Button} />

# Кнопки (Buttons)

Основной интерактивный элемент интерфейса.

## Варианты

<Canvas>
  <ButtonStories.AllVariants />
</Canvas>

## Размеры

<Canvas>
  <ButtonStories.AllSizes />
</Canvas>

## Props

<ArgsTable of={Button} />

## Доступность

- `role="button"` по умолчанию
- `aria-disabled` при `disabled`
- `aria-busy` при `loading`
- Фокус: `focus-visible:ring-2`
```

---

## CI Integration

```yaml
# .github/workflows/storybook.yml
name: Storybook
on:
  pull_request:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:storybook
      - uses: actions/upload-artifact@v4
        with:
          name: storybook-static
          path: storybook-static
          retention-days: 7

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:storybook --ci
```

---

## Команды

```json
// package.json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build:storybook": "storybook build",
    "test:storybook": "test-storybook",
    "chromatic": "chromatic"
  }
}
```

---

## Deployment

| Target | Command | URL |
|---|---|---|
| **Local** | `pnpm storybook` | http://localhost:6006 |
| **GitHub Pages** | `pnpm build:storybook` + deploy `storybook-static/` | https://xodapi.github.io/kognitika-storybook/ |
| **Chromatic** | `pnpm chromatic` | https://chromatic.com/library/... |
| **Netlify/Vercel** | Connect repo, build command `pnpm build:storybook` | Custom domain |

---

## Best Practices

| Практика | Почему |
|---|---|
| **Одна история на компонент** | `Component.stories.tsx` рядом с компонентом |
| **Автодокументация** | `tags: ['autodocs']` + `ArgsTable` |
| **Реальные данные** | Используй fixtures из `src/test/fixtures/` |
| **Изоляция** | Мокай провайдеры через decorators, не в story |
| **Плей-функции** | Для interaction tests, не для setup |
| **Версионирование** | Stories в git = история изменений UI |
| **Review в PR** | Chromatic link в PR description |

---

## Файлы

| Путь | Назначение |
|---|---|
| `.storybook/main.ts` | Core config |
| `.storybook/preview.ts` | Global decorators, parameters |
| `.storybook/preview-head.html` | Fonts, CSS vars |
| `src/components/**/*.stories.tsx` | Component stories |
| `src/stories/**/*.mdx` | Documentation pages |
| `.github/workflows/chromatic.yml` | Visual regression CI |
| `.github/workflows/storybook.yml` | Build + test CI |

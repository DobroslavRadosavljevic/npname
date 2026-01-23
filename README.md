# 📦 npm-ts-start

A minimal starter template for creating npm packages in pure TypeScript.

## ✨ Features

- 🔷 **TypeScript** - Write type-safe code with full TypeScript support
- ⚡ **tsdown** - Fast bundling powered by Rolldown
- 🧪 **Bun Test** - Fast built-in test runner
- 🎨 **Ultracite** - Zero-config linting and formatting with Oxlint + Oxfmt
- 📦 **ESM** - Ships as ES modules with TypeScript declarations

## 🚀 Getting Started

1. Clone or use this template:

```bash
git clone https://github.com/dobroslavradosavljevic/npm-ts-start.git my-package
cd my-package
```

1. Update `package.json` with your package name, description, and author info.

1. Install dependencies:

```bash
bun install
```

1. Start developing in `src/index.ts`.

## 📜 Scripts

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `bun run build`     | Build the package                 |
| `bun run dev`       | Build in watch mode               |
| `bun run test`      | Run tests                         |
| `bun run lint`      | Check for linting issues          |
| `bun run format`    | Fix linting and formatting issues |
| `bun run typecheck` | Run TypeScript type checking      |

## 📁 Project Structure

```txt
├── src/
│   └── index.ts        # Package entry point
├── dist/               # Build output (generated)
├── tsdown.config.ts    # Build configuration
├── tsconfig.json       # TypeScript configuration
└── package.json
```

## 🚢 Publishing

1. Update the version:

```bash
bunx bumpp
```

1. Publish to npm:

```bash
bun publish
```

## 📄 License

MIT

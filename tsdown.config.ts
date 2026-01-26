import { defineConfig } from "tsdown";

export default defineConfig([
  {
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    format: "esm",
  },
  {
    banner: "#!/usr/bin/env node",
    clean: false,
    dts: false,
    entry: { cli: "src/cli/index.ts" },
    format: "esm",
  },
]);

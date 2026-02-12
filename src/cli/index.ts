import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import { fileURLToPath } from "node:url";

import type { CliFlags } from "./types";

import { runCheck } from "./commands/check";
import { runFullCheck } from "./commands/full-check";
import { runValidate } from "./commands/validate";
import { EXIT_CODES } from "./constants";

/**
 * Find and read version from package.json by traversing up from current file.
 */
const getVersion = (): string => {
  let dir = dirname(fileURLToPath(import.meta.url));
  const { root } = parse(dir);
  while (dir !== root) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        version?: string;
      };
      return pkg.version ?? "0.0.0";
    }
    dir = dirname(dir);
  }
  return "0.0.0";
};

const isPositiveInteger = (value: number): boolean =>
  Number.isFinite(value) && Number.isInteger(value) && value > 0;

const main = defineCommand({
  args: {
    check: {
      alias: "c",
      default: false,
      description: "Full check: validate + availability + details",
      type: "boolean",
    },
    concurrency: {
      default: "4",
      description: "Parallel requests for batch checks",
      type: "string",
    },
    json: {
      alias: "j",
      default: false,
      description: "Output as JSON",
      type: "boolean",
    },
    names: {
      description: "Package name(s) to check",
      required: true,
      type: "positional",
    },
    quiet: {
      alias: "q",
      default: false,
      description: "Minimal output",
      type: "boolean",
    },
    registry: {
      alias: "r",
      description: "Custom registry URL",
      type: "string",
    },
    timeout: {
      alias: "t",
      default: "10000",
      description: "Request timeout in milliseconds",
      type: "string",
    },
    validate: {
      alias: "v",
      default: false,
      description: "Only validate name(s), no network check",
      type: "boolean",
    },
  },
  meta: {
    description:
      "Validate npm package names and check availability on the registry",
    name: "npname",
    version: getVersion(),
  },
  async run({ args }) {
    // Collect all positional arguments (citty puts all in _ when multiple provided)
    const allArgs = args._ as string[] | undefined;
    const names =
      allArgs && allArgs.length > 0 ? allArgs : [args.names as string];

    const flags: CliFlags = {
      check: args.check,
      concurrency: Number(args.concurrency),
      json: args.json,
      quiet: args.quiet,
      registry: args.registry,
      timeout: Number(args.timeout),
      validate: args.validate,
    };

    // Validate flags
    if (!isPositiveInteger(flags.concurrency)) {
      consola.error("--concurrency must be a positive integer");
      process.exitCode = EXIT_CODES.ERROR;
      return;
    }
    if (!isPositiveInteger(flags.timeout)) {
      consola.error("--timeout must be a positive integer");
      process.exitCode = EXIT_CODES.ERROR;
      return;
    }

    // Route to appropriate command
    if (flags.validate) {
      runValidate(names, flags);
    } else if (flags.check) {
      await runFullCheck(names, flags);
    } else {
      await runCheck(names, flags);
    }
  },
});

// eslint-disable-next-line jest/require-hook -- CLI entry point, not a test file
runMain(main);

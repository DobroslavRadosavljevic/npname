import { consola } from "consola";

import { check, validate } from "../../index";
import { type CliFlags, type CliResult } from "../types";
import { determineExitCode, outputResults, toCliResult } from "../utils/output";

/**
 * Process names with full detailed check (sequential).
 */
export const runFullCheck = async (
  names: string[],
  flags: CliFlags
): Promise<void> => {
  const showSpinner = !flags.quiet && !flags.json;
  const results: CliResult[] = [];

  for (const name of names) {
    if (showSpinner) {
      consola.start(`Checking ${name}...`);
    }

    try {
      const checkResult = await check(name, {
        registryUrl: flags.registry,
        timeout: flags.timeout,
      });

      results.push({
        available: checkResult.available,
        error: checkResult.error?.message,
        errors: checkResult.validation.errors,
        name: checkResult.name,
        suggestions: checkResult.validation.suggestions,
        valid: checkResult.validation.valid,
        validForNewPackages: checkResult.validation.validForNewPackages,
        warnings: checkResult.validation.warnings,
      });
    } catch (error) {
      if (showSpinner) {
        consola.fail(`Failed to check ${name}`);
      }
      results.push(
        toCliResult(
          name,
          validate(name),
          null,
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  outputResults(results, flags, "check");
  process.exitCode = determineExitCode(results, flags);
};

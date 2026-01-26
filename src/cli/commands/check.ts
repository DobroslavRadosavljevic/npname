import { consola } from "consola";

import type { ValidationResult } from "../../types";

import npname, { validate } from "../../index";
import { type CliFlags, type CliResult } from "../types";
import {
  determineExitCode,
  mergeResultsInOrder,
  outputResults,
  toCliResult,
} from "../utils/output";

/**
 * Check availability for valid names and return results.
 */
export const checkValidNamesAvailability = async (
  validNames: string[],
  validationMap: Map<string, ValidationResult>,
  flags: CliFlags,
  onError: () => void
): Promise<CliResult[]> => {
  if (validNames.length === 0) {
    return [];
  }

  try {
    const availabilityMap = await npname.many(validNames, {
      concurrency: flags.concurrency,
      registryUrl: flags.registry,
      timeout: flags.timeout,
    });

    return validNames.map((name) =>
      toCliResult(
        name,
        validationMap.get(name),
        availabilityMap.get(name) ?? null
      )
    );
  } catch (error) {
    onError();
    const errorMessage = error instanceof Error ? error.message : String(error);
    return validNames.map((name) =>
      toCliResult(name, validationMap.get(name), null, errorMessage)
    );
  }
};

/**
 * Process names for availability check (batch mode).
 */
export const runCheck = async (
  names: string[],
  flags: CliFlags
): Promise<void> => {
  const showSpinner = !flags.quiet && !flags.json;

  if (showSpinner) {
    consola.start("Checking availability...");
  }

  // First validate all names and store in a Map for efficient lookup
  const validationMap = new Map(names.map((name) => [name, validate(name)]));

  // Separate valid and invalid names
  const validNames = names.filter(
    (name) => validationMap.get(name)?.validForNewPackages
  );

  const invalidResults = new Map(
    names
      .filter((name) => !validationMap.get(name)?.validForNewPackages)
      .map((name) => [name, toCliResult(name, validationMap.get(name))])
  );

  // Check availability for valid names only
  const availabilityResults = await checkValidNamesAvailability(
    validNames,
    validationMap,
    flags,
    () => {
      if (showSpinner) {
        consola.fail("Failed to check availability");
      }
    }
  );

  const availabilityResultsMap = new Map(
    availabilityResults.map((r) => [r.name, r])
  );

  const results = mergeResultsInOrder(names, validationMap, [
    invalidResults,
    availabilityResultsMap,
  ]);

  outputResults(results, flags, "check");
  process.exit(determineExitCode(results, flags));
};

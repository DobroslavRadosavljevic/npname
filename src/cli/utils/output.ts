import { consola } from "consola";

import type { ValidationResult } from "../../types";

import { EXIT_CODES, SYMBOLS } from "../constants";
import { type CliFlags, type CliResult } from "../types";

/**
 * Convert a validation result to a CLI result.
 */
export const toCliResult = (
  name: string,
  validation: ValidationResult | undefined,
  available: boolean | null = null,
  error?: string
): CliResult => ({
  available,
  error,
  errors: validation?.errors ?? [],
  name,
  suggestions: validation?.suggestions,
  valid: validation?.valid ?? false,
  validForNewPackages: validation?.validForNewPackages ?? false,
  warnings: validation?.warnings ?? [],
});

/**
 * Merge results from multiple maps in order, with fallback.
 */
export const mergeResultsInOrder = (
  names: string[],
  validationMap: Map<string, ValidationResult>,
  resultMaps: Map<string, CliResult>[]
): CliResult[] =>
  names.map((name) => {
    for (const map of resultMaps) {
      const result = map.get(name);
      if (result) {
        return result;
      }
    }
    return toCliResult(name, validationMap.get(name));
  });

const printDetails = (result: CliResult): void => {
  for (const err of result.errors) {
    consola.log(`  ${SYMBOLS.invalid} ${err}`);
  }
  for (const warn of result.warnings) {
    consola.log(`  ${SYMBOLS.warning} ${warn}`);
  }
  if (result.suggestions && result.suggestions.length > 0) {
    consola.log("  Suggestions:");
    for (const sug of result.suggestions) {
      consola.log(`    ${SYMBOLS.info} ${sug}`);
    }
  }
};

const formatAvailabilityLine = (result: CliResult): void => {
  if (result.available === null) {
    consola.warn(`${SYMBOLS.warning} ${result.name} - unknown`);
  } else if (result.available) {
    consola.success(`${SYMBOLS.available} ${result.name} - available`);
  } else {
    consola.fail(`${SYMBOLS.unavailable} ${result.name} - unavailable`);
  }
  printDetails(result);
};

const formatValidationLine = (result: CliResult): void => {
  if (result.validForNewPackages) {
    consola.success(
      `${SYMBOLS.available} ${result.name} - valid for new packages`
    );
  } else if (result.valid) {
    consola.warn(
      `${SYMBOLS.warning} ${result.name} - valid for old packages only`
    );
  } else {
    consola.fail(`${SYMBOLS.invalid} ${result.name} - invalid`);
  }
  printDetails(result);
};

const formatResultLine = (
  result: CliResult,
  mode: "check" | "validate"
): void => {
  if (result.error) {
    consola.error(`${SYMBOLS.invalid} ${result.name} - ${result.error}`);
    return;
  }

  if (mode === "validate") {
    formatValidationLine(result);
  } else {
    formatAvailabilityLine(result);
  }
};

const outputJson = (results: CliResult[]): void => {
  const output = results.length === 1 ? results[0] : results;
  console.log(JSON.stringify(output, null, 2));
};

const outputQuiet = (results: CliResult[], isValidateMode: boolean): void => {
  const filtered = isValidateMode
    ? results.filter((r) => r.validForNewPackages)
    : results.filter((r) => r.available === true);
  const names = filtered.map((r) => r.name).join("\n");
  if (names) {
    console.log(names);
  }
};

const printCheckSummary = (results: CliResult[]): void => {
  const available = results.filter((r) => r.available === true).length;
  const taken = results.filter((r) => r.available === false).length;
  const errored = results.filter((r) => r.error).length;

  let summary = `${available} available, ${taken} taken`;
  if (errored > 0) {
    summary += `, ${errored} errored`;
  }
  consola.box(`Summary: ${summary}`);
};

const printValidateSummary = (results: CliResult[]): void => {
  const validForNew = results.filter((r) => r.validForNewPackages).length;
  const validOldOnly = results.filter(
    (r) => r.valid && !r.validForNewPackages
  ).length;
  const invalid = results.filter((r) => !r.valid).length;

  let summary = `${validForNew} valid`;
  if (validOldOnly > 0) {
    summary += `, ${validOldOnly} legacy only`;
  }
  summary += `, ${invalid} invalid`;
  consola.box(`Summary: ${summary}`);
};

const printSummary = (
  results: CliResult[],
  mode: "check" | "validate"
): void => {
  if (mode === "check") {
    printCheckSummary(results);
  } else {
    printValidateSummary(results);
  }
};

export const outputResults = (
  results: CliResult[],
  flags: CliFlags,
  mode: "check" | "validate"
): void => {
  if (flags.json) {
    outputJson(results);
    return;
  }

  if (flags.quiet) {
    outputQuiet(results, mode === "validate");
    return;
  }

  for (const result of results) {
    formatResultLine(result, mode);
  }

  if (results.length > 1) {
    console.log();
    printSummary(results, mode);
  }
};

export const determineExitCode = (
  results: CliResult[],
  flags: CliFlags
): number => {
  const hasErrors = results.some((r) => r.error !== undefined);
  if (hasErrors) {
    return EXIT_CODES.ERROR;
  }

  if (flags.validate) {
    const allValid = results.every((r) => r.validForNewPackages);
    return allValid ? EXIT_CODES.SUCCESS : EXIT_CODES.UNAVAILABLE;
  }

  const allAvailable = results.every((r) => r.available === true);
  return allAvailable ? EXIT_CODES.SUCCESS : EXIT_CODES.UNAVAILABLE;
};

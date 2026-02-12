import type { CliFlags } from "../types";

import { validate } from "../../index";
import { determineExitCode, outputResults, toCliResult } from "../utils/output";

/**
 * Process names for validation only (synchronous).
 */
export const runValidate = (names: string[], flags: CliFlags): void => {
  const results = names.map((name) => toCliResult(name, validate(name)));

  outputResults(results, flags, "validate");
  process.exitCode = determineExitCode(results, flags);
};

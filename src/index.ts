import { checkAvailability, checkAvailabilityMany } from "./available";
import {
  DEFAULT_REGISTRY,
  expandEnvVars,
  getAuthToken,
  getRegistryUrl,
  normalizeUrl,
  parseNpmrc,
} from "./registry";
import {
  InvalidNameError,
  type AvailabilityOptions,
  type CheckResult,
} from "./types";
import { isOrganization, isScoped, parseName, validate } from "./validate";

/**
 * Full check: validate and check availability.
 */
export const check = async (
  name: string,
  options?: AvailabilityOptions
): Promise<CheckResult> => {
  const validation = validate(name);

  if (!validation.validForNewPackages) {
    return {
      available: null,
      error: new InvalidNameError(
        `Invalid package name: ${name}`,
        validation.errors,
        validation.warnings
      ),
      name,
      validation,
    };
  }

  try {
    const available = await checkAvailability(name, options);
    return { available, name, validation };
  } catch (error) {
    return {
      available: null,
      error: error instanceof Error ? error : new Error(String(error)),
      name,
      validation,
    };
  }
};

export { isOrganization, isScoped, parseName, validate };
export { checkAvailability, checkAvailabilityMany };
export {
  DEFAULT_REGISTRY,
  expandEnvVars,
  getAuthToken,
  getRegistryUrl,
  normalizeUrl,
  parseNpmrc,
};
export type {
  AuthInfo,
  AvailabilityOptions,
  BatchOptions,
  CheckResult,
  ParsedName,
  ValidationResult,
} from "./types";
export { InvalidNameError };

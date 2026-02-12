import { describe, expect, it } from "bun:test";

import type { CliFlags, CliResult } from "../../src/cli/types";

import { EXIT_CODES } from "../../src/cli/constants";
import {
  determineExitCode,
  mergeResultsInOrder,
  toCliResult,
} from "../../src/cli/utils/output";
import { validate } from "../../src/index";

const createCliResult = (overrides: Partial<CliResult> = {}): CliResult => ({
  available: null,
  errors: [],
  name: "test-package",
  valid: true,
  validForNewPackages: true,
  warnings: [],
  ...overrides,
});

const createFlags = (overrides: Partial<CliFlags> = {}): CliFlags => ({
  check: false,
  concurrency: 5,
  json: false,
  quiet: false,
  timeout: 5000,
  validate: false,
  ...overrides,
});

describe("toCliResult", () => {
  it("should create a CLI result from validation result", () => {
    const validation = validate("valid-package");
    const result = toCliResult("valid-package", validation);

    expect(result.name).toBe("valid-package");
    expect(result.valid).toBe(true);
    expect(result.validForNewPackages).toBe(true);
    expect(result.available).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it("should set available when provided", () => {
    const validation = validate("valid-package");
    const result = toCliResult("valid-package", validation, true);

    expect(result.available).toBe(true);
  });

  it("should set error when provided", () => {
    const validation = validate("valid-package");
    const result = toCliResult(
      "valid-package",
      validation,
      null,
      "Network error"
    );

    expect(result.error).toBe("Network error");
  });

  it("should handle undefined validation", () => {
    // oxlint-disable-next-line unicorn/no-useless-undefined
    const result = toCliResult("test", undefined);

    expect(result.name).toBe("test");
    expect(result.valid).toBe(false);
    expect(result.validForNewPackages).toBe(false);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});

describe("mergeResultsInOrder", () => {
  it("should merge results in original order", () => {
    const names = ["first", "second", "third"];
    const validationMap = new Map(names.map((name) => [name, validate(name)]));
    const resultMap1 = new Map<string, CliResult>([
      ["first", createCliResult({ available: true, name: "first" })],
    ]);
    const resultMap2 = new Map<string, CliResult>([
      ["second", createCliResult({ available: false, name: "second" })],
      ["third", createCliResult({ available: true, name: "third" })],
    ]);

    const results = mergeResultsInOrder(names, validationMap, [
      resultMap1,
      resultMap2,
    ]);

    expect(results[0].name).toBe("first");
    expect(results[1].name).toBe("second");
    expect(results[2].name).toBe("third");
  });

  it("should use validation fallback when no result found", () => {
    const names = ["missing"];
    const validationMap = new Map([["missing", validate("missing")]]);

    const results = mergeResultsInOrder(names, validationMap, []);

    expect(results[0].name).toBe("missing");
    expect(results[0].available).toBeNull();
  });
});

describe("determineExitCode", () => {
  describe("success scenarios (exit code 0)", () => {
    it("should return SUCCESS when all packages are available in check mode", () => {
      const results = [
        createCliResult({ available: true, name: "pkg1" }),
        createCliResult({ available: true, name: "pkg2" }),
      ];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    });

    it("should return SUCCESS when all packages are valid in validate mode", () => {
      const results = [
        createCliResult({
          name: "pkg1",
          valid: true,
          validForNewPackages: true,
        }),
        createCliResult({
          name: "pkg2",
          valid: true,
          validForNewPackages: true,
        }),
      ];
      const flags = createFlags({ validate: true });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    });

    it("should return SUCCESS for single available package", () => {
      const results = [createCliResult({ available: true, name: "pkg" })];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    });
  });

  describe("unavailable scenarios (exit code 1)", () => {
    it("should return UNAVAILABLE when any package is unavailable in check mode", () => {
      const results = [
        createCliResult({ available: true, name: "pkg1" }),
        createCliResult({ available: false, name: "pkg2" }),
      ];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.UNAVAILABLE);
    });

    it("should return UNAVAILABLE when all packages are unavailable in check mode", () => {
      const results = [
        createCliResult({ available: false, name: "pkg1" }),
        createCliResult({ available: false, name: "pkg2" }),
      ];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.UNAVAILABLE);
    });

    it("should return UNAVAILABLE when any package is invalid in validate mode", () => {
      const results = [
        createCliResult({
          name: "valid",
          valid: true,
          validForNewPackages: true,
        }),
        createCliResult({
          name: "invalid",
          valid: false,
          validForNewPackages: false,
        }),
      ];
      const flags = createFlags({ validate: true });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.UNAVAILABLE);
    });

    it("should return UNAVAILABLE for old-only valid packages in validate mode", () => {
      const results = [
        createCliResult({
          name: "http",
          valid: true,
          validForNewPackages: false,
        }),
      ];
      const flags = createFlags({ validate: true });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.UNAVAILABLE);
    });

    it("should return UNAVAILABLE when availability is null in check mode", () => {
      const results = [createCliResult({ available: null, name: "pkg" })];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.UNAVAILABLE);
    });
  });

  describe("error scenarios (exit code 2)", () => {
    it("should return ERROR when any result has an error", () => {
      const results = [
        createCliResult({ available: true, name: "pkg1" }),
        createCliResult({ error: "Network error", name: "pkg2" }),
      ];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.ERROR);
    });

    it("should return ERROR when all results have errors", () => {
      const results = [
        createCliResult({ error: "Error 1", name: "pkg1" }),
        createCliResult({ error: "Error 2", name: "pkg2" }),
      ];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.ERROR);
    });

    it("should prioritize ERROR over UNAVAILABLE", () => {
      const results = [
        createCliResult({ available: false, name: "unavailable" }),
        createCliResult({ error: "Network error", name: "errored" }),
      ];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.ERROR);
    });

    it("should return ERROR for validation mode with errors", () => {
      const results = [
        createCliResult({
          error: "Validation error",
          name: "pkg",
          valid: false,
          validForNewPackages: false,
        }),
      ];
      const flags = createFlags({ validate: true });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.ERROR);
    });
  });

  describe("edge cases", () => {
    it("should handle empty results array as success in check mode", () => {
      const results: CliResult[] = [];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    });

    it("should handle empty results array as success in validate mode", () => {
      const results: CliResult[] = [];
      const flags = createFlags({ validate: true });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    });

    it("should treat undefined error as no error", () => {
      const results = [
        createCliResult({ available: true, error: undefined, name: "pkg" }),
      ];
      const flags = createFlags({ validate: false });

      const exitCode = determineExitCode(results, flags);

      expect(exitCode).toBe(EXIT_CODES.SUCCESS);
    });
  });
});

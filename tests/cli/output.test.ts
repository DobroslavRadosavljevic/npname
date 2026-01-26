import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

import { type CliFlags, type CliResult } from "../../src/cli/types";
import { outputResults } from "../../src/cli/utils/output";

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

describe("outputResults", () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let capturedOutput: string[];

  beforeEach(() => {
    capturedOutput = [];
    consoleLogSpy = spyOn(console, "log").mockImplementation(
      (...args: unknown[]) => {
        capturedOutput.push(args.map(String).join(" "));
      }
    );
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe("JSON output mode", () => {
    it("outputs single result as object", () => {
      const results = [createCliResult({ available: true, name: "my-pkg" })];
      const flags = createFlags({ json: true });

      outputResults(results, flags, "check");

      expect(capturedOutput).toHaveLength(1);
      const parsed = JSON.parse(capturedOutput[0]);
      expect(parsed.name).toBe("my-pkg");
      expect(parsed.available).toBe(true);
    });

    it("outputs multiple results as array", () => {
      const results = [
        createCliResult({ available: true, name: "pkg1" }),
        createCliResult({ available: false, name: "pkg2" }),
      ];
      const flags = createFlags({ json: true });

      outputResults(results, flags, "check");

      expect(capturedOutput).toHaveLength(1);
      const parsed = JSON.parse(capturedOutput[0]);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe("pkg1");
      expect(parsed[1].name).toBe("pkg2");
    });

    it("includes all result fields in JSON", () => {
      const results = [
        createCliResult({
          available: true,
          errors: ["error1"],
          name: "pkg",
          suggestions: ["suggestion1"],
          valid: true,
          validForNewPackages: true,
          warnings: ["warning1"],
        }),
      ];
      const flags = createFlags({ json: true });

      outputResults(results, flags, "check");

      const parsed = JSON.parse(capturedOutput[0]);
      expect(parsed.errors).toEqual(["error1"]);
      expect(parsed.warnings).toEqual(["warning1"]);
      expect(parsed.suggestions).toEqual(["suggestion1"]);
    });
  });

  describe("quiet mode for check", () => {
    it("outputs only available package names", () => {
      const results = [
        createCliResult({ available: true, name: "available-pkg" }),
        createCliResult({ available: false, name: "taken-pkg" }),
        createCliResult({ available: null, name: "unknown-pkg" }),
      ];
      const flags = createFlags({ quiet: true });

      outputResults(results, flags, "check");

      expect(capturedOutput).toHaveLength(1);
      expect(capturedOutput[0]).toBe("available-pkg");
    });

    it("outputs multiple available names on separate lines", () => {
      const results = [
        createCliResult({ available: true, name: "pkg1" }),
        createCliResult({ available: true, name: "pkg2" }),
        createCliResult({ available: false, name: "pkg3" }),
      ];
      const flags = createFlags({ quiet: true });

      outputResults(results, flags, "check");

      expect(capturedOutput).toHaveLength(1);
      expect(capturedOutput[0]).toBe("pkg1\npkg2");
    });

    it("outputs nothing when no packages available", () => {
      const results = [
        createCliResult({ available: false, name: "taken1" }),
        createCliResult({ available: false, name: "taken2" }),
      ];
      const flags = createFlags({ quiet: true });

      outputResults(results, flags, "check");

      expect(capturedOutput).toHaveLength(0);
    });
  });

  describe("quiet mode for validate", () => {
    it("outputs only valid package names", () => {
      const results = [
        createCliResult({
          name: "valid-pkg",
          valid: true,
          validForNewPackages: true,
        }),
        createCliResult({
          name: "invalid-pkg",
          valid: false,
          validForNewPackages: false,
        }),
      ];
      const flags = createFlags({ quiet: true });

      outputResults(results, flags, "validate");

      expect(capturedOutput).toHaveLength(1);
      expect(capturedOutput[0]).toBe("valid-pkg");
    });

    it("excludes legacy-only valid packages", () => {
      const results = [
        createCliResult({
          name: "new-valid",
          valid: true,
          validForNewPackages: true,
        }),
        createCliResult({
          name: "old-only",
          valid: true,
          validForNewPackages: false,
        }),
      ];
      const flags = createFlags({ quiet: true });

      outputResults(results, flags, "validate");

      expect(capturedOutput).toHaveLength(1);
      expect(capturedOutput[0]).toBe("new-valid");
    });

    it("outputs nothing when no valid packages", () => {
      const results = [
        createCliResult({
          name: "invalid",
          valid: false,
          validForNewPackages: false,
        }),
      ];
      const flags = createFlags({ quiet: true });

      outputResults(results, flags, "validate");

      expect(capturedOutput).toHaveLength(0);
    });
  });
});

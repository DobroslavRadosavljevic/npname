import { describe, expect, it, mock } from "bun:test";

import type { CliFlags } from "../../src/cli/types";
import type { ValidationResult } from "../../src/types";

import { checkValidNamesAvailability } from "../../src/cli/commands/check";

const createValidation = (
  overrides: Partial<ValidationResult> = {}
): ValidationResult => ({
  errors: [],
  suggestions: [],
  valid: true,
  validForNewPackages: true,
  validForOldPackages: true,
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

const noop = (): void => undefined;

describe("checkValidNamesAvailability", () => {
  it("returns empty array for empty input", async () => {
    const validationMap = new Map<string, ValidationResult>();
    const flags = createFlags();
    const onError = mock(noop);

    const results = await checkValidNamesAvailability(
      [],
      validationMap,
      flags,
      onError
    );

    expect(results).toEqual([]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("checks availability for valid names", async () => {
    const validationMap = new Map([
      ["unlikely-pkg-xyz123", createValidation()],
    ]);
    const flags = createFlags();
    const onError = mock(noop);

    const results = await checkValidNamesAvailability(
      ["unlikely-pkg-xyz123"],
      validationMap,
      flags,
      onError
    );

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("unlikely-pkg-xyz123");
    expect(results[0].available).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  it("checks availability for taken names", async () => {
    const validationMap = new Map([["lodash", createValidation()]]);
    const flags = createFlags();
    const onError = mock(noop);

    const results = await checkValidNamesAvailability(
      ["lodash"],
      validationMap,
      flags,
      onError
    );

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("lodash");
    expect(results[0].available).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it("handles multiple names", async () => {
    const validationMap = new Map([
      ["lodash", createValidation()],
      ["express", createValidation()],
    ]);
    const flags = createFlags();
    const onError = mock(noop);

    const results = await checkValidNamesAvailability(
      ["lodash", "express"],
      validationMap,
      flags,
      onError
    );

    expect(results).toHaveLength(2);
    expect(results[0].name).toBe("lodash");
    expect(results[1].name).toBe("express");
  });

  it("respects timeout option", async () => {
    const validationMap = new Map([["test-pkg", createValidation()]]);
    // Very short timeout to test the option is passed through
    const flags = createFlags({ timeout: 1 });
    const onError = mock(noop);

    const results = await checkValidNamesAvailability(
      ["test-pkg"],
      validationMap,
      flags,
      onError
    );

    expect(results).toHaveLength(1);
  });

  it("respects concurrency option", async () => {
    const names = ["lodash", "express", "react"];
    const validationMap = new Map(names.map((n) => [n, createValidation()]));
    const flags = createFlags({ concurrency: 1 });
    const onError = mock(noop);

    const results = await checkValidNamesAvailability(
      names,
      validationMap,
      flags,
      onError
    );

    expect(results).toHaveLength(3);
  });

  it("preserves order of results", async () => {
    const names = ["express", "lodash", "react"];
    const validationMap = new Map(names.map((n) => [n, createValidation()]));
    const flags = createFlags();
    const onError = mock(noop);

    const results = await checkValidNamesAvailability(
      names,
      validationMap,
      flags,
      onError
    );

    expect(results[0].name).toBe("express");
    expect(results[1].name).toBe("lodash");
    expect(results[2].name).toBe("react");
  });

  it("includes validation data in results", async () => {
    const validation = createValidation({
      warnings: ["test warning"],
    });
    const validationMap = new Map([["lodash", validation]]);
    const flags = createFlags();
    const onError = mock(noop);

    const results = await checkValidNamesAvailability(
      ["lodash"],
      validationMap,
      flags,
      onError
    );

    expect(results[0].warnings).toEqual(["test warning"]);
  });
});

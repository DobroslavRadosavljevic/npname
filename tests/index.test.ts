import { describe, expect, it } from "bun:test";

import { fn } from "../src";

describe("index", () => {
  it("should return 'Hello, tsdown!'", () => {
    expect(fn()).toBe("Hello, tsdown!");
  });
});

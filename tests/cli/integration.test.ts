import { describe, expect, it } from "bun:test";

const CLI = "./dist/cli.mjs";

const runCli = async (
  args: string[]
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const proc = Bun.spawn([CLI, ...args], {
    stderr: "pipe",
    stdout: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  return { exitCode, stderr, stdout };
};

describe("CLI Integration", () => {
  describe("validate mode (-v, --validate)", () => {
    it("exits 0 for valid package name", async () => {
      const { exitCode } = await runCli(["valid-package", "--validate"]);
      expect(exitCode).toBe(0);
    });

    it("exits 1 for invalid package name", async () => {
      const { exitCode } = await runCli(["INVALID", "--validate"]);
      expect(exitCode).toBe(1);
    });

    it("exits 1 for empty string", async () => {
      const { exitCode } = await runCli(["", "--validate"]);
      expect(exitCode).toBe(1);
    });

    it("outputs valid name in quiet mode", async () => {
      const { exitCode, stdout } = await runCli([
        "my-valid-pkg",
        "--validate",
        "--quiet",
      ]);
      expect(exitCode).toBe(0);
      expect(stdout.trim()).toBe("my-valid-pkg");
    });

    it("outputs nothing for invalid name in quiet mode", async () => {
      const { stdout } = await runCli(["INVALID", "--validate", "--quiet"]);
      expect(stdout.trim()).toBe("");
    });

    it("outputs JSON in json mode", async () => {
      const { exitCode, stdout } = await runCli([
        "test-pkg",
        "--validate",
        "--json",
      ]);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.name).toBe("test-pkg");
      expect(parsed.valid).toBe(true);
      expect(parsed.validForNewPackages).toBe(true);
    });

    it("handles multiple names", async () => {
      const { exitCode, stdout } = await runCli([
        "valid-one",
        "valid-two",
        "--validate",
        "--json",
      ]);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it("exits 1 if any name is invalid", async () => {
      const { exitCode } = await runCli(["valid-pkg", "INVALID", "--validate"]);
      expect(exitCode).toBe(1);
    });

    it("works with -v alias", async () => {
      const { exitCode } = await runCli(["valid-pkg", "-v"]);
      expect(exitCode).toBe(0);
    });
  });

  describe("check mode (default)", () => {
    it("checks availability by default", async () => {
      const { stdout } = await runCli(["lodash", "--json"]);
      const parsed = JSON.parse(stdout);
      expect(parsed.name).toBe("lodash");
      expect(parsed.available).toBe(false);
    });

    it("reports available for unlikely-to-exist name", async () => {
      const { exitCode, stdout } = await runCli([
        "xyzzy-unlikely-pkg-name-12345",
        "--json",
      ]);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.available).toBe(true);
    });

    it("handles invalid names gracefully", async () => {
      const { exitCode, stdout } = await runCli(["INVALID", "--json"]);
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(stdout);
      expect(parsed.valid).toBe(false);
    });

    it("handles multiple names in batch", async () => {
      const { stdout } = await runCli(["lodash", "express", "--json"]);
      const parsed = JSON.parse(stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });
  });

  describe("full-check mode (-c, --check)", () => {
    it("provides detailed check with --check flag", async () => {
      const { stdout } = await runCli(["lodash", "--check", "--json"]);
      const parsed = JSON.parse(stdout);
      expect(parsed.name).toBe("lodash");
      expect(parsed.available).toBe(false);
      expect(parsed.valid).toBe(true);
    });

    it("works with -c alias", async () => {
      const { stdout } = await runCli(["lodash", "-c", "--json"]);
      const parsed = JSON.parse(stdout);
      expect(parsed.name).toBe("lodash");
    });
  });

  describe("flag validation", () => {
    it("errors on invalid concurrency value", async () => {
      const { exitCode, stderr } = await runCli(["test", "--concurrency=0"]);
      expect(exitCode).toBe(2);
      expect(stderr).toContain("concurrency");
    });

    it("errors on negative concurrency", async () => {
      const { exitCode, stderr } = await runCli(["test", "--concurrency=-1"]);
      expect(exitCode).toBe(2);
      expect(stderr).toContain("concurrency");
    });

    it("errors on NaN concurrency", async () => {
      const { exitCode, stderr } = await runCli(["test", "--concurrency=abc"]);
      expect(exitCode).toBe(2);
      expect(stderr).toContain("concurrency");
    });

    it("errors on invalid timeout value", async () => {
      const { exitCode, stderr } = await runCli(["test", "--timeout=0"]);
      expect(exitCode).toBe(2);
      expect(stderr).toContain("timeout");
    });

    it("errors on negative timeout", async () => {
      const { exitCode, stderr } = await runCli(["test", "--timeout=-100"]);
      expect(exitCode).toBe(2);
      expect(stderr).toContain("timeout");
    });

    it("errors on NaN timeout", async () => {
      const { exitCode, stderr } = await runCli(["test", "--timeout=xyz"]);
      expect(exitCode).toBe(2);
      expect(stderr).toContain("timeout");
    });

    it("accepts valid concurrency", async () => {
      const { exitCode } = await runCli([
        "valid-pkg",
        "--validate",
        "--concurrency=10",
      ]);
      expect(exitCode).toBe(0);
    });

    it("accepts valid timeout", async () => {
      const { exitCode } = await runCli([
        "valid-pkg",
        "--validate",
        "--timeout=5000",
      ]);
      expect(exitCode).toBe(0);
    });
  });

  describe("version and help", () => {
    it("displays version with --version", async () => {
      const { stdout } = await runCli(["--version"]);
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("displays help with --help", async () => {
      const { stdout } = await runCli(["--help"]);
      expect(stdout).toContain("npname");
      expect(stdout).toContain("--validate");
      expect(stdout).toContain("--check");
      expect(stdout).toContain("--json");
      expect(stdout).toContain("--quiet");
    });
  });

  describe("quiet mode output (-q, --quiet)", () => {
    it("outputs only available names in check mode", async () => {
      const { stdout } = await runCli(["xyzzy-unlikely-pkg-12345", "--quiet"]);
      expect(stdout.trim()).toBe("xyzzy-unlikely-pkg-12345");
    });

    it("outputs nothing for taken packages in quiet mode", async () => {
      const { stdout } = await runCli(["lodash", "--quiet"]);
      expect(stdout.trim()).toBe("");
    });

    it("works with -q alias", async () => {
      const { stdout } = await runCli(["valid-pkg", "--validate", "-q"]);
      expect(stdout.trim()).toBe("valid-pkg");
    });
  });

  describe("custom registry (-r, --registry)", () => {
    it("accepts custom registry URL", async () => {
      const { exitCode } = await runCli([
        "test-pkg",
        "--validate",
        "--registry=https://registry.npmjs.org/",
      ]);
      expect(exitCode).toBe(0);
    });

    it("works with -r alias", async () => {
      const { exitCode } = await runCli([
        "test-pkg",
        "--validate",
        "-r",
        "https://registry.npmjs.org/",
      ]);
      expect(exitCode).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles scoped package names", async () => {
      const { exitCode, stdout } = await runCli([
        "@scope/package",
        "--validate",
        "--json",
      ]);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.name).toBe("@scope/package");
      expect(parsed.validForNewPackages).toBe(true);
    });

    it("handles package names with numbers", async () => {
      const { exitCode } = await runCli(["pkg123", "--validate"]);
      expect(exitCode).toBe(0);
    });

    it("handles package names with dots", async () => {
      const { exitCode } = await runCli(["my.package", "--validate"]);
      expect(exitCode).toBe(0);
    });

    it("rejects names with uppercase", async () => {
      const { exitCode, stdout } = await runCli([
        "MyPackage",
        "--validate",
        "--json",
      ]);
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(stdout);
      expect(parsed.valid).toBe(false);
    });

    it("rejects names starting with dot", async () => {
      const { exitCode } = await runCli([".hidden", "--validate"]);
      expect(exitCode).toBe(1);
    });

    it("rejects names starting with underscore", async () => {
      const { exitCode } = await runCli(["_private", "--validate"]);
      expect(exitCode).toBe(1);
    });
  });
});

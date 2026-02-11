export const EXIT_CODES = {
  ERROR: 2,
  SUCCESS: 0,
  UNAVAILABLE: 1,
} as const;

const supportsUnicode = (): boolean => {
  if (process.env.NPNAME_ASCII === "1") {
    return false;
  }

  if (process.platform !== "win32") {
    return true;
  }

  return Boolean(
    process.env.CI ||
    process.env.TERM_PROGRAM === "vscode" ||
    process.env.WT_SESSION ||
    process.env.ConEmuTask ||
    process.env.TERM?.includes("xterm")
  );
};

const unicodeSymbols = {
  available: "\u2714",
  info: "\u2139",
  invalid: "\u2716",
  unavailable: "\u2716",
  warning: "\u26A0",
} as const;

const asciiSymbols = {
  available: "+",
  info: "i",
  invalid: "x",
  unavailable: "x",
  warning: "!",
} as const;

export const SYMBOLS = supportsUnicode() ? unicodeSymbols : asciiSymbols;

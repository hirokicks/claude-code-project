import { loadTokens } from "../utils/loader.js";

/**
 * Get a token by dot-path (e.g. "color.primary.600", "spacing.4", "radius.lg")
 */
export function getToken(path: string): unknown {
  const tokens = loadTokens();
  const parts = path.split(".");

  let current: unknown = tokens;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }

  return current;
}

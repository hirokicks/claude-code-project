import { loadComponents } from "../utils/loader.js";
import type { ComponentMeta } from "../utils/types.js";

/**
 * Get a component by ID (e.g. "button", "card")
 */
export function getComponent(id: string): ComponentMeta | null {
  const data = loadComponents();
  return data.components.find((c) => c.id === id) ?? null;
}

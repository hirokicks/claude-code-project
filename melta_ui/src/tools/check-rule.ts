import { getProhibitionRules } from "../utils/loader.js";

export interface Violation {
  class: string;
  reason: string;
  alternative: string;
}

/**
 * Check a class string against prohibition rules.
 * Returns an array of violations found.
 */
export function checkRule(classes: string): Violation[] {
  const rules = getProhibitionRules();
  const violations: Violation[] = [];
  const classList = classes.split(/\s+/);

  for (const cls of classList) {
    for (const rule of rules) {
      if (cls.includes(rule.pattern)) {
        violations.push({
          class: cls,
          reason: rule.reason,
          alternative: rule.alternative,
        });
      }
    }
  }

  return violations;
}

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Tokens, ComponentsData, ScreensData, ProhibitionRule } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

let tokensCache: Tokens | null = null;
let componentsCache: ComponentsData | null = null;
let screensCache: ScreensData | null = null;

export function loadTokens(): Tokens {
  if (!tokensCache) {
    tokensCache = JSON.parse(
      readFileSync(resolve(root, "tokens/tokens.json"), "utf-8")
    );
  }
  return tokensCache!;
}

export function loadComponents(): ComponentsData {
  if (!componentsCache) {
    componentsCache = JSON.parse(
      readFileSync(resolve(root, "metadata/components.json"), "utf-8")
    );
  }
  return componentsCache!;
}

export function loadScreens(): ScreensData {
  if (!screensCache) {
    screensCache = JSON.parse(
      readFileSync(resolve(root, "metadata/screens.json"), "utf-8")
    );
  }
  return screensCache!;
}

/** Built-in prohibition rules extracted from foundations/prohibited.md */
export function getProhibitionRules(): ProhibitionRule[] {
  return [
    { pattern: "text-black", reason: "純黒はコントラストが強すぎる", alternative: "text-slate-900" },
    { pattern: "bg-gray-300", reason: "暗い背景でテキストコントラスト確保が困難", alternative: "bg-gray-50 〜 bg-gray-200" },
    { pattern: "bg-gray-400", reason: "暗い背景でテキストコントラスト確保が困難", alternative: "bg-gray-50 〜 bg-gray-200" },
    { pattern: "bg-gray-500", reason: "暗い背景でテキストコントラスト確保が困難", alternative: "bg-gray-50 〜 bg-gray-200" },
    { pattern: "text-gray-400", reason: "WCAG不適合（コントラスト比不足）", alternative: "text-body (#3d4b5f)" },
    { pattern: "border-gray-100", reason: "薄すぎて境界が見えない", alternative: "border-slate-200" },
    { pattern: "bg-green-", reason: "emeraldで統一", alternative: "bg-emerald-*" },
    { pattern: "bg-yellow-", reason: "amberで統一", alternative: "bg-amber-*" },
    { pattern: "bg-rose-", reason: "redで統一", alternative: "bg-red-*" },
    { pattern: "text-blue-", reason: "primaryで統一", alternative: "text-primary-500" },
    { pattern: "bg-indigo-", reason: "primaryで統一", alternative: "bg-primary-*" },
    { pattern: "tracking-tight", reason: "日本語の可読性低下", alternative: "tracking-normal以上" },
    { pattern: "font-light", reason: "細すぎて可読性が低い", alternative: "font-normal (400) 以上" },
    { pattern: "rounded-none", reason: "UIの統一感を損なう", alternative: "rounded-xl (cards)" },
    { pattern: "shadow-lg", reason: "影が強すぎてノイズ", alternative: "shadow-sm 〜 shadow-md" },
    { pattern: "shadow-2xl", reason: "影が強すぎてノイズ", alternative: "shadow-sm 〜 shadow-md" },
    { pattern: "duration-500", reason: "操作が鈍く感じる", alternative: "duration-300 以下" },
    { pattern: "duration-700", reason: "操作が鈍く感じる", alternative: "duration-300 以下" },
    { pattern: "duration-1000", reason: "操作が鈍く感じる", alternative: "duration-300 以下" },
  ];
}

/** Token value with Tailwind class mapping */
export interface TokenValue {
  value: string | number | string[];
  tailwind?: string;
  cssVar?: string;
  px?: number;
  rem?: string;
  size?: string;
  lineHeight?: string;
  [key: string]: unknown;
}

/** tokens.json root structure */
export interface Tokens {
  version: string;
  color: {
    primary: Record<string, TokenValue>;
    body: TokenValue;
    semantic: {
      light: Record<string, TokenValue>;
      dark: Record<string, TokenValue>;
    };
    status: Record<string, Record<string, TokenValue>>;
  };
  typography: {
    fontFamily: Record<string, TokenValue>;
    fontSize: Record<string, TokenValue>;
    fontWeight: Record<string, TokenValue>;
    letterSpacing: Record<string, TokenValue>;
    lineHeight: Record<string, TokenValue>;
  };
  spacing: Record<string, TokenValue>;
  elevation: Record<string, TokenValue>;
  radius: Record<string, TokenValue>;
  motion: {
    duration: Record<string, TokenValue>;
    easing: Record<string, TokenValue>;
  };
  zIndex: Record<string, TokenValue>;
  wireframe?: Record<string, TokenValue>;
}

/** Component variant */
export interface ComponentVariant {
  name: string;
  tailwind: string;
}

/** Component size */
export interface ComponentSize {
  name: string;
  tailwind: string;
}

/** Component accessibility spec */
export interface ComponentAccessibility {
  role: string;
  required: string[];
  focusRing: string;
}

/** Single component metadata */
export interface ComponentMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  docPath: string;
  variants: ComponentVariant[];
  sizes: ComponentSize[];
  accessibility: ComponentAccessibility;
  prohibited: string[];
  htmlSample: string | Record<string, string>;
}

/** components.json root structure */
export interface ComponentsData {
  version: string;
  components: ComponentMeta[];
}

/** Screen state (user-toggled via in-app UI) */
export interface ScreenState {
  id: string;
  label: string;
  query?: string;
}

/** Screen variant (system/data-driven condition) */
export interface ScreenVariant {
  id: string;
  label: string;
  query: string;
}

/** Screen pattern (design alternative for comparison) */
export interface ScreenPattern {
  id: string;
  label: string;
  description?: string;
  query: string;
  group?: string;
}

/** Single screen metadata */
export interface ScreenMeta {
  id: string;
  label: string;
  path: string;
  category?: string;
  states: ScreenState[];
  variants: ScreenVariant[];
  patterns: ScreenPattern[];
  linksTo: string[];
  components: string[];
}

/** screens.json root structure */
export interface ScreensData {
  version: string;
  screens: ScreenMeta[];
}

/** Prohibition rule for check_rule */
export interface ProhibitionRule {
  pattern: string;
  reason: string;
  alternative: string;
}

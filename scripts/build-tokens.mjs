import fs from "node:fs";
import path from "node:path";
import StyleDictionary from "style-dictionary";

const ROOT_DIR = process.cwd();
const TOKENS_DIR = path.join(ROOT_DIR, "src/tokens");
const DIST_DIR = path.join(ROOT_DIR, "dist");

/**
 * Auto-discover brands from src/tokens/brands/<brand-id>/brand.tokens.json
 */
export function discoverBrands(tokensDir = TOKENS_DIR) {
  const brandsDir = path.join(tokensDir, "brands");
  if (!fs.existsSync(brandsDir)) return [];
  const dirs = fs
    .readdirSync(brandsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  return dirs.map((dir, index) => {
    const brandFile = path.join(brandsDir, dir.name, "brand.tokens.json");
    const content = fs.existsSync(brandFile)
      ? JSON.parse(fs.readFileSync(brandFile, "utf8"))
      : {};
    const explicitDefault = content?.brand?.isDefault?.$value ?? content?.brand?.isDefault?.value;
    return {
      id: dir.name,
      name: content?.brand?.name?.$value || content?.brand?.name?.value || dir.name,
      isDefault:
        typeof explicitDefault === "boolean"
          ? explicitDefault
          : dir.name === "brand-alpha" || index === 0,
    };
  });
}

export const BRANDS = discoverBrands();

export const THEMES = [
  { id: "light", isDefault: true },
  { id: "dark", isDefault: false },
];

export const DENSITIES = [
  {
    id: "compact",
    isDefault: false,
    tokens: {
      "--ds-density-controlHeight-sm": "28px",
      "--ds-density-controlHeight-md": "34px",
      "--ds-density-controlHeight-lg": "40px",
      "--ds-density-containerPadding": "var(--ds-primitive-spacing-4)",
      "--ds-density-stackGap": "var(--ds-primitive-spacing-2-5)",
      "--ds-button-size-sm-height": "var(--ds-density-controlHeight-sm)",
      "--ds-button-size-md-height": "var(--ds-density-controlHeight-md)",
      "--ds-button-size-lg-height": "var(--ds-density-controlHeight-lg)",
      "--ds-input-height": "var(--ds-density-controlHeight-md)",
      "--ds-card-padding": "var(--ds-density-containerPadding)",
    },
  },
  {
    id: "default",
    isDefault: true,
    tokens: {
      "--ds-density-controlHeight-sm": "32px",
      "--ds-density-controlHeight-md": "40px",
      "--ds-density-controlHeight-lg": "48px",
      "--ds-density-containerPadding": "var(--ds-primitive-spacing-6)",
      "--ds-density-stackGap": "var(--ds-primitive-spacing-4)",
      "--ds-button-size-sm-height": "var(--ds-density-controlHeight-sm)",
      "--ds-button-size-md-height": "var(--ds-density-controlHeight-md)",
      "--ds-button-size-lg-height": "var(--ds-density-controlHeight-lg)",
      "--ds-input-height": "var(--ds-density-controlHeight-md)",
      "--ds-card-padding": "var(--ds-density-containerPadding)",
    },
  },
  {
    id: "spacious",
    isDefault: false,
    tokens: {
      "--ds-density-controlHeight-sm": "36px",
      "--ds-density-controlHeight-md": "46px",
      "--ds-density-controlHeight-lg": "54px",
      "--ds-density-containerPadding": "var(--ds-primitive-spacing-8)",
      "--ds-density-stackGap": "var(--ds-primitive-spacing-6)",
      "--ds-button-size-sm-height": "var(--ds-density-controlHeight-sm)",
      "--ds-button-size-md-height": "var(--ds-density-controlHeight-md)",
      "--ds-button-size-lg-height": "var(--ds-density-controlHeight-lg)",
      "--ds-input-height": "var(--ds-density-controlHeight-md)",
      "--ds-card-padding": "var(--ds-density-containerPadding)",
    },
  },
];

function isPlainObject(val) {
  return Boolean(val) && typeof val === "object" && !Array.isArray(val);
}

/**
 * Deeply merges nested token trees without clobbering sibling keys
 */
export function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(target[key])) {
      deepMerge(target[key], value);
    } else {
      target[key] = isPlainObject(value) ? deepMerge({}, value) : value;
    }
  }
  return target;
}

/**
 * Normalizes Tokens Studio legacy (value/type/description) & W3C DTCG ($value/$type/$description)
 * so any Tokens Studio JSON file works seamlessly in Style Dictionary v5.
 */
StyleDictionary.registerPreprocessor({
  name: "tokens-studio/dtcg-normalizer",
  preprocessor: (dictionary) => {
    const TYPE_MAP = {
      fontSizes: "dimension",
      fontFamilies: "fontFamily",
      fontWeights: "fontWeight",
      lineHeights: "number",
      letterSpacing: "dimension",
      spacing: "dimension",
      borderRadius: "dimension",
      borderWidth: "dimension",
      boxShadow: "shadow",
      sizing: "dimension",
      opacity: "number",
    };

    function walk(node, inheritedType = null) {
      if (!isPlainObject(node)) return node;
      const out = {};
      const rawGroupType = node.$type || node.type || inheritedType;
      const groupType = TYPE_MAP[rawGroupType] || rawGroupType;

      if ("value" in node && !("$value" in node)) {
        out.$value = node.value;
      }
      if ("type" in node && !("$type" in node)) {
        out.$type = TYPE_MAP[node.type] || node.type;
      } else if ( node.$type && TYPE_MAP[node.$type]) {
        out.$type = TYPE_MAP[node.$type];
      }
      if ("description" in node && !("$description" in node)) {
        out.$description = node.description;
      }

      const isLeaf = "$value" in node || "value" in node;
      if (isLeaf && !out.$type && !node.$type && groupType) {
        out.$type = groupType;
      }

      for (const [k, v] of Object.entries(node)) {
        if (k === "$themes" || k === "$metadata") continue;
        if (isLeaf && (k === "value" || k === "type" || k === "description")) {
          continue;
        }
        if (isPlainObject(v) && !isLeaf) {
          out[k] = walk(v, groupType);
        } else {
          out[k] = v;
        }
      }

      // Allow CSS functions (clamp, calc) and multi-axis shorthand dimensions (e.g., "6px 12px") to pass through cleanly
      if (isLeaf && out.$type === "dimension" && typeof out.$value === "string") {
        const trimmed = out.$value.trim();
        if (
          trimmed.startsWith("clamp(") ||
          trimmed.startsWith("calc(") ||
          trimmed.includes(" ")
        ) {
          out.$type = "string";
        }
      }

      return out;
    }

    return walk(dictionary);
  },
});

/**
 * Transform W3C DTCG / Tokens Studio composite typography objects into CSS font shorthand
 */
StyleDictionary.registerTransform({
  name: "ds/typography/css-shorthand",
  type: "value",
  transitive: true,
  filter: (token) => (token.$type || token.type) === "typography",
  transform: (token) => {
    const val = token.$value ?? token.value;
    if (typeof val === "string") return val;
    if (!isPlainObject(val)) return String(val);
    const weight = val.fontWeight || "400";
    const size = val.fontSize || "1rem";
    const lineHeight = val.lineHeight ? `/${val.lineHeight}` : "";
    const family = val.fontFamily || "sans-serif";
    return `${weight} ${size}${lineHeight} ${family}`;
  },
});

/**
 * Clean & normalize token name for CSS variables
 */
function getCssVarName(token, prefix = "ds") {
  const parts = [...token.path];
  if (parts[0] === "semantic" || parts[0] === "component") {
    parts.shift();
  }
  const name = parts.join("-");
  return `--${prefix}-${name}`;
}

/**
 * Formatter for CSS variables with custom selector, optional @layer, and color-scheme
 */
StyleDictionary.registerFormat({
  name: "custom/css/variables",
  format: ({ dictionary, options }) => {
    const { selector = ":root", prefix = "ds", colorScheme, layer } = options;
    const schemeLine = colorScheme ? `  color-scheme: ${colorScheme};\n` : "";
    const lines = dictionary.allTokens
      .map(
        (token) =>
          `  ${getCssVarName(token, prefix)}: ${token.$value ?? token.value};`,
      )
      .join("\n");

    const ruleBlock = `${selector} {\n${schemeLine}${lines}\n}`;
    const body = layer ? `@layer ${layer} {\n${ruleBlock}\n}` : ruleBlock;

    return `/**\n * Do not edit directly, this file was auto-generated.\n */\n\n${body}\n`;
  },
});

/**
 * Helper to build nested object from path
 */
function setNestedPath(obj, pathArr, value) {
  let curr = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = pathArr[i];
    if (!curr[key] || typeof curr[key] !== "object") {
      curr[key] = {};
    }
    curr = curr[key];
  }
  curr[pathArr[pathArr.length - 1]] = value;
}

/**
 * Helper to read all JSON files in a directory and deep-merge into a single tree
 */
export function loadAndMergeJson(dirPath) {
  const merged = {};
  if (!fs.existsSync(dirPath)) return merged;
  const entries = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      deepMerge(merged, loadAndMergeJson(full));
    } else if (entry.name.endsWith(".tokens.json")) {
      const content = JSON.parse(fs.readFileSync(full, "utf8"));
      deepMerge(merged, content);
    }
  }
  return merged;
}

/**
 * Builds Primitive tokens CSS file
 */
async function buildPrimitives() {
  console.log("📦 Building Primitives...");
  const sd = new StyleDictionary({
    preprocessors: ["tokens-studio/dtcg-normalizer"],
    source: ["src/tokens/primitives/**/*.tokens.json"],
    platforms: {
      css: {
        transformGroup: "css",
        transforms: ["ds/typography/css-shorthand"],
        prefix: "ds",
        buildPath: "dist/css/",
        files: [
          {
            destination: "primitives.css",
            format: "custom/css/variables",
            options: {
              selector: ":root",
              prefix: "ds",
              layer: "ds.primitives",
            },
          },
        ],
      },
    },
  });

  await sd.buildAllPlatforms();
}

/**
 * Compiles Brand + Theme permutations
 */
async function buildBrandThemes() {
  const brandThemeOutputs = [];

  for (const brand of BRANDS) {
    for (const theme of THEMES) {
      console.log(`🎨 Building [${brand.id}] [${theme.id}]...`);

      let selectorParts = [];
      if (brand.isDefault && theme.isDefault) {
        selectorParts = [
          `:root`,
          `[data-brand="${brand.id}"][data-theme="${theme.id}"]`,
          `[data-brand="${brand.id}"]`,
          `[data-theme="${theme.id}"]`,
        ];
      } else if (brand.isDefault && !theme.isDefault) {
        selectorParts = [
          `[data-brand="${brand.id}"][data-theme="${theme.id}"]`,
          `[data-theme="${theme.id}"]`,
        ];
      } else if (!brand.isDefault && theme.isDefault) {
        selectorParts = [
          `[data-brand="${brand.id}"][data-theme="${theme.id}"]`,
          `[data-brand="${brand.id}"]`,
        ];
      } else {
        selectorParts = [
          `[data-brand="${brand.id}"][data-theme="${theme.id}"]`,
        ];
      }

      const selector = selectorParts.join(",\n");

      const sd = new StyleDictionary({
        preprocessors: ["tokens-studio/dtcg-normalizer"],
        source: [
          "src/tokens/primitives/**/*.tokens.json",
          "src/tokens/semantic/**/*.tokens.json",
          `src/tokens/brands/${brand.id}/brand.tokens.json`,
          `src/tokens/brands/${brand.id}/${theme.id}.tokens.json`,
          "src/tokens/components/**/*.tokens.json",
        ],
        platforms: {
          css: {
            transformGroup: "css",
            transforms: ["ds/typography/css-shorthand"],
            prefix: "ds",
            buildPath: "dist/css/brands/",
            files: [
              {
                destination: `${brand.id}-${theme.id}.css`,
                format: "custom/css/variables",
                options: {
                  selector,
                  prefix: "ds",
                  colorScheme: theme.id,
                  layer: "ds.themes",
                },
                filter: (token) => !token.path.includes("primitive"),
              },
            ],
          },
        },
      });

      await sd.buildAllPlatforms();

      const tokens = await sd.getPlatformTokens("css");
      brandThemeOutputs.push({
        brand: brand.id,
        brandName: brand.name,
        theme: theme.id,
        isDefault: brand.isDefault && theme.isDefault,
        tokens,
      });
    }
  }

  return brandThemeOutputs;
}

/**
 * Builds density mode CSS block ([data-density="compact" | "default" | "spacious"])
 */
function buildDensityCss() {
  const blocks = DENSITIES.map((density) => {
    const selectors = density.isDefault
      ? `:root,\n[data-density="${density.id}"]`
      : `[data-density="${density.id}"]`;
    const props = Object.entries(density.tokens)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n");
    return `${selectors} {\n${props}\n}`;
  }).join("\n\n");

  return `@layer ds.density {\n${blocks}\n}\n`;
}

/**
 * Builds consolidated tokens.css bundle and Tailwind v4 @theme bridge (dist/css/tailwind.css)
 */
function buildConsolidatedCss(brandThemeOutputs) {
  console.log("📄 Bundling dist/css/tokens.css & dist/css/tailwind.css...");
  const primitivesCss = fs.readFileSync(
    path.join(DIST_DIR, "css/primitives.css"),
    "utf8",
  );

  let combined = `/**\n * @ds-template/tokens - Complete Multi-Brand Tokens Bundle\n * Auto-generated by Style Dictionary v5\n */\n\n`;
  combined += `@layer ds.primitives, ds.themes, ds.density;\n\n`;
  combined += `/* ==========================================================================\n   GLOBAL PRIMITIVES\n   ========================================================================== */\n\n`;
  combined += primitivesCss;

  combined += `\n/* ==========================================================================\n   MULTI-BRAND & THEME SCOPES\n   ========================================================================== */\n\n`;

  for (const brand of BRANDS) {
    for (const theme of THEMES) {
      const brandFile = path.join(
        DIST_DIR,
        `css/brands/${brand.id}-${theme.id}.css`,
      );
      if (fs.existsSync(brandFile)) {
        combined += `\n/* --- ${brand.name} [${theme.id.toUpperCase()}] --- */\n`;
        combined += fs.readFileSync(brandFile, "utf8");
      }
    }
  }

  combined += `\n/* ==========================================================================\n   MULTI-DENSITY SCOPES (compact | default | spacious)\n   ========================================================================== */\n\n`;
  combined += buildDensityCss();

  fs.writeFileSync(path.join(DIST_DIR, "css/tokens.css"), combined, "utf8");

  // Generate Tailwind CSS v4 @theme bridge
  const tailwindCss = `/**
 * @ds-template/tokens - Tailwind CSS v4 @theme Integration
 * Auto-generated by Style Dictionary v5
 */
@import "./tokens.css";

@theme inline {
  --color-canvas: var(--ds-color-surface-canvas);
  --color-surface: var(--ds-color-surface-default);
  --color-surface-subtle: var(--ds-color-surface-subtle);
  --color-surface-raised: var(--ds-color-surface-raised);
  --color-surface-sunken: var(--ds-color-surface-sunken);
  --color-surface-tint: var(--ds-color-surface-tint);
  --color-overlay: var(--ds-color-surface-overlay);

  --color-content-primary: var(--ds-color-text-primary);
  --color-content-secondary: var(--ds-color-text-secondary);
  --color-content-tertiary: var(--ds-color-text-tertiary);
  --color-content-muted: var(--ds-color-text-muted);
  --color-content-placeholder: var(--ds-color-text-placeholder);
  --color-content-brand: var(--ds-color-text-brand);
  --color-content-inverse: var(--ds-color-text-inverse);

  --color-stroke-default: var(--ds-color-border-default);
  --color-stroke-subtle: var(--ds-color-border-subtle);
  --color-stroke-strong: var(--ds-color-border-strong);
  --color-stroke-focus: var(--ds-color-border-focus);
  --color-stroke-ring: var(--ds-color-border-ring);

  --radius-default: var(--ds-brand-radius-default);
  --radius-card: var(--ds-brand-radius-card);
  --radius-button: var(--ds-brand-radius-button);
  --radius-input: var(--ds-brand-radius-input);

  --shadow-card: var(--ds-elevation-card);
  --shadow-dropdown: var(--ds-elevation-dropdown);
  --shadow-popover: var(--ds-elevation-popover);
  --shadow-modal: var(--ds-elevation-modal);

  --font-sans: var(--ds-brand-fontFamily-base);
  --font-mono: var(--ds-typography-code-fontFamily);
}
`;
  fs.writeFileSync(path.join(DIST_DIR, "css/tailwind.css"), tailwindCss, "utf8");
}

/**
 * Builds SCSS output files directly from resolved default token list + theme/density mixins
 */
function buildScss(brandThemeOutputs) {
  console.log("📑 Building SCSS outputs...");
  const scssDir = path.join(DIST_DIR, "scss");
  fs.mkdirSync(scssDir, { recursive: true });

  const defaultOut =
    brandThemeOutputs.find((p) => p.isDefault) || brandThemeOutputs[0];
  const lines = (defaultOut.tokens.allTokens || []).map((token) => {
    const varName = getCssVarName(token, "ds");
    const scssName = `$${varName.replace(/^--/, "")}`;
    return `${scssName}: var(${varName});`;
  });

  const variablesScss = `// Do not edit directly, this file was auto-generated.\n\n${lines.join("\n")}\n`;
  fs.writeFileSync(path.join(scssDir, "_variables.scss"), variablesScss, "utf8");

  const mixinsScss = `// @ds-template/tokens SCSS theme & density helper mixins
@mixin ds-theme($brand: 'brand-alpha', $theme: 'light') {
  &[data-brand="#{$brand}"][data-theme="#{$theme}"] {
    @content;
  }
}

@mixin ds-density($density: 'default') {
  &[data-density="#{$density}"] {
    @content;
  }
}
`;
  fs.writeFileSync(path.join(scssDir, "_mixins.scss"), mixinsScss, "utf8");

  const indexScss = `// @ds-template/tokens SCSS entry point\n@forward 'variables';\n@forward 'mixins';\n`;
  fs.writeFileSync(path.join(scssDir, "_index.scss"), indexScss, "utf8");
}

/**
 * Builds TypeScript definitions (.d.ts), ESM JavaScript (.js), and raw .ts sources
 */
function buildTypeScript(brandThemeOutputs) {
  console.log("🔷 Building TypeScript & ESM outputs...");
  const tsDir = path.join(DIST_DIR, "ts");
  fs.mkdirSync(tsDir, { recursive: true });

  const defaultPermutation =
    brandThemeOutputs.find((p) => p.isDefault) || brandThemeOutputs[0];
  const tokenList = defaultPermutation.tokens.allTokens || [];

  const cssVarsObj = {};
  const valuesObj = {};

  for (const token of tokenList) {
    const cleanPath = [...token.path];
    if (cleanPath[0] === "semantic" || cleanPath[0] === "component") {
      cleanPath.shift();
    }
    const varName = getCssVarName(token, "ds");
    setNestedPath(cssVarsObj, cleanPath, `var(${varName})`);
    setNestedPath(valuesObj, cleanPath, token.$value ?? token.value);
  }

  const brandIds = BRANDS.map((b) => b.id);
  const themeIds = THEMES.map((t) => t.id);
  const densityIds = DENSITIES.map((d) => d.id);

  const cssVarsJson = JSON.stringify(cssVarsObj, null, 2);
  const valuesJson = JSON.stringify(valuesObj, null, 2);

  // 1. css-vars (.ts, .js, .d.ts)
  fs.writeFileSync(
    path.join(tsDir, "css-vars.ts"),
    `export const TOKENS = ${cssVarsJson} as const;\nexport type DesignTokenVars = typeof TOKENS;\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(tsDir, "css-vars.js"),
    `export const TOKENS = ${cssVarsJson};\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(tsDir, "css-vars.d.ts"),
    `export declare const TOKENS: ${cssVarsJson};\nexport type DesignTokenVars = typeof TOKENS;\n`,
    "utf8",
  );

  // 2. tokens (.ts, .js, .d.ts)
  fs.writeFileSync(
    path.join(tsDir, "tokens.ts"),
    `export const defaultTokens = ${valuesJson} as const;\nexport const brands = ${JSON.stringify(brandIds)} as const;\nexport type Brand = (typeof brands)[number];\nexport const themes = ${JSON.stringify(themeIds)} as const;\nexport type Theme = (typeof themes)[number];\nexport const densities = ${JSON.stringify(densityIds)} as const;\nexport type Density = (typeof densities)[number];\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(tsDir, "tokens.js"),
    `export const defaultTokens = ${valuesJson};\nexport const brands = ${JSON.stringify(brandIds)};\nexport const themes = ${JSON.stringify(themeIds)};\nexport const densities = ${JSON.stringify(densityIds)};\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(tsDir, "tokens.d.ts"),
    `export declare const defaultTokens: ${valuesJson};\nexport declare const brands: readonly ${JSON.stringify(brandIds)};\nexport type Brand = (typeof brands)[number];\nexport declare const themes: readonly ${JSON.stringify(themeIds)};\nexport type Theme = (typeof themes)[number];\nexport declare const densities: readonly ${JSON.stringify(densityIds)};\nexport type Density = (typeof densities)[number];\n`,
    "utf8",
  );

  // 3. index (.ts, .js, .d.ts) and types.d.ts
  const indexTs = `export * from './css-vars.js';
export * from './tokens.js';
import type { Brand, Theme, Density } from './tokens.js';

export function setTheme(brand: Brand | string, theme: Theme | string, targetElement?: HTMLElement): void {
  const target = targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return;
  target.setAttribute('data-brand', brand);
  target.setAttribute('data-theme', theme);
}

export function setDensity(density: Density | string, targetElement?: HTMLElement): void {
  const target = targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return;
  target.setAttribute('data-density', density);
}
`;
  const indexJs = `export * from './css-vars.js';
export * from './tokens.js';

export function setTheme(brand, theme, targetElement) {
  const target = targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return;
  target.setAttribute('data-brand', brand);
  target.setAttribute('data-theme', theme);
}

export function setDensity(density, targetElement) {
  const target = targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return;
  target.setAttribute('data-density', density);
}
`;
  const indexDts = `export * from './css-vars.js';
export * from './tokens.js';
import type { Brand, Theme, Density } from './tokens.js';

export type TokenValue = string | number;
export declare function setTheme(brand: Brand | string, theme: Theme | string, targetElement?: HTMLElement): void;
export declare function setDensity(density: Density | string, targetElement?: HTMLElement): void;
`;

  fs.writeFileSync(path.join(tsDir, "index.ts"), indexTs, "utf8");
  fs.writeFileSync(path.join(tsDir, "index.js"), indexJs, "utf8");
  fs.writeFileSync(path.join(tsDir, "index.d.ts"), indexDts, "utf8");
  fs.writeFileSync(path.join(tsDir, "types.d.ts"), indexDts, "utf8");
}

/**
 * Builds Figma sync artifacts:
 * 1. Tokens Studio multi-set JSON (dist/figma/tokens-studio.json) with all brands & themes
 * 2. Figma Variables REST API payload (dist/figma/figma-variables.json) with collections, modes, variables, and variableModeValues
 */
function buildFigma(brandThemeOutputs) {
  console.log("📐 Building Figma sync outputs (Tokens Studio & Variables API)...");
  const figmaDir = path.join(DIST_DIR, "figma");
  fs.mkdirSync(figmaDir, { recursive: true });

  const primitivesJson = loadAndMergeJson(path.join(TOKENS_DIR, "primitives"));
  const semanticJson = loadAndMergeJson(path.join(TOKENS_DIR, "semantic"));
  const componentsJson = loadAndMergeJson(path.join(TOKENS_DIR, "components"));

  const brandSets = {};
  const themeSets = {};
  const tokenSetOrder = ["primitives", "semantic"];

  for (const brand of BRANDS) {
    const brandSetName = `brand/${brand.id}`;
    brandSets[brandSetName] = JSON.parse(
      fs.readFileSync(
        path.join(TOKENS_DIR, `brands/${brand.id}/brand.tokens.json`),
        "utf8",
      ),
    );
    tokenSetOrder.push(brandSetName);

    for (const theme of THEMES) {
      const themeSetName = `theme/${brand.id}/${theme.id}`;
      themeSets[themeSetName] = JSON.parse(
        fs.readFileSync(
          path.join(TOKENS_DIR, `brands/${brand.id}/${theme.id}.tokens.json`),
          "utf8",
        ),
      );
      tokenSetOrder.push(themeSetName);
    }
  }

  tokenSetOrder.push("components");

  // Also include default theme/light and theme/dark aliases for backwards compatibility
  const defaultBrand = BRANDS.find((b) => b.isDefault) || BRANDS[0];
  const tokensStudio = {
    primitives: primitivesJson,
    semantic: semanticJson,
    ...brandSets,
    ...themeSets,
    "theme/light": themeSets[`theme/${defaultBrand.id}/light`],
    "theme/dark": themeSets[`theme/${defaultBrand.id}/dark`],
    components: componentsJson,
    $themes: BRANDS.flatMap((brand) =>
      THEMES.map((theme) => ({
        id: `${brand.id}-${theme.id}`,
        name: `${brand.name} (${theme.id})`,
        group: brand.name,
        selectedTokenSets: {
          primitives: "source",
          semantic: "enabled",
          [`brand/${brand.id}`]: "enabled",
          [`theme/${brand.id}/${theme.id}`]: "enabled",
          components: "enabled",
        },
      })),
    ),
    $metadata: {
      tokenSetOrder,
    },
  };

  fs.writeFileSync(
    path.join(figmaDir, "tokens-studio.json"),
    JSON.stringify(tokensStudio, null, 2),
    "utf8",
  );

  // 2. Complete Figma Variables REST API format
  const defaultOut =
    brandThemeOutputs.find((o) => o.isDefault) || brandThemeOutputs[0];
  const variables = [];
  const variableModeValues = [];

  for (const token of defaultOut.tokens.allTokens || []) {
    const varId = `var:${token.path.join("-")}`;
    const tokenType = token.$type || token.type;
    const resolvedType =
      tokenType === "color"
        ? "COLOR"
        : tokenType === "number" || tokenType === "dimension"
          ? "FLOAT"
          : "STRING";
    const collectionId =
      token.path[0] === "component" ? "col:components" : "col:semantic";

    variables.push({
      action: "CREATE",
      id: varId,
      name: token.path.join("/"),
      variableCollectionId: collectionId,
      resolvedType,
      description: token.$description || "",
    });

    if (collectionId === "col:components") {
      variableModeValues.push({
        variableId: varId,
        modeId: "mode:default",
        value: token.$value ?? token.value,
      });
    } else {
      for (const perm of brandThemeOutputs) {
        const match = (perm.tokens.allTokens || []).find(
          (t) => t.path.join(".") === token.path.join("."),
        );
        if (match) {
          variableModeValues.push({
            variableId: varId,
            modeId: `mode:${perm.brand}-${perm.theme}`,
            value: match.$value ?? match.value,
          });
        }
      }
    }
  }

  const figmaVariables = {
    collections: [
      {
        id: "col:primitives",
        name: "Primitives",
        modes: [{ modeId: "mode:default", name: "Default" }],
      },
      {
        id: "col:semantic",
        name: "Semantic",
        modes: BRANDS.flatMap((b) =>
          THEMES.map((t) => ({
            modeId: `mode:${b.id}-${t.id}`,
            name: `${b.name} (${t.id})`,
          })),
        ),
      },
      {
        id: "col:components",
        name: "Components",
        modes: [{ modeId: "mode:default", name: "Default" }],
      },
    ],
    variables,
    variableModeValues,
  };

  fs.writeFileSync(
    path.join(figmaDir, "figma-variables.json"),
    JSON.stringify(figmaVariables, null, 2),
    "utf8",
  );
}

/**
 * Main build runner
 */
export async function run() {
  console.log("🚀 Starting Design Token Build Pipeline...\n");
  const startTime = Date.now();

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST_DIR, "css"), { recursive: true });

  await buildPrimitives();
  const brandThemeOutputs = await buildBrandThemes();
  buildConsolidatedCss(brandThemeOutputs);
  buildScss(brandThemeOutputs);
  buildTypeScript(brandThemeOutputs);
  buildFigma(brandThemeOutputs);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Build completed successfully in ${duration}s!`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve("scripts/build-tokens.mjs")
) {
  run().catch((err) => {
    console.error("\n❌ Build failed:", err);
    process.exit(1);
  });
}

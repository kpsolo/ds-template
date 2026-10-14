import fs from "node:fs";
import path from "node:path";
import StyleDictionary from "style-dictionary";

const ROOT_DIR = process.cwd();
const TOKENS_DIR = path.join(ROOT_DIR, "src/tokens");
const DIST_DIR = path.join(ROOT_DIR, "dist");

const BRANDS = [
  { id: "brand-alpha", name: "Alpha Tech", isDefault: true },
  { id: "brand-beta", name: "Beta FinTech", isDefault: false },
];

const THEMES = [
  { id: "light", isDefault: true },
  { id: "dark", isDefault: false },
];

/**
 * Clean & normalize token name for CSS variables
 * E.g. "semantic.color.surface.canvas" -> "color-surface-canvas"
 *      "component.button.size.md.height" -> "button-size-md-height"
 *      "primitive.color.slate.500" -> "primitive-color-slate-500"
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
 * Formatter for CSS variables with custom selector
 */
StyleDictionary.registerFormat({
  name: "custom/css/variables",
  format: ({ dictionary, options }) => {
    const { selector = ":root", prefix = "ds" } = options;
    const lines = dictionary.allTokens
      .map(
        (token) =>
          `  ${getCssVarName(token, prefix)}: ${token.$value || token.value};`,
      )
      .join("\n");

    return `/**\n * Do not edit directly, this file was auto-generated.\n */\n\n${selector} {\n${lines}\n}\n`;
  },
});

/**
 * Formatter for SCSS variables
 */
StyleDictionary.registerFormat({
  name: "custom/scss/variables",
  format: ({ dictionary, options }) => {
    const { prefix = "ds" } = options;
    const lines = dictionary.allTokens
      .map((token) => {
        const varName = getCssVarName(token, prefix);
        const scssName = `$${varName.replace(/^--/, "")}`;
        return `${scssName}: var(${varName});`;
      })
      .join("\n");

    return `// Do not edit directly, this file was auto-generated.\n\n${lines}\n`;
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
 * Builds Primitive tokens CSS file
 */
async function buildPrimitives() {
  console.log("📦 Building Primitives...");
  const sd = new StyleDictionary({
    source: ["src/tokens/primitives/**/*.tokens.json"],
    platforms: {
      css: {
        transformGroup: "css",
        prefix: "ds",
        buildPath: "dist/css/",
        files: [
          {
            destination: "primitives.css",
            format: "custom/css/variables",
            options: {
              selector: ":root",
              prefix: "ds",
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

      // Construct selectors
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
        log: { verbosity: "verbose" },
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
            prefix: "ds",
            buildPath: "dist/css/brands/",
            files: [
              {
                destination: `${brand.id}-${theme.id}.css`,
                format: "custom/css/variables",
                options: {
                  selector,
                  prefix: "ds",
                },
                filter: (token) => {
                  // Only output semantic, brand, and component tokens in brand themes (primitives are in primitives.css)
                  return !token.path.includes("primitive");
                },
              },
            ],
          },
        },
      });

      await sd.buildAllPlatforms();

      // Collect tokens for TypeScript and Figma exports
      const tokens = await sd.getPlatformTokens("css");
      brandThemeOutputs.push({
        brand: brand.id,
        theme: theme.id,
        isDefault: brand.isDefault && theme.isDefault,
        tokens,
      });
    }
  }

  return brandThemeOutputs;
}

/**
 * Builds consolidated tokens.css bundle
 */
function buildConsolidatedCss() {
  console.log("📄 Bundling dist/css/tokens.css...");
  const primitivesCss = fs.readFileSync(
    path.join(DIST_DIR, "css/primitives.css"),
    "utf8",
  );

  let combined = `/**\n * @ds-template/tokens - Complete Multi-Brand Tokens Bundle\n * Auto-generated by Style Dictionary\n */\n\n`;
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

  fs.writeFileSync(path.join(DIST_DIR, "css/tokens.css"), combined, "utf8");
}

/**
 * Builds SCSS output files
 */
async function buildScss(defaultTokens) {
  console.log("📑 Building SCSS outputs...");
  const scssDir = path.join(DIST_DIR, "scss");
  fs.mkdirSync(scssDir, { recursive: true });

  const sd = new StyleDictionary({
    source: [
      "src/tokens/primitives/**/*.tokens.json",
      "src/tokens/semantic/**/*.tokens.json",
      "src/tokens/brands/brand-alpha/brand.tokens.json",
      "src/tokens/brands/brand-alpha/light.tokens.json",
      "src/tokens/components/**/*.tokens.json",
    ],
    platforms: {
      scss: {
        transformGroup: "scss",
        prefix: "ds",
        buildPath: "dist/scss/",
        files: [
          {
            destination: "_variables.scss",
            format: "custom/scss/variables",
            options: { prefix: "ds" },
          },
        ],
      },
    },
  });

  await sd.buildAllPlatforms();

  // Create _index.scss
  const indexScss = `// @ds-template/tokens SCSS entry point\n@forward 'variables';\n`;
  fs.writeFileSync(path.join(scssDir, "_index.scss"), indexScss, "utf8");
}

/**
 * Builds TypeScript definitions, constant contracts, and runtime objects
 */
function buildTypeScript(brandThemeOutputs) {
  console.log("🔷 Building TypeScript outputs...");
  const tsDir = path.join(DIST_DIR, "ts");
  fs.mkdirSync(tsDir, { recursive: true });

  const defaultPermutation =
    brandThemeOutputs.find((p) => p.isDefault) || brandThemeOutputs[0];
  const tokenList = defaultPermutation.tokens.allTokens || [];

  // 1. Build CSS variable contract map
  // E.g. TOKENS.color.surface.canvas = "var(--ds-color-surface-canvas)"
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

  // Write css-vars.ts
  const cssVarsContent = `/**
 * Typed CSS Custom Property bindings for @ds-template/tokens.
 * Use these constants to reference CSS variables safely with autocomplete in TypeScript.
 */
export const TOKENS = ${JSON.stringify(cssVarsObj, null, 2)} as const;

export type DesignTokenVars = typeof TOKENS;
`;
  fs.writeFileSync(path.join(tsDir, "css-vars.ts"), cssVarsContent, "utf8");

  // Write tokens.ts (Raw values dictionary)
  const tokensContent = `/**
 * Raw resolved values for the default brand (Alpha Tech - Light).
 */
export const defaultTokens = ${JSON.stringify(valuesObj, null, 2)} as const;

export const brands = ${JSON.stringify(BRANDS.map((b) => b.id))} as const;
export type Brand = (typeof brands)[number];

export const themes = ${JSON.stringify(THEMES.map((t) => t.id))} as const;
export type Theme = (typeof themes)[number];
`;
  fs.writeFileSync(path.join(tsDir, "tokens.ts"), tokensContent, "utf8");

  // Write types.d.ts
  const typesContent = `import { TOKENS, DesignTokenVars } from './css-vars.js';
import { defaultTokens, Brand, Theme } from './tokens.js';

export { TOKENS, DesignTokenVars, defaultTokens, Brand, Theme };

export type TokenValue = string | number;

/**
 * Utility function to set brand and theme attributes on an HTMLElement
 */
export declare function setTheme(brand: Brand, theme: Theme, targetElement?: HTMLElement): void;
`;
  fs.writeFileSync(path.join(tsDir, "types.d.ts"), typesContent, "utf8");

  // Write index.ts
  const indexContent = `export * from './css-vars.js';
export * from './tokens.js';

/**
 * Set theme and brand on an element or root document
 */
export function setTheme(brand: string, theme: string, targetElement?: HTMLElement): void {
  const target = targetElement || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return;
  target.setAttribute('data-brand', brand);
  target.setAttribute('data-theme', theme);
}
`;
  fs.writeFileSync(path.join(tsDir, "index.ts"), indexContent, "utf8");
}

/**
 * Helper to read all JSON files in a directory and merge into a single tree
 */
function loadAndMergeJson(dirPath) {
  const merged = {};
  if (!fs.existsSync(dirPath)) return merged;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      Object.assign(merged, loadAndMergeJson(full));
    } else if (entry.name.endsWith(".tokens.json")) {
      try {
        const content = JSON.parse(fs.readFileSync(full, "utf8"));
        Object.assign(merged, content);
      } catch (e) {}
    }
  }
  return merged;
}

/**
 * Builds Figma sync artifacts (Tokens Studio multi-set and Figma Variables REST API)
 */
function buildFigma(brandThemeOutputs) {
  console.log("📐 Building Figma sync outputs...");
  const figmaDir = path.join(DIST_DIR, "figma");
  fs.mkdirSync(figmaDir, { recursive: true });

  const primitivesJson = loadAndMergeJson(path.join(TOKENS_DIR, "primitives"));
  const componentsJson = loadAndMergeJson(path.join(TOKENS_DIR, "components"));

  // 1. Tokens Studio multi-set structure
  const tokensStudio = {
    primitives: primitivesJson.primitive || primitivesJson,
    components: componentsJson.component || componentsJson,
    "brand/brand-alpha": JSON.parse(
      fs.readFileSync(
        path.join(TOKENS_DIR, "brands/brand-alpha/brand.tokens.json"),
        "utf8",
      ),
    ),
    "brand/brand-beta": JSON.parse(
      fs.readFileSync(
        path.join(TOKENS_DIR, "brands/brand-beta/brand.tokens.json"),
        "utf8",
      ),
    ),
    "theme/light": JSON.parse(
      fs.readFileSync(
        path.join(TOKENS_DIR, "brands/brand-alpha/light.tokens.json"),
        "utf8",
      ),
    ),
    "theme/dark": JSON.parse(
      fs.readFileSync(
        path.join(TOKENS_DIR, "brands/brand-alpha/dark.tokens.json"),
        "utf8",
      ),
    ),
    $themes: BRANDS.flatMap((brand) =>
      THEMES.map((theme) => ({
        id: `${brand.id}-${theme.id}`,
        name: `${brand.name} ${theme.id.toUpperCase()}`,
        selectedTokenSets: {
          primitives: "enabled",
          [`brand/${brand.id}`]: "enabled",
          [`theme/${theme.id}`]: "enabled",
          components: "enabled",
        },
      })),
    ),
    $metadata: {
      tokenSetOrder: [
        "primitives",
        "brand/brand-alpha",
        "brand/brand-beta",
        "theme/light",
        "theme/dark",
        "components",
      ],
    },
  };

  fs.writeFileSync(
    path.join(figmaDir, "tokens-studio.json"),
    JSON.stringify(tokensStudio, null, 2),
    "utf8",
  );

  // 2. Figma Variables REST API format
  const figmaVariables = {
    collections: [
      {
        name: "Primitives",
        modes: [{ modeId: "mode:default", name: "Default" }],
      },
      {
        name: "Semantic",
        modes: BRANDS.flatMap((b) =>
          THEMES.map((t) => ({
            modeId: `mode:${b.id}-${t.id}`,
            name: `${b.name} (${t.id})`,
          })),
        ),
      },
      {
        name: "Components",
        modes: [{ modeId: "mode:default", name: "Default" }],
      },
    ],
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
async function run() {
  console.log("🚀 Starting Design Token Build Pipeline...\n");
  const startTime = Date.now();

  // Ensure clean dist directory
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST_DIR, "css"), { recursive: true });

  await buildPrimitives();
  const brandThemeOutputs = await buildBrandThemes();
  buildConsolidatedCss();
  await buildScss();
  buildTypeScript(brandThemeOutputs);
  buildFigma(brandThemeOutputs);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Build completed successfully in ${duration}s!`);
}

run().catch((err) => {
  console.error("\n❌ Build failed:", err);
  process.exit(1);
});

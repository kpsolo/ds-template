import fs from "node:fs";
import path from "node:path";

const TOKENS_DIR = path.resolve("src/tokens");

const VALID_TOKEN_TYPES = new Set([
  // W3C DTCG types
  "color",
  "dimension",
  "fontFamily",
  "fontWeight",
  "duration",
  "cubicBezier",
  "number",
  "shadow",
  "string",
  "boolean",
  "typography",
  "border",
  "transition",
  "gradient",
  "strokeStyle",
  // Tokens Studio legacy alias types
  "fontSizes",
  "fontFamilies",
  "fontWeights",
  "lineHeights",
  "letterSpacing",
  "spacing",
  "borderRadius",
  "borderWidth",
  "boxShadow",
  "sizing",
  "opacity",
]);

/**
 * Auto-discover brands from src/tokens/brands/<brand-id>/brand.tokens.json
 */
export function discoverBrands(tokensDir = TOKENS_DIR) {
  const brandsDir = path.join(tokensDir, "brands");
  if (!fs.existsSync(brandsDir)) return [];
  return fs
    .readdirSync(brandsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => d.name);
}

/**
 * Recursively find all .tokens.json files
 */
function findTokenFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findTokenFiles(fullPath));
    } else if (entry.name.endsWith(".tokens.json")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Flattens a nested token object into dot-notation paths and resolves inherited $type
 */
export function flattenTokens(obj, prefix = "", inheritedType = null) {
  const result = {};
  const groupType = obj.$type || obj.type || inheritedType;

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue;
    const currentPath = prefix ? `${prefix}.${key}` : key;
    if (
      value &&
      typeof value === "object" &&
      !("$value" in value) &&
      !("value" in value)
    ) {
      Object.assign(result, flattenTokens(value, currentPath, groupType));
    } else if (
      value &&
      typeof value === "object" &&
      ("$value" in value || "value" in value)
    ) {
      const rawValue = "$value" in value ? value.$value : value.value;
      const rawType = value.$type || value.type || groupType;
      result[currentPath] = {
        ...value,
        $value: rawValue,
        $resolvedType: rawType,
      };
    }
  }
  return result;
}

/**
 * Extract reference paths like "{primitive.color.slate.50}" from strings or composite objects
 */
export function extractReferences(val) {
  if (typeof val === "string") {
    const regex = /\{([^}]+)\}/g;
    const refs = [];
    let match;
    while ((match = regex.exec(val)) !== null) {
      refs.push(match[1]);
    }
    return refs;
  }
  if (val && typeof val === "object") {
    return Object.values(val).flatMap((v) => extractReferences(v));
  }
  return [];
}

/**
 * Depth-first cycle detection across token references
 */
export function detectCycle(
  tokenPath,
  mergedTokens,
  visited = new Set(),
  stack = [],
) {
  if (visited.has(tokenPath)) {
    return [...stack, tokenPath].join(" -> ");
  }
  const def = mergedTokens[tokenPath];
  if (!def) return null;

  visited.add(tokenPath);
  stack.push(tokenPath);

  for (const ref of extractReferences(def.$value)) {
    const cycle = detectCycle(ref, mergedTokens, new Set(visited), [...stack]);
    if (cycle) return cycle;
  }
  return null;
}

/**
 * Resolves a token reference string to its final concrete hex/string value
 */
export function resolveTokenValue(tokenPath, mergedTokens, depth = 0) {
  if (depth > 15) return null;
  const def = mergedTokens[tokenPath];
  if (!def) return null;
  const raw = def.$value;
  if (typeof raw !== "string") return raw;

  return raw.replace(/\{([^}]+)\}/g, (_, refPath) => {
    const resolved = resolveTokenValue(refPath, mergedTokens, depth + 1);
    return resolved !== null ? resolved : `{${refPath}}`;
  });
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{3,6}$/.test(clean)) return null;
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function getRelativeLuminance(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrastRatio(fgHex, bgHex) {
  const rgb1 = hexToRgb(fgHex);
  const rgb2 = hexToRgb(bgHex);
  if (!rgb1 || !rgb2) return null;
  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

const CONTRAST_CHECKS = [
  {
    fg: "semantic.color.text.primary",
    bg: "semantic.color.surface.canvas",
    minRatio: 4.5,
  },
  {
    fg: "semantic.color.text.primary",
    bg: "semantic.color.surface.default",
    minRatio: 4.5,
  },
  {
    fg: "semantic.color.text.secondary",
    bg: "semantic.color.surface.default",
    minRatio: 4.5,
  },
  {
    fg: "semantic.color.text.tertiary",
    bg: "semantic.color.surface.default",
    minRatio: 4.5,
  },
  {
    fg: "semantic.color.text.muted",
    bg: "semantic.color.surface.default",
    minRatio: 4.5,
  },
  {
    fg: "semantic.color.text.placeholder",
    bg: "semantic.color.surface.default",
    minRatio: 4.5,
  },
  {
    fg: "semantic.color.text.brand",
    bg: "semantic.color.surface.default",
    minRatio: 4.5,
  },
  {
    fg: "semantic.color.interactive.primary.text",
    bg: "semantic.color.interactive.primary.default",
    minRatio: 4.5,
  },
  {
    fg: "semantic.color.interactive.danger.text",
    bg: "semantic.color.interactive.danger.default",
    minRatio: 4.5,
  },
];

export function validateTokens() {
  console.log(
    "🔍 Validating Design Tokens (W3C DTCG + Tokens Studio, Cycles, $type & WCAG AA Contrast)...",
  );
  const files = findTokenFiles(TOKENS_DIR);
  console.log(`Found ${files.length} token files.`);

  let totalTokens = 0;
  let hasErrors = false;
  const allFilesParsed = [];

  // 1. JSON Syntax verification
  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    try {
      const content = JSON.parse(fs.readFileSync(file, "utf8"));
      allFilesParsed.push({ file: relativePath, data: content });
    } catch (err) {
      console.error(`❌ JSON Syntax Error in ${relativePath}:`, err.message);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exit(1);
  }

  // 2. Auto-discover brands and validate multi-brand/theme sets
  const brands = discoverBrands(TOKENS_DIR);
  const themes = ["light", "dark"];

  const primitiveFiles = allFilesParsed.filter((f) =>
    f.file.includes("primitives"),
  );
  const semanticSharedFiles = allFilesParsed.filter((f) =>
    f.file.includes("semantic"),
  );
  const componentFiles = allFilesParsed.filter((f) =>
    f.file.includes("components"),
  );

  for (const brand of brands) {
    for (const theme of themes) {
      const brandFiles = allFilesParsed.filter((f) =>
        f.file.includes(path.join("brands", brand)),
      );
      const brandFoundation = brandFiles.find((f) =>
        f.file.endsWith("brand.tokens.json"),
      );
      const brandTheme = brandFiles.find((f) =>
        f.file.endsWith(`${theme}.tokens.json`),
      );

      const mergedTokens = {};
      const activeFiles = [
        ...primitiveFiles,
        ...semanticSharedFiles,
        brandFoundation,
        brandTheme,
        ...componentFiles,
      ].filter(Boolean);

      for (const item of activeFiles) {
        const flat = flattenTokens(item.data);
        Object.assign(mergedTokens, flat);
      }

      totalTokens = Object.keys(mergedTokens).length;

      // 3. Check $value, $type, references, and circular loops
      for (const [tokenPath, tokenDef] of Object.entries(mergedTokens)) {
        if (!tokenDef || typeof tokenDef.$value === "undefined") {
          console.error(
            `❌ Token at "${tokenPath}" is missing a $value in [${brand}/${theme}]`,
          );
          hasErrors = true;
          continue;
        }

        if (
          !tokenDef.$resolvedType ||
          !VALID_TOKEN_TYPES.has(tokenDef.$resolvedType)
        ) {
          console.error(
            `❌ Invalid or missing DTCG $type ("${tokenDef.$resolvedType}") at "${tokenPath}" in [${brand}/${theme}]`,
          );
          hasErrors = true;
        }

        const refs = extractReferences(tokenDef.$value);
        for (const ref of refs) {
          if (!(ref in mergedTokens)) {
            console.error(
              `❌ Broken reference in [${brand}/${theme}]: "${tokenPath}" -> {${ref}} not found!`,
            );
            hasErrors = true;
          }
        }

        const cycle = detectCycle(tokenPath, mergedTokens);
        if (cycle) {
          console.error(
            `❌ Circular reference detected in [${brand}/${theme}]: ${cycle}`,
          );
          hasErrors = true;
        }
      }

      // 4. Automated WCAG 2.1 AA contrast checks
      for (const check of CONTRAST_CHECKS) {
        const fgHex = resolveTokenValue(check.fg, mergedTokens);
        const bgHex = resolveTokenValue(check.bg, mergedTokens);
        if (fgHex && bgHex) {
          const ratio = calculateContrastRatio(fgHex, bgHex);
          if (ratio !== null && ratio < check.minRatio) {
            console.error(
              `❌ WCAG AA Contrast failure in [${brand}/${theme}]: ${check.fg} (${fgHex}) on ${check.bg} (${bgHex}) = ${ratio}:1 (required >= ${check.minRatio}:1)`,
            );
            hasErrors = true;
          }
        }
      }
    }
  }

  if (hasErrors) {
    console.error("\n❌ Token validation failed!");
    process.exit(1);
  } else {
    console.log(
      `✅ Token validation & WCAG 2.1 AA contrast gates passed across ${brands.length} brands x ${themes.length} themes! (${totalTokens} tokens per permutation)\n`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve("scripts/validate-tokens.mjs")
) {
  validateTokens();
}

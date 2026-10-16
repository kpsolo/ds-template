import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { discoverBrands, deepMerge, loadAndMergeJson } from "./build-tokens.mjs";
import {
  detectCycle,
  flattenTokens,
  calculateContrastRatio,
} from "./validate-tokens.mjs";
import { importFromTokensStudio } from "./sync-tokens-studio.mjs";

const DIST_DIR = path.resolve("dist");

test("1. Brand auto-discovery finds brand-alpha (default) and brand-beta", () => {
  const brands = discoverBrands();
  assert.equal(brands.length, 2);
  assert.equal(brands[0].id, "brand-alpha");
  assert.equal(brands[0].isDefault, true);
  assert.equal(brands[1].id, "brand-beta");
  assert.equal(brands[1].isDefault, false);
});

test("2. deepMerge preserves all 8 primitive groups and 4 component groups in Tokens Studio export", () => {
  const studioPath = path.join(DIST_DIR, "figma/tokens-studio.json");
  assert.ok(fs.existsSync(studioPath), "dist/figma/tokens-studio.json must exist");

  const studio = JSON.parse(fs.readFileSync(studioPath, "utf8"));
  const primitiveKeys = Object.keys(studio.primitives.primitive);

  for (const expectedKey of [
    "borderWidth",
    "color",
    "motion",
    "radius",
    "shadow",
    "spacing",
    "fontFamily",
    "fontWeight",
    "fontSize",
    "lineHeight",
    "letterSpacing",
    "zIndex",
  ]) {
    assert.ok(
      primitiveKeys.includes(expectedKey),
      `Expected primitive.${expectedKey} in tokens-studio.json`,
    );
  }

  const componentKeys = Object.keys(studio.components.component);
  for (const expectedComp of ["badge", "button", "card", "input"]) {
    assert.ok(
      componentKeys.includes(expectedComp),
      `Expected component.${expectedComp} in tokens-studio.json`,
    );
  }

  // Per-brand theme sets must exist
  assert.ok(studio["theme/brand-alpha/light"]);
  assert.ok(studio["theme/brand-alpha/dark"]);
  assert.ok(studio["theme/brand-beta/light"]);
  assert.ok(studio["theme/brand-beta/dark"]);
  assert.equal(studio.$themes.length, 4);
});

test("3. Figma Variables API export contains populated collections, variables, and variableModeValues", () => {
  const varsPath = path.join(DIST_DIR, "figma/figma-variables.json");
  assert.ok(fs.existsSync(varsPath), "dist/figma/figma-variables.json must exist");

  const payload = JSON.parse(fs.readFileSync(varsPath, "utf8"));
  assert.equal(payload.collections.length, 3);
  assert.ok(payload.variables.length > 50, "Expected > 50 Figma variables");
  assert.ok(
    payload.variableModeValues.length > 150,
    "Expected > 150 Figma variableModeValues",
  );
});

test("4. ESM JavaScript & TypeScript declarations exist and export TOKENS, setTheme, and setDensity", async () => {
  const indexJsPath = path.join(DIST_DIR, "ts/index.js");
  const indexDtsPath = path.join(DIST_DIR, "ts/index.d.ts");
  assert.ok(fs.existsSync(indexJsPath), "dist/ts/index.js must exist");
  assert.ok(fs.existsSync(indexDtsPath), "dist/ts/index.d.ts must exist");

  const pkg = await import("../dist/ts/index.js");
  assert.ok(pkg.TOKENS.color.surface.canvas);
  assert.equal(
    pkg.TOKENS.color.surface.canvas,
    "var(--ds-color-surface-canvas)",
  );
  assert.deepEqual(pkg.brands, ["brand-alpha", "brand-beta"]);
  assert.deepEqual(pkg.themes, ["light", "dark"]);
  assert.deepEqual(pkg.densities, ["compact", "default", "spacious"]);
  assert.equal(typeof pkg.setTheme, "function");
  assert.equal(typeof pkg.setDensity, "function");
});

test("5. CSS outputs include @layer, color-scheme, composite typography, OKLCH color-mix, density scopes, and Tailwind v4 @theme", () => {
  const tokensCss = fs.readFileSync(
    path.join(DIST_DIR, "css/tokens.css"),
    "utf8",
  );
  assert.match(tokensCss, /@layer ds\.primitives, ds\.themes, ds\.density;/);
  assert.match(tokensCss, /color-scheme: light;/);
  assert.match(tokensCss, /color-scheme: dark;/);
  assert.match(tokensCss, /color-mix\(in oklch,/);
  assert.match(tokensCss, /--ds-typography-composite-heading1:/);
  assert.match(tokensCss, /\[data-density="compact"\]/);
  assert.match(tokensCss, /\[data-density="spacious"\]/);

  const tailwindCss = fs.readFileSync(
    path.join(DIST_DIR, "css/tailwind.css"),
    "utf8",
  );
  assert.match(tailwindCss, /@theme inline/);
  assert.match(tailwindCss, /--color-canvas: var\(--ds-color-surface-canvas\);/);
});

test("6. Validator cycle detection and WCAG contrast ratio helpers work accurately", () => {
  const cyclic = flattenTokens({
    semantic: {
      color: {
        $type: "color",
        a: { $value: "{semantic.color.b}" },
        b: { $value: "{semantic.color.a}" },
      },
    },
  });
  const cycleTrace = detectCycle("semantic.color.a", cyclic);
  assert.equal(
    cycleTrace,
    "semantic.color.a -> semantic.color.b -> semantic.color.a",
  );

  // Contrast checks
  assert.equal(calculateContrastRatio("#ffffff", "#000000"), 21);
  assert.ok(calculateContrastRatio("#64748b", "#ffffff") >= 4.5);
});

test("7. Two-way Tokens Studio JSON sync round-trips cleanly into modular DTCG files", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ds-tokens-sync-"));
  try {
    const written = importFromTokensStudio(
      path.join(DIST_DIR, "figma/tokens-studio.json"),
      tmpDir,
    );
    assert.ok(written.includes("primitives/color.tokens.json"));
    assert.ok(written.includes("primitives/typography.tokens.json"));
    assert.ok(written.includes("brands/brand-alpha/brand.tokens.json"));
    assert.ok(written.includes("brands/brand-beta/dark.tokens.json"));
    assert.ok(written.includes("components/button.tokens.json"));

    const mergedPrimitives = loadAndMergeJson(path.join(tmpDir, "primitives"));
    assert.ok(mergedPrimitives.primitive.color.blue["600"]);
    assert.ok(mergedPrimitives.primitive.fontSize["fluid-4xl"]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

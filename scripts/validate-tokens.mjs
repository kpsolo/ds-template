import fs from "node:fs";
import path from "node:path";

const TOKENS_DIR = path.resolve("src/tokens");

/**
 * Recursively find all .tokens.json files
 */
function findTokenFiles(dir) {
  let results = [];
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
 * Flattens a nested object into dot-notation paths
 */
function flattenTokens(obj, prefix = "") {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("$")) continue; // Skip metadata keys
    const currentPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !("$value" in value)) {
      Object.assign(result, flattenTokens(value, currentPath));
    } else if (value && typeof value === "object" && "$value" in value) {
      result[currentPath] = value;
    }
  }
  return result;
}

/**
 * Extract reference paths like "{primitive.color.slate.50}"
 */
function extractReferences(valueStr) {
  if (typeof valueStr !== "string") return [];
  const regex = /\{([^}]+)\}/g;
  const refs = [];
  let match;
  while ((match = regex.exec(valueStr)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

export function validateTokens() {
  console.log("🔍 Validating Design Tokens...");
  const files = findTokenFiles(TOKENS_DIR);
  console.log(`Found ${files.length} token files.`);

  let totalTokens = 0;
  let hasErrors = false;
  const allFilesParsed = [];

  // 1. JSON Syntax and DTCG $value verification
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

  // 2. Validate multi-brand sets
  const brands = ["brand-alpha", "brand-beta"];
  const themes = ["light", "dark"];

  // Global primitives & components are common
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

      // Check references
      for (const [tokenPath, tokenDef] of Object.entries(mergedTokens)) {
        if (!tokenDef || typeof tokenDef.$value === "undefined") {
          console.error(
            `❌ Token at "${tokenPath}" is missing a $value in [${brand}/${theme}]`,
          );
          hasErrors = true;
          continue;
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
      }
    }
  }

  if (hasErrors) {
    console.error("\n❌ Token validation failed!");
    process.exit(1);
  } else {
    console.log(
      `✅ Token validation passed across all brands and themes! (${totalTokens} tokens per permutation)\n`,
    );
  }
}

// Run directly if script is executed
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve("scripts/validate-tokens.mjs")
) {
  validateTokens();
}

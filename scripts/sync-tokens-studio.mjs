import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const TOKENS_DIR = path.join(ROOT_DIR, "src/tokens");
const DEFAULT_STUDIO_FILE = path.join(
  ROOT_DIR,
  "dist/figma/tokens-studio.json",
);

/**
 * Splits a monolithic multi-set Tokens Studio JSON file (exported from Figma)
 * into modular DTCG .tokens.json files under src/tokens/.
 */
export function importFromTokensStudio(
  studioFilePath = DEFAULT_STUDIO_FILE,
  outTokensDir = TOKENS_DIR,
) {
  if (!fs.existsSync(studioFilePath)) {
    throw new Error(`Tokens Studio file not found at: ${studioFilePath}`);
  }

  const bundle = JSON.parse(fs.readFileSync(studioFilePath, "utf8"));
  const writtenFiles = [];

  function writeJson(relPath, data) {
    const fullPath = path.join(outTokensDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + "\n", "utf8");
    writtenFiles.push(relPath);
  }

  // 1. Primitives: split by top-level primitive categories if present
  const primitivesRoot =
    bundle.primitives?.primitive || bundle.primitives || {};
  const PRIMITIVE_FILE_MAP = {
    borderWidth: "border.tokens.json",
    color: "color.tokens.json",
    motion: "motion.tokens.json",
    radius: "radius.tokens.json",
    shadow: "shadow.tokens.json",
    spacing: "spacing.tokens.json",
    zIndex: "z-index.tokens.json",
  };
  const TYPO_KEYS = [
    "fontFamily",
    "fontWeight",
    "fontSize",
    "lineHeight",
    "letterSpacing",
  ];

  const typoObj = {};
  for (const [key, val] of Object.entries(primitivesRoot)) {
    if (key.startsWith("$")) continue;
    if (TYPO_KEYS.includes(key)) {
      typoObj[key] = val;
    } else {
      const fileName = PRIMITIVE_FILE_MAP[key] || `${key}.tokens.json`;
      writeJson(`primitives/${fileName}`, { primitive: { [key]: val } });
    }
  }
  if (Object.keys(typoObj).length > 0) {
    writeJson("primitives/typography.tokens.json", { primitive: typoObj });
  }

  // 2. Semantic shared sets
  const semanticRoot = bundle.semantic?.semantic || bundle.semantic || {};
  for (const [key, val] of Object.entries(semanticRoot)) {
    if (key.startsWith("$")) continue;
    writeJson(`semantic/${key}.tokens.json`, { semantic: { [key]: val } });
  }

  // 3. Brand & Theme sets (brand/<id> and theme/<id>/<theme>)
  for (const [setKey, setVal] of Object.entries(bundle)) {
    if (setKey.startsWith("brand/")) {
      const brandId = setKey.slice("brand/".length);
      writeJson(
        `brands/${brandId}/brand.tokens.json`,
        setVal.brand ? setVal : { brand: setVal },
      );
    } else if (setKey.startsWith("theme/")) {
      const parts = setKey.split("/");
      if (parts.length === 3) {
        const [, brandId, themeId] = parts;
        writeJson(
          `brands/${brandId}/${themeId}.tokens.json`,
          setVal.semantic ? setVal : { semantic: setVal },
        );
      }
    }
  }

  // 4. Component sets
  const componentsRoot =
    bundle.components?.component || bundle.components || {};
  for (const [compName, compVal] of Object.entries(componentsRoot)) {
    if (compName.startsWith("$")) continue;
    writeJson(`components/${compName}.tokens.json`, {
      component: { [compName]: compVal },
    });
  }

  return writtenFiles;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve("scripts/sync-tokens-studio.mjs")
) {
  const inputArg = process.argv[2]
    ? path.resolve(process.argv[2])
    : DEFAULT_STUDIO_FILE;
  console.log(`🔄 Syncing Tokens Studio JSON from: ${inputArg}`);
  const files = importFromTokensStudio(inputArg);
  console.log(
    `✅ Synchronized ${files.length} modular token files into src/tokens/!`,
  );
}

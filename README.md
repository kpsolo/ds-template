# ⚡ Multi-Brand Tokenized Design System Template

A production-grade, state-of-the-art design token system built for **maximum scalability (multi-branding)**, **maintainability**, and **cross-platform portability**.

Built according to the **W3C Design Tokens Community Group (DTCG)** specification and compiled using **Style Dictionary v5** (native ESM).

---

## 🎯 Architectural Highlights

- **W3C DTCG Format Compliance**: Every token uses standard `$value`, `$type`, and `$description` properties.
- **3-Tier Hierarchy**: Clean separation between **Primitives**, **Semantic Contexts**, and **Component Tokens**.
- **Multi-Brand & Multi-Theme Matrix**: Effortlessly manage $N$ brands and $M$ themes (e.g. Light/Dark) with automated CSS cascade scoping.
- **Zero-Runtime Overhead**: Fully compiled to modern **CSS Custom Properties** with `[data-brand]` and `[data-theme]` scoping.
- **Sub-Tree Theming**: Different sections of the same webpage can use different brands simultaneously without CSS leakage (e.g. `<div data-brand="brand-beta">...</div>`).
- **Comprehensive Outputs**:
  - **CSS**: Bundled (`dist/css/tokens.css`) and modular per-brand/theme chunks.
  - **SCSS**: SCSS variables and maps.
  - **TypeScript**: Strongly typed autocomplete bindings (`TOKENS.color.surface.canvas`), raw resolved token objects, and theme utilities.
  - **Figma Sync**: Multi-set export for **Tokens Studio for Figma** and collections schema for **Figma Variables REST API**.
- **Automated Validation**: Built-in reference resolution validator catches broken token paths and circular dependencies at compile time.
- **Interactive Visual Showcase**: Instant Vite-powered preview playground with live brand & theme toggles.

---

## 🏛️ 3-Tier Token Architecture

```mermaid
flowchart TD
    subgraph TIER1["Tier 1: Global Primitives (Agnostic Foundations)"]
        P_Color["primitive.color.*<br/>(slate, blue, emerald, amber, rose)"]
        P_Space["primitive.spacing.*<br/>(0, 1, 2, 4, 8, 16, 24...)"]
        P_Type["primitive.fontSize / fontWeight / lineHeight"]
        P_Radius["primitive.radius.*<br/>(none, sm, md, lg, xl, full)"]
        P_Shadow["primitive.shadow.*"]
        P_Motion["primitive.motion.*<br/>(duration, easing)"]
    end

    subgraph TIER2["Tier 2: Semantic & Multi-Brand Matrix"]
        subgraph BRAND_ALPHA["Brand: Alpha Tech"]
            BA_Brand["brand-alpha/brand.tokens.json<br/>Primary: Blue | Radius: 6px | Sans: Inter"]
            BA_Light["brand-alpha/light.tokens.json"]
            BA_Dark["brand-alpha/dark.tokens.json"]
        end
        subgraph BRAND_BETA["Brand: Beta FinTech"]
            BB_Brand["brand-beta/brand.tokens.json<br/>Primary: Emerald | Radius: 12px | Sans: Plus Jakarta"]
            BB_Light["brand-beta/light.tokens.json"]
            BB_Dark["brand-beta/dark.tokens.json"]
        end
        S_Shared["semantic/spacing & elevation"]
    end

    subgraph TIER3["Tier 3: Component Tokens"]
        C_Btn["button.tokens.json<br/>(radius, size sm/md/lg, variants)"]
        C_Inp["input.tokens.json<br/>(states: default/hover/focus/disabled)"]
        C_Card["card.tokens.json<br/>(bg, border, shadow, padding)"]
        C_Badge["badge.tokens.json<br/>(variants: neutral/success/warning/danger/info)"]
    end

    TIER1 --> TIER2
    TIER2 --> TIER3
```

### Golden Rule of Token References
1. **Components** only reference **Semantic** tokens or Brand foundations (never raw primitives directly).
2. **Semantics** reference **Primitives** and **Brand** foundation aliases.
3. **Primitives** contain raw, hard-coded scalar values.

---

## 📁 Repository Structure

```
ds-template/
├── .github/workflows/
│   └── tokens.yml                 # Automated CI: validate, build, typecheck
├── .vscode/
│   ├── extensions.json            # Recommended developer extensions
│   └── settings.json              # Editor config & JSON schema association
├── dist/                          # Generated outputs
│   ├── css/
│   │   ├── tokens.css             # Consolidated all-in-one CSS bundle
│   │   ├── primitives.css         # Primitive CSS custom properties (:root)
│   │   └── brands/                # Individual brand + theme scoped CSS files
│   ├── figma/
│   │   ├── tokens-studio.json     # Tokens Studio multi-set JSON format
│   │   └── figma-variables.json   # Figma Variables REST API format
│   ├── scss/
│   │   ├── _index.scss            # SCSS entry point
│   │   └── _variables.scss        # SCSS variables mapping to CSS vars
│   └── ts/
│       ├── css-vars.ts            # Typed CSS var constants (TOKENS.*)
│       ├── tokens.ts              # Resolved values dictionary
│       ├── types.d.ts             # TypeScript interfaces
│       └── index.ts               # Barrel exports & setTheme() helper
├── scripts/
│   ├── build-tokens.mjs           # Master Style Dictionary build pipeline
│   └── validate-tokens.mjs        # DTCG reference & syntax validator
├── src/
│   ├── preview/                   # Live visual preview playground
│   │   ├── index.html
│   │   ├── main.ts
│   │   └── style.css
│   └── tokens/                    # Design token source files (DTCG JSON)
│       ├── primitives/            # Tier 1: Agnostic foundations
│       │   ├── border.tokens.json
│       │   ├── color.tokens.json
│       │   ├── motion.tokens.json
│       │   ├── radius.tokens.json
│       │   ├── shadow.tokens.json
│       │   ├── spacing.tokens.json
│       │   ├── typography.tokens.json
│       │   └── z-index.tokens.json
│       ├── semantic/              # Tier 2: Shared semantics
│       │   ├── elevation.tokens.json
│       │   ├── spacing.tokens.json
│       │   └── typography.tokens.json
│       ├── brands/                # Tier 2: Multi-brand definitions
│       │   ├── brand-alpha/       # Alpha Tech (Modern, Crisp, Vibrant Blue)
│       │   │   ├── brand.tokens.json
│       │   │   ├── light.tokens.json
│       │   │   └── dark.tokens.json
│       │   └── brand-beta/        # Beta FinTech (Emerald Luxe, Rounded)
│       │       ├── brand.tokens.json
│       │       ├── light.tokens.json
│       │       └── dark.tokens.json
│       └── components/            # Tier 3: Component tokens
│           ├── badge.tokens.json
│           ├── button.tokens.json
│           ├── card.tokens.json
│           └── input.tokens.json
├── package.json
└── tsconfig.json
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Validate Token References
Runs static analysis across all brand and theme combinations to ensure every `{...}` reference resolves cleanly:
```bash
pnpm validate
```

### 3. Build Token Outputs
Compiles CSS, SCSS, TypeScript, and Figma sync files:
```bash
pnpm build
```

### 4. Launch Interactive Showcase
Starts the local development server with live brand & theme switchers:
```bash
pnpm dev
```

---

## 🎨 How Multi-Branding Works in Code

### CSS Custom Property Scoping
The build engine compiles tokens into cascading selectors based on `data-brand` and `data-theme` attributes:

```css
/* Default fallback */
:root {
  --ds-button-radius: 6px;
  --ds-button-variant-primary-bg-default: #2563eb;
}

/* Brand Alpha (Light) */
[data-brand="brand-alpha"][data-theme="light"],
[data-brand="brand-alpha"] {
  --ds-button-radius: 6px;
  --ds-button-variant-primary-bg-default: #2563eb;
}

/* Brand Beta (Light) */
[data-brand="brand-beta"][data-theme="light"],
[data-brand="brand-beta"] {
  --ds-button-radius: 12px;                          /* Rounded 12px! */
  --ds-button-variant-primary-bg-default: #059669;   /* Emerald Green! */
}

/* Brand Beta (Dark) */
[data-brand="brand-beta"][data-theme="dark"] {
  --ds-color-surface-canvas: #0a120e;                /* Deep Forest dark! */
  --ds-button-variant-primary-bg-default: #10b981;
}
```

### Applying Brands & Themes in HTML

#### Global Switch:
```html
<html data-brand="brand-alpha" data-theme="light">
  <!-- Everything uses Alpha Tech Light -->
</html>
```

#### Sub-tree Multi-Branding (Multiple brands on the same screen):
```html
<html data-brand="brand-alpha" data-theme="light">
  <body>
    <!-- Main page uses Alpha Tech -->
    <header>...</header>

    <!-- Embedded partner widget or sub-brand container -->
    <aside data-brand="brand-beta">
      <!-- Buttons, inputs, and cards inside this container 
           automatically adopt Beta FinTech styles (Emerald, 12px radii)! -->
      <button class="ds-button ds-button--primary">Beta Button</button>
    </aside>
  </body>
</html>
```

---

## 💻 Consuming Tokens

### 1. In Vanilla CSS / HTML
```html
<!-- Single import for all brands and themes -->
<link rel="stylesheet" href="@ds-template/tokens/css" />

<style>
  .custom-card {
    background-color: var(--ds-color-surface-default);
    border: 1px solid var(--ds-color-border-default);
    border-radius: var(--ds-card-radius);
    box-shadow: var(--ds-elevation-card);
    padding: var(--ds-spacing-component-lg);
  }
</style>
```

### 2. In TypeScript / JavaScript
Enjoy compile-time autocomplete and typo prevention with typed variable constants:

```typescript
import { TOKENS, setTheme } from '@ds-template/tokens';

// Switch brand and theme dynamically
setTheme('brand-beta', 'dark');

// Safe CSS variable reference in style objects (React / Vue / Emotion)
const cardStyle = {
  backgroundColor: TOKENS.color.surface.default,      // "var(--ds-color-surface-default)"
  color: TOKENS.color.text.primary,                   // "var(--ds-color-text-primary)"
  borderRadius: TOKENS.card.radius,                   // "var(--ds-card-radius)"
  padding: TOKENS.spacing.component.md,               // "var(--ds-spacing-component-md)"
};
```

### 3. In SCSS
```scss
@use '@ds-template/tokens/scss' as ds;

.my-box {
  background-color: ds.$color-surface-default;
  border-radius: ds.$brand-radius-card;
}
```

### 4. In Tailwind CSS
Add semantic tokens into your `tailwind.config.js` or Tailwind v4 `@theme` block:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        surface: {
          canvas: 'var(--ds-color-surface-canvas)',
          DEFAULT: 'var(--ds-color-surface-default)',
          subtle: 'var(--ds-color-surface-subtle)',
        },
        text: {
          primary: 'var(--ds-color-text-primary)',
          secondary: 'var(--ds-color-text-secondary)',
          brand: 'var(--ds-color-text-brand)',
        },
      },
      borderRadius: {
        card: 'var(--ds-brand-radius-card)',
        button: 'var(--ds-brand-radius-button)',
      },
    },
  },
};
```

---

## 🛠️ How to Add a New Brand in 3 Minutes

1. **Create the brand directory**:
   ```bash
   mkdir -p src/tokens/brands/brand-gamma
   ```

2. **Add 3 configuration files**:
   - `src/tokens/brands/brand-gamma/brand.tokens.json`:
     Define brand name, font family, and base corner radii:
     ```json
     {
       "brand": {
         "name": { "$value": "Gamma Media", "$type": "string" },
         "fontFamily": {
           "base": { "$value": "'Poppins', {primitive.fontFamily.sans}", "$type": "fontFamily" }
         },
         "radius": {
           "default": { "$value": "{primitive.radius.sm}", "$type": "dimension" },
           "card": { "$value": "{primitive.radius.md}", "$type": "dimension" },
           "button": { "$value": "{primitive.radius.sm}", "$type": "dimension" },
           "input": { "$value": "{primitive.radius.sm}", "$type": "dimension" }
         }
       }
     }
     ```
   - `src/tokens/brands/brand-gamma/light.tokens.json`:
     Define semantic color mappings for light mode.
   - `src/tokens/brands/brand-gamma/dark.tokens.json`:
     Define semantic color mappings for dark mode.

3. **Register the brand in `scripts/build-tokens.mjs` and `scripts/validate-tokens.mjs`**:
   ```javascript
   const BRANDS = [
     { id: 'brand-alpha', name: 'Alpha Tech', isDefault: true },
     { id: 'brand-beta', name: 'Beta FinTech', isDefault: false },
     { id: 'brand-gamma', name: 'Gamma Media', isDefault: false }, // <-- Added!
   ];
   ```

4. **Run validate & build**:
   ```bash
   pnpm validate && pnpm build
   ```
   Style Dictionary automatically generates `brand-gamma-light.css`, `brand-gamma-dark.css`, adds it to `tokens.css`, and exports it for Figma and TypeScript!

---

## 🎨 Figma Synchronization

This repository generates two industry-standard sync formats on every build:

1. **Tokens Studio for Figma (`dist/figma/tokens-studio.json`)**:
   - Organized into multi-set layers: `primitives`, `brand/brand-alpha`, `brand/brand-beta`, `theme/light`, `theme/dark`, and `components`.
   - Supports automated two-way sync via GitHub Sync in the Tokens Studio plugin.

2. **Figma Variables API (`dist/figma/figma-variables.json`)**:
   - Formatted for direct automated import via the Figma REST API `POST /v1/files/:file_key/variables`.
   - Collections: `Primitives`, `Semantic`, and `Components`.
   - Modes: `Alpha Tech (Light)`, `Alpha Tech (Dark)`, `Beta FinTech (Light)`, `Beta FinTech (Dark)`.

---

## 🛡️ License

MIT © Design System Architecture Team

import { brands, themes, setTheme } from "../../dist/ts/index.js";

// Color tokens to display in the live swatch grid
const SEMANTIC_SWATCHES = [
  { name: "--ds-color-surface-canvas", role: "Canvas (Page Background)" },
  {
    name: "--ds-color-surface-default",
    role: "Default Surface (Card / Container)",
  },
  {
    name: "--ds-color-surface-subtle",
    role: "Subtle Surface (Zebra / Sidebar)",
  },
  {
    name: "--ds-color-surface-sunken",
    role: "Sunken Surface (Code / Depressed Wells)",
  },
  { name: "--ds-color-text-primary", role: "Primary Content Text" },
  { name: "--ds-color-text-secondary", role: "Secondary / Subtitle Text" },
  { name: "--ds-color-text-brand", role: "Brand Identity Text" },
  { name: "--ds-color-border-default", role: "Default Card / Box Border" },
  { name: "--ds-color-border-focus", role: "Keyboard Focus Ring" },
  {
    name: "--ds-button-variant-primary-bg-default",
    role: "Primary Action Background",
  },
  {
    name: "--ds-color-feedback-success-surface",
    role: "Success Feedback Surface",
  },
  {
    name: "--ds-color-feedback-danger-surface",
    role: "Danger Feedback Surface",
  },
];

function renderSwatches() {
  const container = document.getElementById("semantic-swatches");
  if (!container) return;

  container.innerHTML = SEMANTIC_SWATCHES.map(
    (item) => `
    <div class="swatch-item">
      <div class="swatch-color" style="background-color: var(${item.name});"></div>
      <div class="swatch-info">
        <span class="swatch-name">${item.name}</span>
        <span class="swatch-role">${item.role}</span>
      </div>
    </div>
  `,
  ).join("");
}

function initShowcase() {
  const brandSelect = document.getElementById(
    "brand-select",
  ) as HTMLSelectElement | null;
  const themeSelect = document.getElementById(
    "theme-select",
  ) as HTMLSelectElement | null;
  const currentBrandLabel = document.getElementById("current-brand-label");
  const currentThemeLabel = document.getElementById("current-theme-label");

  function update() {
    const brand = brandSelect?.value || "brand-alpha";
    const theme = themeSelect?.value || "light";

    setTheme(brand, theme);

    if (currentBrandLabel) {
      currentBrandLabel.textContent =
        brand === "brand-alpha" ? "Alpha Tech" : "Beta FinTech";
    }
    if (currentThemeLabel) {
      currentThemeLabel.textContent = theme === "light" ? "Light" : "Dark";
    }
  }

  brandSelect?.addEventListener("change", update);
  themeSelect?.addEventListener("change", update);

  renderSwatches();
  update();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initShowcase);
} else {
  initShowcase();
}

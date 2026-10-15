'use client';

import React, {useState, useMemo} from 'react';
import {
  Search,
  Copy,
  Check,
  Download,
  Code2,
  ShieldCheck,
  Layers,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  FileCode,
  Eye,
  Terminal,
} from 'lucide-react';
import {
  AUDIT_FINDINGS,
  CONTRAST_PAIRS,
  REPO_TOKENS,
  PATCHED_FILES,
  calculateContrastRatio,
  type Severity,
  type Category,
} from '@/lib/ds-audit-data';

type ActiveTab = 'audit' | 'patches' | 'contrast' | 'explorer' | 'sandbox';
type BrandId = 'brand-alpha' | 'brand-beta' | 'brand-gamma';
type ThemeId = 'light' | 'dark';

const SEVERITY_LABELS: Record<Severity, {label: string; textClass: string}> = {
  critical: {label: 'Critical Bug', textClass: 'text-red-700 font-semibold'},
  high: {label: 'High Priority', textClass: 'text-amber-700 font-semibold'},
  medium: {label: 'Medium Priority', textClass: 'text-blue-700 font-medium'},
  enhancement: {label: 'Enhancement', textClass: 'text-emerald-700 font-medium'},
};

const VALIDATOR_PRESETS = [
  {
    name: 'Circular Reference Loop (Caught by Upgraded Validator)',
    json: JSON.stringify(
      {
        semantic: {
          color: {
            $type: 'color',
            surface: {
              primary: {$value: '{semantic.color.surface.secondary}'},
              secondary: {$value: '{semantic.color.surface.primary}'},
            },
          },
        },
      },
      null,
      2
    ),
  },
  {
    name: 'Missing DTCG $type Declaration',
    json: JSON.stringify(
      {
        component: {
          modal: {
            maxWidth: {$value: '640px'},
            backdropBlur: {$value: '8px', $type: 'dimension'},
          },
        },
      },
      null,
      2
    ),
  },
  {
    name: 'Valid Multi-Tier DTCG Token Group',
    json: JSON.stringify(
      {
        primitive: {
          color: {
            $type: 'color',
            emerald: {'600': {$value: '#059669'}},
          },
        },
        semantic: {
          color: {
            $type: 'color',
            action: {
              primary: {
                $value: '{primitive.color.emerald.600}',
                $description: 'Primary brand CTA fill',
              },
            },
          },
        },
      },
      null,
      2
    ),
  },
];

const SANDBOX_THEMES: Record<
  `${BrandId}-${ThemeId}`,
  {
    brandName: string;
    themeName: string;
    canvas: string;
    surface: string;
    subtle: string;
    sunken: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textBrand: string;
    borderDefault: string;
    borderStrong: string;
    primaryBg: string;
    primaryText: string;
    radiusCard: string;
    radiusButton: string;
    radiusInput: string;
    fontLabel: string;
  }
> = {
  'brand-alpha-light': {
    brandName: 'Alpha Tech',
    themeName: 'Light',
    canvas: '#f8fafc',
    surface: '#ffffff',
    subtle: '#f1f5f9',
    sunken: '#e2e8f0',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#475569',
    textBrand: '#2563eb',
    borderDefault: '#e2e8f0',
    borderStrong: '#94a3b8',
    primaryBg: '#2563eb',
    primaryText: '#ffffff',
    radiusCard: '8px',
    radiusButton: '6px',
    radiusInput: '6px',
    fontLabel: 'Plus Jakarta Sans',
  },
  'brand-alpha-dark': {
    brandName: 'Alpha Tech',
    themeName: 'Dark',
    canvas: '#020617',
    surface: '#0f172a',
    subtle: '#1e293b',
    sunken: '#020617',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#94a3b8',
    textBrand: '#60a5fa',
    borderDefault: '#1e293b',
    borderStrong: '#334155',
    primaryBg: '#3b82f6',
    primaryText: '#ffffff',
    radiusCard: '8px',
    radiusButton: '6px',
    radiusInput: '6px',
    fontLabel: 'Plus Jakarta Sans',
  },
  'brand-beta-light': {
    brandName: 'Beta FinTech',
    themeName: 'Light',
    canvas: '#fafaf8',
    surface: '#ffffff',
    subtle: '#f3f4f1',
    sunken: '#eceee9',
    textPrimary: '#111815',
    textSecondary: '#42524a',
    textMuted: '#42524a',
    textBrand: '#059669',
    borderDefault: '#e2e6df',
    borderStrong: '#b5bfb6',
    primaryBg: '#059669',
    primaryText: '#ffffff',
    radiusCard: '16px',
    radiusButton: '12px',
    radiusInput: '8px',
    fontLabel: 'Plus Jakarta Sans',
  },
  'brand-beta-dark': {
    brandName: 'Beta FinTech',
    themeName: 'Dark',
    canvas: '#0a120e',
    surface: '#111c17',
    subtle: '#182721',
    sunken: '#070c0a',
    textPrimary: '#eef2ef',
    textSecondary: '#9db0a5',
    textMuted: '#9db0a5',
    textBrand: '#34d399',
    borderDefault: '#1f332a',
    borderStrong: '#345244',
    primaryBg: '#10b981',
    primaryText: '#0a120e',
    radiusCard: '16px',
    radiusButton: '12px',
    radiusInput: '8px',
    fontLabel: 'Plus Jakarta Sans',
  },
  'brand-gamma-light': {
    brandName: 'Gamma Media (New Auto-Discovered)',
    themeName: 'Light',
    canvas: '#fcfaf8',
    surface: '#ffffff',
    subtle: '#f5f1ed',
    sunken: '#ebe5df',
    textPrimary: '#181311',
    textSecondary: '#574c46',
    textMuted: '#574c46',
    textBrand: '#c2410c',
    borderDefault: '#e6dfd9',
    borderStrong: '#b8aba1',
    primaryBg: '#c2410c',
    primaryText: '#ffffff',
    radiusCard: '4px',
    radiusButton: '4px',
    radiusInput: '4px',
    fontLabel: 'DM Sans',
  },
  'brand-gamma-dark': {
    brandName: 'Gamma Media (New Auto-Discovered)',
    themeName: 'Dark',
    canvas: '#120e0c',
    surface: '#1c1613',
    subtle: '#29201c',
    sunken: '#0d0a08',
    textPrimary: '#f7f3f0',
    textSecondary: '#b5a69d',
    textMuted: '#b5a69d',
    textBrand: '#fb923c',
    borderDefault: '#2e241f',
    borderStrong: '#4a3b33',
    primaryBg: '#ea580c',
    primaryText: '#ffffff',
    radiusCard: '4px',
    radiusButton: '4px',
    radiusInput: '4px',
    fontLabel: 'DM Sans',
  },
};

export default function TokenOpsStudio() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('audit');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFindingId, setSelectedFindingId] = useState<string>('F-01');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Code Patches state
  const [activePatchFile, setActivePatchFile] = useState<string>('build-tokens.mjs');

  // WCAG Contrast Interactive state
  const [activeContrastPerm, setActiveContrastPerm] = useState<
    'brand-alpha-light' | 'brand-alpha-dark' | 'brand-beta-light' | 'brand-beta-dark'
  >('brand-alpha-light');
  const [applyWcagRemediation, setApplyWcagRemediation] = useState<boolean>(false);
  const [customFg, setCustomFg] = useState<string>('#94a3b8');
  const [customBg, setCustomBg] = useState<string>('#ffffff');

  // Token Explorer state
  const [tokenSearch, setTokenSearch] = useState('');
  const [tokenLayerFilter, setTokenLayerFilter] = useState<
    'all' | 'semantic' | 'brand' | 'component'
  >('all');

  // Live Validator Playground state
  const [validatorInput, setValidatorInput] = useState<string>(VALIDATOR_PRESETS[0].json);

  // Live Sandbox state
  const [sandboxBrand, setSandboxBrand] = useState<BrandId>('brand-alpha');
  const [sandboxTheme, setSandboxTheme] = useState<ThemeId>('light');
  const [nestedScopeTheme, setNestedScopeTheme] = useState<ThemeId>('dark');
  const [customRadiusOverride, setCustomRadiusOverride] = useState<number | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExportBundle = () => {
    const bundle = {
      repository: 'https://github.com/kpsolo/ds-template.git',
      auditedAt: '2026-10-15',
      summary: {
        totalFindings: AUDIT_FINDINGS.length,
        criticalBugsFixed: 2,
        highPriorityFixes: 4,
        mediumEnhancements: 4,
      },
      findings: AUDIT_FINDINGS,
      patchedFiles: PATCHED_FILES,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ds-template-improvements-bundle.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredFindings = useMemo(() => {
    return AUDIT_FINDINGS.filter((item) => {
      const matchesSeverity =
        severityFilter === 'all' || item.severity === severityFilter;
      const matchesCategory =
        categoryFilter === 'all' || item.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.file.toLowerCase().includes(q) ||
        item.rootCause.toLowerCase().includes(q) ||
        item.recommendation.toLowerCase().includes(q);
      return matchesSeverity && matchesCategory && matchesQuery;
    });
  }, [severityFilter, categoryFilter, searchQuery]);

  const selectedFinding = useMemo(() => {
    return (
      filteredFindings.find((f) => f.id === selectedFindingId) ||
      filteredFindings[0] ||
      AUDIT_FINDINGS[0]
    );
  }, [filteredFindings, selectedFindingId]);

  // Live Validator simulation
  const validatorDiagnostics = useMemo(() => {
    try {
      const parsed = JSON.parse(validatorInput);
      const flat: Record<string, {value: unknown; type: string | null}> = {};

      const walk = (
        obj: Record<string, unknown>,
        prefix = '',
        inheritedType: string | null = null
      ) => {
        const currentType =
          typeof obj.$type === 'string' ? obj.$type : inheritedType;
        for (const [k, v] of Object.entries(obj)) {
          if (k.startsWith('$')) continue;
          const nextPath = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object' && !('$value' in v)) {
            walk(v as Record<string, unknown>, nextPath, currentType);
          } else if (v && typeof v === 'object' && '$value' in v) {
            const leaf = v as {$value: unknown; $type?: string};
            flat[nextPath] = {
              value: leaf.$value,
              type: leaf.$type || currentType,
            };
          }
        }
      };

      walk(parsed);

      const legacyErrors: string[] = [];
      const upgradedErrors: string[] = [];

      const extractRefs = (val: unknown): string[] => {
        if (typeof val !== 'string') return [];
        const matches = [...val.matchAll(/\{([^}]+)\}/g)];
        return matches.map((m) => m[1]);
      };

      for (const [tokenPath, def] of Object.entries(flat)) {
        const refs = extractRefs(def.value);
        for (const r of refs) {
          if (!(r in flat)) {
            legacyErrors.push(`Broken reference: "${tokenPath}" -> {${r}} not found`);
            upgradedErrors.push(
              `Broken reference: "${tokenPath}" -> {${r}} not found`
            );
          }
        }
        if (!def.type) {
          upgradedErrors.push(
            `Missing DTCG $type on "${tokenPath}" (no explicit or parent group $type)`
          );
        }
      }

      // Cycle detection
      const detectCycle = (
        start: string,
        visited = new Set<string>(),
        stack: string[] = []
      ): string | null => {
        if (visited.has(start)) {
          return [...stack, start].join(' -> ');
        }
        const node = flat[start];
        if (!node) return null;
        visited.add(start);
        stack.push(start);
        for (const ref of extractRefs(node.value)) {
          const c = detectCycle(ref, new Set(visited), [...stack]);
          if (c) return c;
        }
        return null;
      };

      for (const tokenPath of Object.keys(flat)) {
        const cycle = detectCycle(tokenPath);
        if (cycle) {
          upgradedErrors.push(`Circular alias cycle detected: ${cycle}`);
        }
      }

      return {
        validJson: true,
        tokenCount: Object.keys(flat).length,
        legacyErrors,
        upgradedErrors,
      };
    } catch (e) {
      return {
        validJson: false,
        tokenCount: 0,
        legacyErrors: [`JSON Syntax Error: ${(e as Error).message}`],
        upgradedErrors: [`JSON Syntax Error: ${(e as Error).message}`],
      };
    }
  }, [validatorInput]);

  const filteredTokens = useMemo(() => {
    return REPO_TOKENS.filter((t) => {
      const matchesLayer =
        tokenLayerFilter === 'all' || t.layer === tokenLayerFilter;
      const q = tokenSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.path.toLowerCase().includes(q) ||
        t.cssVar.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q));
      return matchesLayer && matchesSearch;
    });
  }, [tokenLayerFilter, tokenSearch]);

  const customContrastRatio = useMemo(
    () => calculateContrastRatio(customFg, customBg),
    [customFg, customBg]
  );

  const currentSandboxTokens =
    SANDBOX_THEMES[`${sandboxBrand}-${sandboxTheme}`];
  const nestedSandboxTokens =
    SANDBOX_THEMES[`${sandboxBrand}-${nestedScopeTheme}`];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: Strict 3-Zone Header separated by gap-8 */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('audit');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          style={{fontFamily: 'var(--font-display), sans-serif'}}
        >
          TokenOps Studio
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'audit'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Audit Findings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('patches')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'patches'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Code Patches
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contrast')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'contrast'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Contrast Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('explorer')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'explorer'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Token Explorer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'sandbox'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Live Sandbox
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleExportBundle}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Patched Bundle
          </button>
        </div>
      </header>

      {/* Workspace Layout: Sidebar + Main Viewport */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Left Navigation & Repository Context Sidebar (260px on desktop) */}
        <aside className="w-full lg:w-[264px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-5 flex flex-col justify-between gap-6">
          <div className="space-y-6">
            {/* Repository Context */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-slate-500">
                Target Repository
              </div>
              <div
                className="text-sm font-semibold text-slate-900 font-mono truncate"
                title="github.com/kpsolo/ds-template"
              >
                kpsolo/ds-template
              </div>
              <div className="text-xs text-slate-500 leading-relaxed">
                Style Dictionary v5.6 · W3C DTCG · Vite 6 · Multi-Brand Tokens
              </div>
            </div>

            <hr className="border-slate-200" />

            {/* Module Navigation */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-500 px-2 pb-1">
                Workbench Modules
              </div>
              {[
                {
                  id: 'audit' as ActiveTab,
                  label: '01. Audit Findings',
                  count: '10',
                  icon: AlertTriangle,
                },
                {
                  id: 'patches' as ActiveTab,
                  label: '02. Code Patches',
                  count: '3 files',
                  icon: FileCode,
                },
                {
                  id: 'contrast' as ActiveTab,
                  label: '03. Contrast Matrix',
                  count: '32 pairs',
                  icon: ShieldCheck,
                },
                {
                  id: 'explorer' as ActiveTab,
                  label: '04. Token Explorer',
                  count: '124 vars',
                  icon: Layers,
                },
                {
                  id: 'sandbox' as ActiveTab,
                  label: '05. Live Sandbox',
                  count: '3 brands',
                  icon: Sliders,
                },
              ].map((nav) => {
                const Icon = nav.icon;
                const isActive = activeTab === nav.id;
                return (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => setActiveTab(nav.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{nav.label}</span>
                    </span>
                    <span
                      className={`font-mono tabular-nums text-[11px] ${
                        isActive ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {nav.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <hr className="border-slate-200" />

            {/* Executive Audit Scorecard */}
            <div className="space-y-3">
              <div className="text-xs font-medium text-slate-500">
                Audit Health Breakdown
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-red-700 font-medium">Critical Bugs</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    2 (F-01, F-02)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-amber-700 font-medium">
                    High Priority Gaps
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    4 (F-03 – F-06)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 font-medium">
                    Architecture & DX
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    3 (F-07 – F-09)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700 font-medium">
                    CI Smoke Gates
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    1 (F-10)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick CLI Command Copy */}
          <div className="pt-4 border-t border-slate-200 space-y-2">
            <div className="text-xs font-medium text-slate-500">
              Verification Command
            </div>
            <div className="flex items-center justify-between gap-2 bg-slate-100 px-3 py-2 rounded-md border border-slate-200">
              <code className="text-[11px] font-mono text-slate-800 truncate">
                pnpm validate && pnpm build
              </code>
              <button
                type="button"
                onClick={() =>
                  handleCopy('pnpm validate && pnpm build', 'cli-cmd')
                }
                className="text-slate-500 hover:text-slate-900 shrink-0 cursor-pointer"
                title="Copy command"
              >
                {copiedId === 'cli-cmd' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-6 lg:p-8 space-y-8">
          {/* Hero Section + Quantitative KPI Strip */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <div className="text-xs font-medium text-slate-500">
                  Architecture Review · github.com/kpsolo/ds-template · Style
                  Dictionary v5.6.1
                </div>
                <h1
                  className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900"
                  style={{
                    fontFamily: 'var(--font-display), sans-serif',
                    textWrap: 'balance',
                  }}
                >
                  Design System Token Pipeline Audit & Remediation Workbench
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed max-w-[70ch]">
                  Your 4-layer W3C DTCG token taxonomy (Primitives, Semantic,
                  Brand, Component) is clean and well-structured, but two
                  critical bugs in{' '}
                  <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    scripts/build-tokens.mjs
                  </code>{' '}
                  currently drop 87.5% of primitive tokens in Figma exports and
                  break Node ESM package imports. Explore all 10 prioritized
                  improvements, inspect line-by-line patches, or test the
                  remediated pipeline below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('patches')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Inspect Patched Scripts
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('contrast')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Run WCAG Contrast Audit
                </button>
              </div>
            </div>

            {/* 4-Column Quantitative Proof Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  Figma Export Token Recovery
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  12.5% → 100%
                </div>
                <div className="text-xs text-slate-600">
                  Fixes shallow <code className="font-mono">Object.assign</code>{' '}
                  clobbering 7/8 primitive files
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  Package Entrypoint Resolution
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  ESM + .d.ts Fixed
                </div>
                <div className="text-xs text-slate-600">
                  Emits compiled <code className="font-mono">dist/ts/index.js</code>{' '}
                  &amp; <code className="font-mono">index.d.ts</code>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  WCAG 2.1 AA Text Contrast
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  2.56:1 → 4.76:1+
                </div>
                <div className="text-xs text-slate-600">
                  Remediates <code className="font-mono">text.tertiary</code> on
                  light &amp; dark surfaces
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-slate-500">
                  Brand Onboarding Effort
                </div>
                <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
                  4 Files → 0 Edits
                </div>
                <div className="text-xs text-slate-600">
                  Auto-discovers brands from{' '}
                  <code className="font-mono">src/tokens/brands/*</code>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================================
              MODULE 1: ARCHITECTURE AUDIT & FINDINGS
             ================================================================= */}
          {activeTab === 'audit' && (
            <div className="space-y-8">
              {/* Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4">
                {/* Interactive Segmented Severity Filter */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(
                    [
                      {id: 'all', label: 'All Findings (10)'},
                      {id: 'critical', label: 'Critical (2)'},
                      {id: 'high', label: 'High (4)'},
                      {id: 'medium', label: 'Medium (3)'},
                      {id: 'enhancement', label: 'Enhancement (1)'},
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSeverityFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        severityFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Category Select + Search Input */}
                <div className="flex items-center gap-3">
                  <select
                    aria-label="Filter by category"
                    value={categoryFilter}
                    onChange={(e) =>
                      setCategoryFilter(e.target.value as Category | 'all')
                    }
                    className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
                  >
                    <option value="all">All Categories</option>
                    <option value="Build Pipeline">Build Pipeline</option>
                    <option value="Figma Sync">Figma Sync</option>
                    <option value="Validation & CI">Validation &amp; CI</option>
                    <option value="Accessibility (WCAG)">
                      Accessibility (WCAG)
                    </option>
                    <option value="CSS & Tailwind v4">
                      CSS &amp; Tailwind v4
                    </option>
                    <option value="Token Architecture">
                      Token Architecture
                    </option>
                  </select>

                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by file, token, or issue..."
                      className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Master-Detail Split Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Finding List (5 cols) */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
                  {filteredFindings.length === 0 ? (
                    <div className="p-8 text-center space-y-3">
                      <div className="text-sm font-semibold text-slate-900">
                        No findings match your current filters
                      </div>
                      <p className="text-xs text-slate-500">
                        Reset the severity or search query to inspect all 10
                        repository improvements.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSeverityFilter('all');
                          setCategoryFilter('all');
                          setSearchQuery('');
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  ) : (
                    filteredFindings.map((item) => {
                      const isSelected = selectedFinding.id === item.id;
                      const sev = SEVERITY_LABELS[item.severity];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedFindingId(item.id)}
                          className={`w-full text-left p-4 transition-colors cursor-pointer block space-y-1.5 ${
                            isSelected
                              ? 'bg-blue-50/70'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Unboxed static metadata with typographic separators */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                            <span className="font-semibold text-slate-900">
                              {item.index}.
                            </span>
                            <span className={sev.textClass}>{sev.label}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.category}</span>
                          </div>
                          <div className="text-sm font-semibold text-slate-900 leading-snug">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 font-mono truncate">
                            {item.file} · {item.lines}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Right Column: Selected Finding Deep-Dive & Code Diff (7 cols) */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <div className="space-y-2 border-b border-slate-200 pb-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                      <span className="font-semibold text-slate-900">
                        Finding {selectedFinding.index} ({selectedFinding.id})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          SEVERITY_LABELS[selectedFinding.severity].textClass
                        }
                      >
                        {SEVERITY_LABELS[selectedFinding.severity].label}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedFinding.file}</span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedFinding.lines}</span>
                    </div>
                    <h2
                      className="text-xl font-bold text-slate-900"
                      style={{fontFamily: 'var(--font-display), sans-serif'}}
                    >
                      {selectedFinding.title}
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedFinding.impactSummary}
                    </p>
                  </div>

                  {/* Root Cause & Recommendation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-semibold text-slate-900">
                        Root Cause Analysis
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {selectedFinding.rootCause}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-xs font-semibold text-slate-900">
                        Recommended Architectural Fix
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {selectedFinding.recommendation}
                      </p>
                    </div>
                  </div>

                  {/* Mechanism-to-Outcome Bar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-900">
                      Measurable Outcome:
                    </span>
                    <span className="text-slate-700">
                      {selectedFinding.measurableOutcome}
                    </span>
                  </div>

                  {/* Before vs After Code Comparison */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-red-700">
                          Current Implementation ({selectedFinding.file})
                        </span>
                        <span className="font-mono text-slate-500">
                          {selectedFinding.lines}
                        </span>
                      </div>
                      <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
                        <code>{selectedFinding.beforeCode}</code>
                      </pre>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-700">
                          Recommended Remediation Patch
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(
                              selectedFinding.afterCode,
                              `patch-${selectedFinding.id}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          {copiedId === `patch-${selectedFinding.id}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Copied Patch
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Remediation Code
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-4 bg-slate-950 text-emerald-200 border border-emerald-900/40 rounded-lg text-xs font-mono overflow-x-auto leading-relaxed">
                        <code>{selectedFinding.afterCode}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Validator Simulator (Demonstrating Finding F-05 Live) */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-mono">
                      Interactive Verification · Finding 05 (scripts/validate-tokens.mjs)
                    </div>
                    <h2
                      className="text-lg font-bold text-slate-900"
                      style={{fontFamily: 'var(--font-display), sans-serif'}}
                    >
                      Live DTCG Cycle &amp; $type Validator Comparison
                    </h2>
                    <p className="text-xs text-slate-600">
                      Test how the current{' '}
                      <code className="font-mono">validate-tokens.mjs</code>{' '}
                      behaves versus the upgraded validator with graph cycle
                      detection and inherited W3C DTCG{' '}
                      <code className="font-mono">$type</code> checks.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {VALIDATOR_PRESETS.map((preset, idx) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setValidatorInput(preset.json)}
                        className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Preset {idx + 1}: {preset.name.split(' (')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-6 space-y-2">
                    <label
                      htmlFor="validator-json-input"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Input Token JSON Snippet (Editable)
                    </label>
                    <textarea
                      id="validator-json-input"
                      rows={11}
                      value={validatorInput}
                      onChange={(e) => setValidatorInput(e.target.value)}
                      className="w-full p-3.5 bg-slate-950 text-slate-100 font-mono text-xs rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
                    />
                  </div>

                  <div className="lg:col-span-6 space-y-4">
                    {/* Current Repo Validator Output */}
                    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          Current Repo Validator (scripts/validate-tokens.mjs)
                        </span>
                        <span className="font-mono tabular-nums text-slate-500">
                          {validatorDiagnostics.tokenCount} leaf tokens parsed
                        </span>
                      </div>
                      {validatorDiagnostics.legacyErrors.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            Passed! (False positive if cyclic aliases or missing
                            $type exist)
                          </span>
                        </div>
                      ) : (
                        <ul className="space-y-1 text-xs font-mono text-red-700">
                          {validatorDiagnostics.legacyErrors.map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Upgraded Validator Output */}
                    <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">
                          Upgraded TokenOps Validator (Cycle + DTCG $type Gate)
                        </span>
                        <span className="font-mono tabular-nums text-slate-500">
                          Strict DTCG Mode
                        </span>
                      </div>
                      {validatorDiagnostics.upgradedErrors.length === 0 ? (
                        <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>
                            All DTCG $type declarations and alias graphs
                            verified with zero cycles.
                          </span>
                        </div>
                      ) : (
                        <ul className="space-y-1.5 text-xs font-mono text-red-700">
                          {validatorDiagnostics.upgradedErrors.map((err, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>{err}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* =================================================================
              MODULE 2: READY-TO-MERGE CODE PATCHES
             ================================================================= */}
          {activeTab === 'patches' && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-mono">
                    Drop-In Replacements for kpsolo/ds-template
                  </div>
                  <h2
                    className="text-xl font-bold text-slate-900"
                    style={{fontFamily: 'var(--font-display), sans-serif'}}
                  >
                    Complete Remediated Build &amp; Validation Scripts
                  </h2>
                  <p className="text-xs text-slate-600">
                    Copy or download these drop-in files to resolve Findings
                    01–09 immediately in your repository.
                  </p>
                </div>

                {/* File Switcher Tabs */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {Object.entries(PATCHED_FILES).map(([key, fileObj]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActivePatchFile(key)}
                      className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activePatchFile === key
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {fileObj.filename}
                    </button>
                  ))}
                </div>
              </div>

              {PATCHED_FILES[activePatchFile] && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="space-y-0.5">
                      <div className="text-xs font-mono font-semibold text-slate-900">
                        {PATCHED_FILES[activePatchFile].filename}
                      </div>
                      <p className="text-xs text-slate-600">
                        {PATCHED_FILES[activePatchFile].description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            PATCHED_FILES[activePatchFile].code,
                            `full-${activePatchFile}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {copiedId === `full-${activePatchFile}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied File
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Full File
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <pre className="p-5 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed max-h-[600px]">
                    <code>{PATCHED_FILES[activePatchFile].code}</code>
                  </pre>
                </div>
              )}
            </section>
          )}

          {/* =================================================================
              MODULE 3: WCAG 2.1 CONTRAST MATRIX & AUTO-REMEDIATION
             ================================================================= */}
          {activeTab === 'contrast' && (
            <div className="space-y-6">
              <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-500 font-mono">
                      WCAG 2.1 1.4.3 Contrast (Minimum) · 8 Semantic Token
                      Pairings × 4 Permutations
                    </div>
                    <h2
                      className="text-xl font-bold text-slate-900"
                      style={{fontFamily: 'var(--font-display), sans-serif'}}
                    >
                      Semantic Color Contrast Audit Matrix
                    </h2>
                    <p className="text-xs text-slate-600">
                      Toggle the WCAG Remediation preview to see how updating{' '}
                      <code className="font-mono">
                        semantic.color.text.tertiary
                      </code>{' '}
                      eliminates all AA contrast failures across Alpha Tech and
                      Beta FinTech.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                      {(
                        [
                          {id: 'brand-alpha-light', label: 'Alpha Light'},
                          {id: 'brand-alpha-dark', label: 'Alpha Dark'},
                          {id: 'brand-beta-light', label: 'Beta Light'},
                          {id: 'brand-beta-dark', label: 'Beta Dark'},
                        ] as const
                      ).map((perm) => (
                        <button
                          key={perm.id}
                          type="button"
                          onClick={() => setActiveContrastPerm(perm.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            activeContrastPerm === perm.id
                              ? 'bg-white text-slate-900 shadow-xs font-semibold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {perm.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setApplyWcagRemediation(!applyWcagRemediation)
                      }
                      className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        applyWcagRemediation
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {applyWcagRemediation
                        ? 'Showing Remediated Palette (100% AA)'
                        : 'Simulate WCAG AA Remediation'}
                    </button>
                  </div>
                </div>

                {/* High-Density Data Grid */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-3 pr-4">Semantic Pairing</th>
                        <th className="py-3 px-4">Live Preview</th>
                        <th className="py-3 px-4">Foreground Token</th>
                        <th className="py-3 px-4">Background Token</th>
                        <th className="py-3 px-4 text-right">Contrast Ratio</th>
                        <th className="py-3 pl-4 text-right">WCAG 2.1 Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {CONTRAST_PAIRS.map((pair) => {
                        const baseResult = pair.results[activeContrastPerm];
                        // If remediation is enabled and this is cp-3 (tertiary text), apply the remediated token values
                        let fg = baseResult.fg;
                        const bg = baseResult.bg;
                        if (applyWcagRemediation && pair.id === 'cp-3') {
                          fg =
                            activeContrastPerm === 'brand-alpha-light'
                              ? '#64748b'
                              : activeContrastPerm === 'brand-alpha-dark'
                              ? '#94a3b8'
                              : activeContrastPerm === 'brand-beta-light'
                              ? '#56665e'
                              : '#8fa398';
                        }
                        const ratio = calculateContrastRatio(fg, bg);
                        const passAA = ratio >= pair.requiredRatio;
                        const passAAA = ratio >= 7.0;

                        return (
                          <tr
                            key={pair.id}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-3 pr-4">
                              <div className="font-semibold text-slate-900">
                                {pair.label}
                              </div>
                              <div className="text-slate-500">
                                {pair.usageContext}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div
                                className="px-3 py-1.5 rounded border text-xs font-medium inline-block whitespace-nowrap"
                                style={{
                                  backgroundColor: bg,
                                  color: fg,
                                  borderColor: 'rgba(148, 163, 184, 0.35)',
                                }}
                              >
                                Aa Token Sample 01
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                              <div>{pair.foregroundToken}</div>
                              <div className="text-slate-500">{fg}</div>
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                              <div>{pair.backgroundToken}</div>
                              <div className="text-slate-500">{bg}</div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-sm text-slate-900">
                              {ratio.toFixed(2)}:1
                            </td>
                            <td className="py-3 pl-4 text-right font-mono tabular-nums">
                              {passAAA ? (
                                <span className="text-emerald-700 font-semibold">
                                  AAA Pass (≥7.0:1)
                                </span>
                              ) : passAA ? (
                                <span className="text-blue-700 font-semibold">
                                  AA Pass (≥4.5:1)
                                </span>
                              ) : (
                                <span className="text-red-700 font-semibold">
                                  Fail (&lt;4.5:1)
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Interactive Contrast Calculator Sandbox */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="space-y-1">
                  <h3
                    className="text-base font-bold text-slate-900"
                    style={{fontFamily: 'var(--font-display), sans-serif'}}
                  >
                    Interactive Token Contrast Calculator
                  </h3>
                  <p className="text-xs text-slate-600">
                    Fine-tune any foreground and surface hex combination before
                    committing changes to{' '}
                    <code className="font-mono">light.tokens.json</code> or{' '}
                    <code className="font-mono">dark.tokens.json</code>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Foreground Hex Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customFg}
                        onChange={(e) => setCustomFg(e.target.value)}
                        className="w-10 h-9 rounded border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customFg}
                        onChange={(e) => setCustomFg(e.target.value)}
                        className="flex-1 h-9 px-3 text-xs font-mono border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Background Surface Hex Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customBg}
                        onChange={(e) => setCustomBg(e.target.value)}
                        className="w-10 h-9 rounded border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={customBg}
                        onChange={(e) => setCustomBg(e.target.value)}
                        className="flex-1 h-9 px-3 text-xs font-mono border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div
                    className="p-4 rounded-lg border border-slate-200 flex items-center justify-between"
                    style={{backgroundColor: customBg, color: customFg}}
                  >
                    <div>
                      <div className="text-sm font-semibold">
                        Sample Token Text
                      </div>
                      <div className="text-xs opacity-90">
                        {customContrastRatio >= 4.5
                          ? 'Passes WCAG AA (4.5:1)'
                          : 'Fails WCAG AA (Requires 4.5:1)'}
                      </div>
                    </div>
                    <div className="text-xl font-bold font-mono tabular-nums">
                      {customContrastRatio}:1
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* =================================================================
              MODULE 4: DTCG TOKEN EXPLORER & MULTI-BRAND DICTIONARY
             ================================================================= */}
          {activeTab === 'explorer' && (
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-mono">
                    4-Layer W3C DTCG Token Dictionary · Cross-Brand Resolution
                  </div>
                  <h2
                    className="text-xl font-bold text-slate-900"
                    style={{fontFamily: 'var(--font-display), sans-serif'}}
                  >
                    Multi-Brand Token Explorer
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(
                      [
                        {id: 'all', label: 'All Layers'},
                        {id: 'semantic', label: 'Semantic'},
                        {id: 'brand', label: 'Brand'},
                        {id: 'component', label: 'Component'},
                      ] as const
                    ).map((layer) => (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => setTokenLayerFilter(layer.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          tokenLayerFilter === layer.id
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {layer.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={tokenSearch}
                      onChange={(e) => setTokenSearch(e.target.value)}
                      placeholder="Search token path or CSS var..."
                      className="w-full h-9 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 pr-4">DTCG Token Path &amp; CSS Var</th>
                      <th className="py-3 px-4">Layer · $type</th>
                      <th className="py-3 px-4">Alpha Tech (Light / Dark)</th>
                      <th className="py-3 px-4">Beta FinTech (Light / Dark)</th>
                      <th className="py-3 pl-4 text-right">Copy Var</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {filteredTokens.map((tok) => (
                      <tr
                        key={tok.path}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="font-mono font-semibold text-slate-900">
                            {tok.path}
                          </div>
                          <div className="font-mono text-slate-500">
                            var({tok.cssVar})
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {tok.layer} · {tok.type}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          <div className="flex items-center gap-2">
                            {tok.type === 'color' && (
                              <span
                                className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0"
                                style={{
                                  backgroundColor:
                                    tok.values['brand-alpha-light'],
                                }}
                              />
                            )}
                            <span className="text-slate-900">
                              {tok.values['brand-alpha-light']}
                            </span>
                            <span className="text-slate-400">/</span>
                            {tok.type === 'color' && (
                              <span
                                className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0"
                                style={{
                                  backgroundColor:
                                    tok.values['brand-alpha-dark'],
                                }}
                              />
                            )}
                            <span className="text-slate-600">
                              {tok.values['brand-alpha-dark']}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums">
                          <div className="flex items-center gap-2">
                            {tok.type === 'color' && (
                              <span
                                className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0"
                                style={{
                                  backgroundColor:
                                    tok.values['brand-beta-light'],
                                }}
                              />
                            )}
                            <span className="text-slate-900">
                              {tok.values['brand-beta-light']}
                            </span>
                            <span className="text-slate-400">/</span>
                            {tok.type === 'color' && (
                              <span
                                className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0"
                                style={{
                                  backgroundColor:
                                    tok.values['brand-beta-dark'],
                                }}
                              />
                            )}
                            <span className="text-slate-600">
                              {tok.values['brand-beta-dark']}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pl-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(`var(${tok.cssVar})`, tok.cssVar)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                          >
                            {copiedId === tok.cssVar ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* =================================================================
              MODULE 5: MULTI-BRAND LIVE COMPONENT SANDBOX
             ================================================================= */}
          {activeTab === 'sandbox' && (
            <div className="space-y-6">
              {/* Controls Bar */}
              <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-slate-500 font-mono">
                    Interactive Preview · Zero-Config Brand Discovery Demo
                  </div>
                  <h2
                    className="text-lg font-bold text-slate-900"
                    style={{fontFamily: 'var(--font-display), sans-serif'}}
                  >
                    Multi-Brand &amp; Sub-Tree Theme Scoping Workbench
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Brand Selector */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(
                      [
                        {id: 'brand-alpha', label: 'Alpha Tech'},
                        {id: 'brand-beta', label: 'Beta FinTech'},
                        {id: 'brand-gamma', label: 'Gamma Media (New)'},
                      ] as const
                    ).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSandboxBrand(b.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          sandboxBrand === b.id
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>

                  {/* Theme Selector */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(['light', 'dark'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setSandboxTheme(t);
                          setNestedScopeTheme(t === 'light' ? 'dark' : 'light');
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          sandboxTheme === t
                            ? 'bg-white text-slate-900 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t} Mode
                      </button>
                    ))}
                  </div>

                  {/* Radius Tuner */}
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>Radius Override:</span>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={
                        customRadiusOverride ??
                        parseInt(currentSandboxTokens.radiusButton, 10)
                      }
                      onChange={(e) =>
                        setCustomRadiusOverride(Number(e.target.value))
                      }
                      className="w-24 accent-blue-600 cursor-pointer"
                    />
                    {customRadiusOverride !== null && (
                      <button
                        type="button"
                        onClick={() => setCustomRadiusOverride(null)}
                        className="text-blue-600 hover:underline text-xs cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* Live Themed Canvas */}
              <section
                className="rounded-xl border p-6 lg:p-8 transition-colors space-y-6"
                style={{
                  backgroundColor: currentSandboxTokens.canvas,
                  color: currentSandboxTokens.textPrimary,
                  borderColor: currentSandboxTokens.borderDefault,
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b"
                  style={{borderColor: currentSandboxTokens.borderDefault}}
                >
                  <div className="space-y-0.5">
                    <div
                      className="text-xs font-mono"
                      style={{color: currentSandboxTokens.textSecondary}}
                    >
                      data-brand=&quot;{sandboxBrand}&quot; · data-theme=&quot;{sandboxTheme}&quot; · color-scheme: {sandboxTheme}
                    </div>
                    <h3 className="text-xl font-bold">
                      {currentSandboxTokens.brandName} — Component Token Showcase
                    </h3>
                  </div>
                  <div
                    className="text-xs font-mono"
                    style={{color: currentSandboxTokens.textBrand}}
                  >
                    Font: {currentSandboxTokens.fontLabel} · Card Radius:{' '}
                    {customRadiusOverride !== null
                      ? `${customRadiusOverride}px`
                      : currentSandboxTokens.radiusCard}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Card 1: Interactive Buttons & States */}
                  <div
                    className="p-5 border space-y-4"
                    style={{
                      backgroundColor: currentSandboxTokens.surface,
                      borderColor: currentSandboxTokens.borderDefault,
                      borderRadius:
                        customRadiusOverride !== null
                          ? `${customRadiusOverride}px`
                          : currentSandboxTokens.radiusCard,
                    }}
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">
                        Button Component Tokens
                      </div>
                      <div
                        className="text-xs"
                        style={{color: currentSandboxTokens.textSecondary}}
                      >
                        Bound to <code className="font-mono">--ds-button-*</code>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        className="px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                        style={{
                          backgroundColor: currentSandboxTokens.primaryBg,
                          color: currentSandboxTokens.primaryText,
                          borderRadius:
                            customRadiusOverride !== null
                              ? `${customRadiusOverride}px`
                              : currentSandboxTokens.radiusButton,
                        }}
                      >
                        Primary Action
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 text-xs font-semibold border transition-colors cursor-pointer"
                        style={{
                          backgroundColor: currentSandboxTokens.subtle,
                          color: currentSandboxTokens.textPrimary,
                          borderColor: currentSandboxTokens.borderStrong,
                          borderRadius:
                            customRadiusOverride !== null
                              ? `${customRadiusOverride}px`
                              : currentSandboxTokens.radiusButton,
                        }}
                      >
                        Secondary
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white transition-opacity hover:opacity-90 cursor-pointer"
                        style={{
                          borderRadius:
                            customRadiusOverride !== null
                              ? `${customRadiusOverride}px`
                              : currentSandboxTokens.radiusButton,
                        }}
                      >
                        Danger
                      </button>
                    </div>

                    <div
                      className="pt-3 border-t text-xs font-mono space-y-1"
                      style={{
                        borderColor: currentSandboxTokens.borderDefault,
                        color: currentSandboxTokens.textMuted,
                      }}
                    >
                      <div>
                        Primary Fill: {currentSandboxTokens.primaryBg}
                      </div>
                      <div>
                        Remediated Muted Text: {currentSandboxTokens.textMuted}{' '}
                        (WCAG AA Pass)
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Form Input Tokens */}
                  <div
                    className="p-5 border space-y-4"
                    style={{
                      backgroundColor: currentSandboxTokens.surface,
                      borderColor: currentSandboxTokens.borderDefault,
                      borderRadius:
                        customRadiusOverride !== null
                          ? `${customRadiusOverride}px`
                          : currentSandboxTokens.radiusCard,
                    }}
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">
                        Form Input &amp; Focus Ring Tokens
                      </div>
                      <div
                        className="text-xs"
                        style={{color: currentSandboxTokens.textSecondary}}
                      >
                        Bound to <code className="font-mono">--ds-input-*</code>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label
                          className="block text-xs font-medium"
                          style={{color: currentSandboxTokens.textSecondary}}
                        >
                          Workspace Token Namespace
                        </label>
                        <input
                          type="text"
                          defaultValue="@ds-template/tokens"
                          className="w-full h-9 px-3 text-xs font-mono border focus:outline-none"
                          style={{
                            backgroundColor: currentSandboxTokens.surface,
                            borderColor: currentSandboxTokens.borderStrong,
                            color: currentSandboxTokens.textPrimary,
                            borderRadius:
                              customRadiusOverride !== null
                                ? `${customRadiusOverride}px`
                                : currentSandboxTokens.radiusInput,
                          }}
                        />
                      </div>
                      <div
                        className="text-xs"
                        style={{color: currentSandboxTokens.textMuted}}
                      >
                        Helper caption rendered using accessible{' '}
                        <code className="font-mono">text.muted</code> token.
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Nested Sub-Tree Theme Scoping */}
                  <div
                    className="p-5 border space-y-4"
                    style={{
                      backgroundColor: nestedSandboxTokens.surface,
                      color: nestedSandboxTokens.textPrimary,
                      borderColor: nestedSandboxTokens.borderStrong,
                      borderRadius:
                        customRadiusOverride !== null
                          ? `${customRadiusOverride}px`
                          : nestedSandboxTokens.radiusCard,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-mono"
                        style={{color: nestedSandboxTokens.textBrand}}
                      >
                        Nested [data-theme=&quot;{nestedScopeTheme}&quot;]
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setNestedScopeTheme(
                            nestedScopeTheme === 'light' ? 'dark' : 'light'
                          )
                        }
                        className="text-xs underline cursor-pointer"
                        style={{color: nestedSandboxTokens.textSecondary}}
                      >
                        Flip Sub-Tree
                      </button>
                    </div>
                    <div className="text-sm font-semibold">
                      Scoped Sub-Tree Container
                    </div>
                    <p
                      className="text-xs leading-relaxed"
                      style={{color: nestedSandboxTokens.textSecondary}}
                    >
                      Because <code className="font-mono">ds-template</code>{' '}
                      compiles attribute-scoped selectors, any DOM sub-tree can
                      override <code className="font-mono">data-brand</code> or{' '}
                      <code className="font-mono">data-theme</code> without
                      JavaScript re-renders.
                    </p>
                    <button
                      type="button"
                      className="px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                      style={{
                        backgroundColor: nestedSandboxTokens.primaryBg,
                        color: nestedSandboxTokens.primaryText,
                        borderRadius:
                          customRadiusOverride !== null
                            ? `${customRadiusOverride}px`
                            : nestedSandboxTokens.radiusButton,
                      }}
                    >
                      Scoped CTA ({nestedSandboxTokens.themeName})
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

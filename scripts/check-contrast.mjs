// WCAG 2.x contrast audit for the OpenSource Assist design tokens.
// Focus: the navbar in both themes, plus the accent-token pairs used site-wide.
// Usage: node scripts/check-contrast.mjs  (exits 1 if any check fails)
//
// Requirements: 4.5:1 for normal text, 3:1 for large text / UI components
// (icons, button fills), 1.2:1 informational for borders/separation.

const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
}

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

// Tokens mirrored from src/index.css. Keep in sync.
const themes = {
  dark: {
    background: '#0d1117',
    surface: '#161b22',
    foreground: '#e6edf3',
    muted: '#8b949e',
    border: '#30363d',
    accent: '#ff8c00',
    accentText: '#ff8c00',
    accentHover: '#ffd700',
    onAccent: '#0d1117', // dark ink on accent fills in BOTH themes (white fails in light)
  },
  light: {
    background: '#f6f8fa',
    surface: '#ffffff',
    foreground: '#1f2328',
    muted: '#656d76',
    border: '#d0d7de',
    accent: '#e36209',
    accentText: '#bc4c0a', // darker orange for small accent-colored text
    accentHover: '#f07f1f', // brighter orange for solid-fill hovers
    onAccent: '#0d1117',
  },
}

const checks = [
  // [theme, description, fg, bg, required]
  ['dark', 'nav link on surface', 'foreground', 'surface', 4.5],
  ['dark', 'muted icon on nav surface (toggle)', 'muted', 'surface', 3],
  ['dark', 'toggle icon on its own bg-background chip', 'muted', 'background', 3],
  ['dark', 'CTA text on accent fill', 'onAccent', 'accent', 4.5],
  ['dark', 'logo tile icon on accent', 'onAccent', 'accent', 3],
  ['dark', 'small accent text on surface (eyebrow/link)', 'accentText', 'surface', 4.5],
  ['dark', 'on-accent ink on hover fill', 'onAccent', 'accentHover', 4.5],
  ['dark', 'nav border vs surface', 'border', 'surface', 1.2],
  ['light', 'nav link on surface', 'foreground', 'surface', 4.5],
  ['light', 'muted icon on nav surface (toggle)', 'muted', 'surface', 3],
  ['light', 'toggle icon on its own bg-background chip', 'muted', 'background', 3],
  ['light', 'CTA text on accent fill', 'onAccent', 'accent', 4.5],
  ['light', 'logo tile icon on accent', 'onAccent', 'accent', 3],
  ['light', 'small accent text on surface (eyebrow/link)', 'accentText', 'surface', 4.5],
  ['light', 'small accent text on background', 'accentText', 'background', 4.5],
  ['light', 'on-accent ink on hover fill', 'onAccent', 'accentHover', 4.5],
  ['light', 'nav border vs surface', 'border', 'surface', 1.2],
]

let failures = 0
for (const [theme, desc, fgKey, bgKey, required] of checks) {
  const t = themes[theme]
  const ratio = contrast(t[fgKey], t[bgKey])
  const ok = ratio >= required
  if (!ok) failures++
  console.log(
    `${theme.padEnd(5)} ${ok ? 'PASS' : 'FAIL'}  ${desc.padEnd(42)} ` +
      `${ratio.toFixed(2)}:1 (need ${required}:1)`,
  )
}

if (failures > 0) {
  console.error(`\n${failures} contrast check(s) failed.`)
  process.exit(1)
}
console.log('\nAll contrast checks passed.')

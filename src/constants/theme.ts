export const DarkColors = {
  canvas: '#090d16',
  surface: '#121824',
  surfaceElevated: '#1a2234',
  edge: '#232d42',
  ink: '#f3f4f6',
  muted: '#9ca3af',
  text: '#f3f4f6',
  textMuted: '#9ca3af',
  accent: '#f59e0b',
  telemetry: '#06b6d4',
  valid: '#10b981',
  signal: '#ef4444',
  cardBg: '#131b2a',
};

export const LightColors = {
  canvas: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#f1f5f9',
  edge: '#cbd5e1',
  ink: '#0f172a',
  muted: '#64748b',
  text: '#0f172a',
  textMuted: '#64748b',
  accent: '#d97706',
  telemetry: '#0891b2',
  valid: '#059669',
  signal: '#dc2626',
  cardBg: '#ffffff',
};

export const Colors = { ...DarkColors };

export function setGlobalThemeColors(colors: typeof DarkColors) {
  Object.assign(Colors, colors);
}

export function parseExtra(extraJson: string | null): Record<string, any> {
  if (!extraJson) return {};
  try { return JSON.parse(extraJson); } catch { return {}; }
}
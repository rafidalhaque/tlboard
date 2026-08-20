// deterministic accent hue from any string id/name — same seed always gets the same color,
// so a board or a user reads consistently across the app without storing a color anywhere
const HUES = [231, 262, 291, 199, 168, 25, 340, 12];

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function colorFor(seed: string): string {
  const hue = HUES[hashSeed(seed) % HUES.length];
  return `hsl(${hue} 70% 52%)`;
}

export function gradientFor(seed: string): string {
  const hue = HUES[hashSeed(seed) % HUES.length];
  return `linear-gradient(135deg, hsl(${hue} 70% 58%), hsl(${(hue + 40) % 360} 70% 42%))`;
}

export function initialsFor(nameOrEmail: string): string {
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrEmail.slice(0, 2).toUpperCase();
}

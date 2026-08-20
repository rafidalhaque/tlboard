import { colorFor, initialsFor } from "../lib/color.js";

export default function Avatar({ name, seed, size = 30 }: { name: string; seed?: string; size?: number }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: colorFor(seed || name) }}
    >
      {initialsFor(name)}
    </span>
  );
}

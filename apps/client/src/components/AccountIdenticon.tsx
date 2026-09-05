import React from "react";

interface AccountIdenticonProps {
  identifier: string | null | undefined;
  size?: number;
  className?: string;
}

function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Color palettes for avatar generation
const PALETTES = [
  { bg: "#1e1b4b", solid: "#6366f1", soft: "#312e81" }, // Indigo
  { bg: "#083344", solid: "#06b6d4", soft: "#164e63" }, // Cyan
  { bg: "#14532d", solid: "#22c55e", soft: "#166534" }, // Emerald
  { bg: "#581c87", solid: "#a855f7", soft: "#6b21a8" }, // Purple
  { bg: "#701a75", solid: "#d946ef", soft: "#86198f" }, // Fuchsia
  { bg: "#7c2d12", solid: "#f97316", soft: "#9a3412" }, // Orange
  { bg: "#0f172a", solid: "#38bdf8", soft: "#1e293b" }, // Slate Sky
];

export const AccountIdenticon: React.FC<AccountIdenticonProps> = ({
  identifier,
  size = 48,
  className = "",
}) => {
  const seedStr = (identifier || "tunnix-user").toLowerCase().trim();
  const seed = hashString(seedStr);
  const palette = PALETTES[seed % PALETTES.length];

  // Generate 5x5 mirrored matrix (3 columns, middle mirrored to left & right)
  const cells: boolean[][] = [];
  for (let row = 0; row < 5; row++) {
    const rowCells: boolean[] = [];
    for (let col = 0; col < 3; col++) {
      const bitIndex = (row * 3 + col) % 31;
      rowCells.push(Boolean((seed >> bitIndex) & 1));
    }
    // Mirror: col 0, 1, 2, 1, 0
    cells.push([rowCells[0], rowCells[1], rowCells[2], rowCells[1], rowCells[0]]);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      className={className}
      style={{ borderRadius: "50%", flexShrink: 0, overflow: "hidden", display: "inline-block" }}
      aria-label={`Avatar for ${seedStr}`}
    >
      <rect width="72" height="72" rx="36" fill={palette.bg} />
      <circle cx="36" cy="36" r="30" fill={palette.soft} opacity="0.6" />

      {cells.map((row, r) =>
        row.map((filled, c) => {
          if (!filled) return null;
          return (
            <rect
              key={`${r}-${c}`}
              x={13 + c * 9.2}
              y={13 + r * 9.2}
              width="8"
              height="8"
              rx="2.5"
              fill={palette.solid}
            />
          );
        })
      )}

      <circle cx="36" cy="36" r="34" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
    </svg>
  );
};

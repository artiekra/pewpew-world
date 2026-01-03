"use client";

import { useMemo } from "react";

interface TextSegment {
  text: string;
  color: string;
}

interface ColorizedTextProps {
  text: string;
  glow?: boolean;
}

function parseColoredString(s: string): TextSegment[] {
  const parts = s.split("#");
  const segments: TextSegment[] = [];

  if (parts[0]) {
    segments.push({ text: parts[0], color: "ffffffff" });
  }

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (part.length >= 8) {
      const color = part.substring(0, 8);
      const text = part.substring(8);
      if (text) {
        segments.push({ text, color });
      }
    } else if (part.length > 0) {
      segments.push({ text: part, color: "ffffffff" });
    }
  }

  return segments;
}

function getSafeLightColor(r: number, g: number, b: number, alpha: number) {
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (luminance > 0.5) {
    const factor = 0.4 / luminance;
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    return `rgba(${newR}, ${newG}, ${newB}, ${alpha})`;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ColorizedText({
  text,
  glow = true,
}: ColorizedTextProps) {
  const segments = useMemo(() => parseColoredString(text), [text]);

  return (
    <span>
      <style jsx>{`
        .adaptive-color {
          color: var(--c-light);
        }
        :global([data-bs-theme="dark"]) .adaptive-color {
          color: var(--c-dark);
        }
      `}</style>

      {segments.map((segment, index) => {
        const r = parseInt(segment.color.substring(0, 2), 16);
        const g = parseInt(segment.color.substring(2, 4), 16);
        const b = parseInt(segment.color.substring(4, 6), 16);
        const a = parseInt(segment.color.substring(6, 8), 16);
        const alpha = a / 255;

        const colorDark = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        const colorLight = getSafeLightColor(r, g, b, alpha);

        return (
          <span
            key={index}
            className="adaptive-color"
            style={
              {
                "--c-dark": colorDark,
                "--c-light": colorLight,
              } as React.CSSProperties
            }
          >
            {segment.text}
          </span>
        );
      })}
    </span>
  );
}

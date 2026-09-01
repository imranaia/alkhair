"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Smartphone, HandCoins, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "@/components/marketing/EditableText";

// Icons are fixed (there's no icon picker in the CMS) — the label/detail
// text for each stop comes from siteContent and is editable there.
const STOP_ICONS = [Smartphone, HandCoins, Landmark];

// The walked path passes above the first and last badge, but dips below the
// middle one — an S-curve, not a shallow arc — so it reads as a journey
// rather than a straight hop. Clears the 28px badge radius plus a gap. The
// middle stop's dip clears its own label + description text (measured, since
// that text is CMS-editable and can run to different lengths), not just the
// badge circle.
const CLEARANCE_ABOVE = 38;
const CLEARANCE_BELOW_TEXT = 16;

function pauseSvg(e: React.MouseEvent<SVGSVGElement>) {
  e.currentTarget.pauseAnimations();
}
function resumeSvg(e: React.MouseEvent<SVGSVGElement>) {
  e.currentTarget.unpauseAnimations();
}

type Point = { x: number; y: number };

// The narrative device for "how the money moves": a little figure that
// actually walks (leg-swing + body bob, not a coin or a sliding icon) along
// a single curved path from the first stop to the last, at a steady pace,
// looping back to the start rather than walking the trip in reverse. The
// path is drawn through the stops' real measured positions, so it tracks
// correctly in both the stacked mobile layout and the row layout on
// desktop. Hover the path to pause it and get a closer look.
export function MoneyFlowDiagram({
  steps,
  editMode,
  onSaveStep,
}: {
  steps: { label: string; detail: string }[];
  editMode?: boolean;
  onSaveStep?: (index: number, key: "label" | "detail") => (next: string) => Promise<{ error: string | null }>;
}) {
  const reduce = !!useReducedMotion();
  const stops = STOP_ICONS.map((icon, i) => ({ icon, label: steps[i]?.label ?? "", detail: steps[i]?.detail ?? "" }));

  const containerRef = useRef<HTMLDivElement>(null);
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const stopRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [positions, setPositions] = useState<Point[] | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      const next: Point[] = [];
      badgeRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = r.left + r.width / 2 - containerRect.left;
        if (i === 1) {
          // Below the whole stop's content (badge + label + description),
          // not just the badge — the text is editable and can run longer.
          const stopEl = stopRefs.current[i];
          const bottom = stopEl ? stopEl.getBoundingClientRect().bottom - containerRect.top : r.bottom - containerRect.top;
          next.push({ x, y: bottom + CLEARANCE_BELOW_TEXT });
        } else {
          next.push({ x, y: r.top + r.height / 2 - containerRect.top - CLEARANCE_ABOVE });
        }
      });
      if (next.length === 3) setPositions(next);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [steps]);

  // A smooth S — two cubic-bezier halves sharing a tangent at the middle
  // point (the "S" command reflects the previous control point), not a
  // shallow arc that kinks where it meets the center stop. Each half's
  // control points sit at the horizontal midpoint, held at each end's own
  // height, which is what gives the flowing "up, down, up" shape.
  const pathD = positions
    ? (() => {
        const [a, m, b] = positions;
        const mid1x = (a.x + m.x) / 2;
        const mid2x = (m.x + b.x) / 2;
        return `M${a.x},${a.y} C${mid1x},${a.y} ${mid1x},${m.y} ${m.x},${m.y} S${mid2x},${b.y} ${b.x},${b.y}`;
      })()
    : null;

  return (
    // pt-14 clears room above the topmost badge for the walking path.
    <div ref={containerRef} className="relative pt-14">
      {pathD && (
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full overflow-visible"
          onMouseEnter={pauseSvg}
          onMouseLeave={resumeSvg}
        >
          <path id="money-flow-path" d={pathD} fill="none" stroke="var(--border)" strokeWidth={2} />
          <Mascot reduce={reduce} pathId="money-flow-path" fallback={positions![0]} />
        </svg>
      )}

      <div className="relative flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-6">
        {stops.map((stop, i) => (
          <div
            key={i}
            ref={(el) => {
              stopRefs.current[i] = el;
            }}
            className={cn(
              "flex flex-col items-center gap-3 text-center md:w-64",
              i === 1 && "md:mt-8",
              i === 2 && "md:mt-4",
            )}
          >
            <div
              ref={(el) => {
                badgeRefs.current[i] = el;
              }}
              className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full"
              style={{
                background: "radial-gradient(circle at 32% 28%, oklch(0.92 0.1 90), var(--gold) 60%, oklch(0.58 0.1 75) 100%)",
                boxShadow: "inset 0 2px 2px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.18), 0 8px 20px -8px rgba(0,0,0,0.3)",
              }}
            >
              <stop.icon className="size-6 text-[oklch(0.28_0.04_75)]" strokeWidth={1.75} />
              {/* A small illustrated touch specific to each step, on top of
                  the icon — a finger tap, a coin changing hands, a deposit
                  landing — alongside the figure that walks the path above.
                  overflow-hidden on the badge above keeps every one of these
                  contained inside the circle instead of spilling onto the
                  plain page background. */}
              {!reduce && i === 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-[oklch(0.28_0.04_75)]/50"
                  style={{ animation: "money-flow-tap-ripple 2.2s ease-out infinite" }}
                />
              )}
              {!reduce && i === 1 && (
                // Starts low (clear of the centered hand-coins icon), rises
                // toward the top of the circle, and fades out before it
                // would cross the rim onto the plain background — the
                // keyframe below handles both the rise and the fade.
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs font-bold text-[oklch(0.28_0.04_75)]"
                  style={{ animation: "money-flow-coin-pop 2.6s ease-in-out infinite" }}
                >
                  ₦
                </span>
              )}
              {!reduce && i === 2 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-2 left-1/2 -ml-1 size-2 rounded-full bg-[oklch(0.28_0.04_75)]/70"
                  style={{ animation: "money-flow-deposit-slide 2.6s ease-in-out infinite" }}
                />
              )}
            </div>
            {editMode && onSaveStep ? (
              <>
                <EditableText value={stop.label} editMode={editMode} onSave={onSaveStep(i, "label")} className="text-sm font-semibold" />
                <EditableText
                  value={stop.detail}
                  editMode={editMode}
                  multiline
                  onSave={onSaveStep(i, "detail")}
                  className="max-w-[26ch] text-xs text-muted-foreground"
                />
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">{stop.label}</p>
                <p className="max-w-[26ch] text-xs text-muted-foreground">{stop.detail}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Original-design coordinate space for the figure below (a 64x92 unit
// canvas) — scaled down and re-centered on its feet so animateMotion (which
// positions this group's local origin along the path) plants the feet
// exactly on the walked line, not the figure's top-left corner.
const MASCOT_SCALE = 0.53;
const MASCOT_ORIGIN_X = 32 * MASCOT_SCALE;
const MASCOT_ORIGIN_Y = 92 * MASCOT_SCALE;

// A small illustrated figure — flat shapes (a torso rect, a head circle, arm
// and leg rects), not a stock icon — built the way a simple walking sprite
// is: two leg groups swing ±13deg from their own hip pivot, half a cycle out
// of phase via animation-delay, while the whole body dips at the midpoint of
// each stride. Colored from the same gold gradient as the static stop
// badges, so it reads as "the same journey," just animated. Travels the
// path once per lap, looping back to the start rather than reversing.
function Mascot({ reduce, pathId, fallback }: { reduce: boolean; pathId: string; fallback: Point }) {
  const legStyle = (delay: number) =>
    reduce
      ? undefined
      : ({ animation: `mascot-leg-swing 0.9s ease-in-out ${delay}s infinite` } as React.CSSProperties);
  const bodyStyle = reduce ? undefined : ({ animation: "mascot-bob 0.9s ease-in-out infinite" } as React.CSSProperties);

  const figure = (
    <g transform={`translate(${-MASCOT_ORIGIN_X},${-MASCOT_ORIGIN_Y}) scale(${MASCOT_SCALE})`}>
      <defs>
        <linearGradient id="mascotTorso" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold)" />
          <stop offset="1" stopColor="oklch(0.58 0.1 75)" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="88" rx="14" ry="3.2" fill="rgba(0,0,0,0.18)" />
      <g style={bodyStyle}>
        <rect x="15" y="34" width="6" height="20" rx="3" fill="oklch(0.28 0.04 75)" />
        <g style={{ ...legStyle(0), transformOrigin: "23.5px 54px" } as React.CSSProperties}>
          <rect x="20" y="54" width="7" height="24" rx="3.5" fill="oklch(0.2 0.03 75)" />
        </g>
        <g style={{ ...legStyle(0.45), transformOrigin: "40.5px 54px" } as React.CSSProperties}>
          <rect x="37" y="54" width="7" height="24" rx="3.5" fill="oklch(0.2 0.03 75)" />
        </g>
        <rect x="19" y="30" width="26" height="26" rx="9" fill="url(#mascotTorso)" />
        <circle cx="32" cy="16" r="11" fill="oklch(0.75 0.09 60)" />
        <rect x="41" y="34" width="6" height="18" rx="3" fill="oklch(0.28 0.04 75)" />
      </g>
    </g>
  );

  if (reduce) {
    return <g transform={`translate(${fallback.x},${fallback.y})`}>{figure}</g>;
  }

  return (
    <g>
      {/* Plain forward loop — 0% to 100% over one lap, then restarts at the
          first stop, rather than walking the trip in reverse. */}
      <animateMotion dur="15s" repeatCount="indefinite">
        <mpath href={`#${pathId}`} />
      </animateMotion>
      {figure}
    </g>
  );
}

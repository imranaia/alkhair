"use client";

import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { Smartphone, HandCoins, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditableText } from "@/components/marketing/EditableText";

// Icons are fixed (there's no icon picker in the CMS) — the label/detail
// text for each stop comes from siteContent and is editable there.
const STOP_ICONS = [Smartphone, HandCoins, Landmark];

const MASCOT_W = 34;
const MASCOT_H = 49;

// Visits stops in order and back — 0,1,2,1,0,1,2,1... — rather than
// snapping from the last stop straight back to the first.
const CYCLE = [0, 1, 2, 1];

type Point = { x: number; y: number };

// The narrative device for "how the money moves": a little figure that
// actually walks (leg-swing + body bob, not a coin or a sliding icon)
// between the three stops, measured against their real rendered positions
// so it works identically in the stacked mobile layout and the row layout
// on desktop. It auto-advances on a timer, and hovering a stop sends it
// straight there.
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
  const [positions, setPositions] = useState<Point[] | null>(null);
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const cycleIndexRef = useRef(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      const next: Point[] = [];
      for (const el of badgeRefs.current) {
        if (!el) return;
        const r = el.getBoundingClientRect();
        next.push({ x: r.left + r.width / 2 - containerRect.left, y: r.top + r.height / 2 - containerRect.top });
      }
      setPositions(next);
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

  useEffect(() => {
    if (reduce || !positions || hovering) return;
    const id = window.setInterval(() => {
      cycleIndexRef.current = (cycleIndexRef.current + 1) % CYCLE.length;
      setActive(CYCLE[cycleIndexRef.current]);
    }, 2400);
    return () => window.clearInterval(id);
  }, [reduce, positions, hovering]);

  function hoverStop(i: number) {
    setHovering(true);
    setActive(i);
  }

  const target = positions?.[active];
  const pathD =
    positions && positions.length === 3
      ? `M${positions[0].x},${positions[0].y} Q${positions[1].x},${positions[1].y} ${positions[1].x},${positions[1].y} T${positions[2].x},${positions[2].y}`
      : null;

  return (
    // pt-14 clears room above the topmost badge for the mascot to stand in
    // (it walks above the badges, not centered on them — see `target` below).
    <div ref={containerRef} className="relative pt-14">
      {pathD && (
        <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <path d={pathD} fill="none" stroke="var(--border)" strokeWidth={2} />
        </svg>
      )}

      {target && (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-10"
          style={{
            // Stand just above the badge (28px radius + a small gap) rather
            // than centered on it, so the figure doesn't blend into the
            // same gold tone as the circle it's "arriving at".
            transform: `translate(${target.x - MASCOT_W / 2}px, ${target.y - 28 - 6 - MASCOT_H}px)`,
            transition: reduce ? undefined : "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <Mascot reduce={reduce} />
        </div>
      )}

      <div className="relative flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-6">
        {stops.map((stop, i) => (
          <div
            key={i}
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
              onMouseEnter={() => hoverStop(i)}
              onMouseLeave={() => setHovering(false)}
              className="relative flex size-14 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "radial-gradient(circle at 32% 28%, oklch(0.92 0.1 90), var(--gold) 60%, oklch(0.58 0.1 75) 100%)",
                boxShadow: "inset 0 2px 2px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.18), 0 8px 20px -8px rgba(0,0,0,0.3)",
              }}
            >
              <stop.icon className="size-6 text-[oklch(0.28_0.04_75)]" strokeWidth={1.75} />
              {/* A small illustrated touch specific to each step, on top of
                  the icon — a finger tap, a coin changing hands, a deposit
                  landing — alongside the figure that walks between stops. */}
              {!reduce && i === 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full border-2 border-[oklch(0.28_0.04_75)]/50"
                  style={{ animation: "money-flow-tap-ripple 2.2s ease-out infinite" }}
                />
              )}
              {!reduce && i === 1 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-1 text-xs font-bold text-[oklch(0.28_0.04_75)]"
                  style={{ animation: "money-flow-coin-pop 2.4s ease-in-out infinite" }}
                >
                  ₦
                </span>
              )}
              {!reduce && i === 2 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-1 size-2 rounded-full bg-[oklch(0.28_0.04_75)]/70"
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

// A small illustrated figure — flat shapes (a torso rect, a head circle, arm
// and leg rects), not a stock icon — built the way a simple walking sprite
// is: two leg groups swing ±13deg from their own hip pivot, half a cycle out
// of phase via animation-delay, while the whole body dips at the midpoint of
// each stride. Colored from the same gold gradient as the static stop
// badges, so it reads as "the same journey," just animated.
function Mascot({ reduce }: { reduce: boolean }) {
  const legStyle = (delay: number) =>
    reduce
      ? undefined
      : ({ animation: `mascot-leg-swing 0.9s ease-in-out ${delay}s infinite` } as React.CSSProperties);
  const bodyStyle = reduce ? undefined : ({ animation: "mascot-bob 0.9s ease-in-out infinite" } as React.CSSProperties);

  return (
    <svg viewBox="0 0 64 92" width={MASCOT_W} height={MASCOT_H} xmlns="http://www.w3.org/2000/svg">
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
    </svg>
  );
}

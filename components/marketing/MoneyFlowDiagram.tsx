"use client";

import { useReducedMotion } from "motion/react";
import { Smartphone, HandCoins, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const STOPS = [
  { icon: Smartphone, label: "You apply", detail: "Tell us about your business and how much you need, right from your phone." },
  { icon: HandCoins, label: "Cash reaches you", detail: "Approved principal is paid directly into your hands, no collateral held." },
  { icon: Landmark, label: "You repay weekly", detail: "Small, predictable installments as your business earns, paid in at your branch." },
];

const DESKTOP_PATH = "M90,110 C230,40 310,40 450,60 C590,80 670,180 810,150";
const MOBILE_PATH = "M110,60 C40,180 40,240 110,320 C180,400 180,480 110,560";

// The narrative device for "how the money moves": one coin travels the full
// apply -> disburse -> repay loop on a native SVG path (no JS animation
// loop), so it stays cheap even with the loop running indefinitely. 9s (up
// from an earlier 4s) so it reads as a deliberate journey between the three
// stops rather than a blur.
export function MoneyFlowDiagram() {
  const reduce = useReducedMotion();

  return (
    <div className="relative">
      <svg
        aria-hidden
        viewBox="0 0 900 220"
        preserveAspectRatio="none"
        className="absolute inset-0 hidden h-full w-full md:block"
      >
        <path id="flow-desktop" d={DESKTOP_PATH} fill="none" stroke="var(--border)" strokeWidth={2} />
        <Coin id="desktop" pathId="flow-desktop" reduce={!!reduce} startX={90} startY={110} />
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 220 620"
        preserveAspectRatio="none"
        className="absolute inset-0 block h-full w-full md:hidden"
      >
        <path id="flow-mobile" d={MOBILE_PATH} fill="none" stroke="var(--border)" strokeWidth={2} />
        <Coin id="mobile" pathId="flow-mobile" reduce={!!reduce} startX={110} startY={60} />
      </svg>

      <div className="relative flex flex-col gap-10 md:flex-row md:items-start md:justify-between md:gap-6">
        {STOPS.map((stop, i) => (
          <div
            key={stop.label}
            className={cn(
              "flex flex-col items-center gap-3 text-center md:w-64",
              i === 1 && "md:mt-8",
              i === 2 && "md:mt-4",
            )}
          >
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "radial-gradient(circle at 32% 28%, oklch(0.92 0.1 90), var(--gold) 60%, oklch(0.58 0.1 75) 100%)",
                boxShadow: "inset 0 2px 2px rgba(255,255,255,0.6), inset 0 -3px 6px rgba(0,0,0,0.18), 0 8px 20px -8px rgba(0,0,0,0.3)",
              }}
            >
              <stop.icon className="size-6 text-[oklch(0.28_0.04_75)]" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-semibold">{stop.label}</p>
            <p className="max-w-[26ch] text-xs text-muted-foreground">{stop.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// A coin, not a dot — same gold gradient and soft drop-shadow as the static
// icon circles above, so the traveling one reads as "the same money" moving
// between them rather than an abstract marker.
function Coin({ id, pathId, reduce, startX, startY }: { id: string; pathId: string; reduce: boolean; startX: number; startY: number }) {
  const gradientId = `coin-gradient-${id}`;
  const shadowId = `coin-shadow-${id}`;

  const defs = (
    <defs>
      <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="oklch(0.92 0.1 90)" />
        <stop offset="60%" stopColor="var(--gold)" />
        <stop offset="100%" stopColor="oklch(0.58 0.1 75)" />
      </radialGradient>
      <filter id={shadowId} x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.35)" />
      </filter>
    </defs>
  );

  if (reduce) {
    return (
      <>
        {defs}
        <circle r={10} cx={startX} cy={startY} fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      </>
    );
  }

  return (
    <>
      {defs}
      <circle r={10} fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} stroke="oklch(0.98 0.02 90)" strokeWidth={1}>
        <animateMotion dur="9s" repeatCount="indefinite">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
    </>
  );
}

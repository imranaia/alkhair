"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "./TourProvider";

const MAX_MEASURE_ATTEMPTS = 20; // ~3s at 150ms — long enough for a route change to settle
const CARD_WIDTH = 320;

type SpotlightState = { key: string; rect: DOMRect | null; ready: boolean };

function useSpotlightRect(target: string | undefined, stepKey: string, onGiveUp: () => void) {
  const [state, setState] = useState<SpotlightState>(() => ({ key: stepKey, rect: null, ready: !target }));

  // Reset synchronously during render when the step changes, rather than in
  // an effect — avoids the extra cascading render an effect-body setState
  // would cause (see https://react.dev/learn/you-might-not-need-an-effect).
  if (state.key !== stepKey) {
    setState({ key: stepKey, rect: null, ready: !target });
  }

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    let attempts = 0;

    function measure() {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (el) {
        // Instant scroll, not smooth — smooth scrolling takes many frames to
        // settle, and requestAnimationFrame is throttled/paused on
        // backgrounded tabs, so waiting on either would leave the card stuck
        // hidden. A short timeout is enough for layout to settle either way.
        el.scrollIntoView({ block: "center", behavior: "auto" });
        setTimeout(() => {
          if (cancelled) return;
          setState((s) => (s.key === stepKey ? { ...s, rect: el.getBoundingClientRect(), ready: true } : s));
        }, 50);
        return;
      }
      attempts += 1;
      if (attempts > MAX_MEASURE_ATTEMPTS) {
        if (!cancelled) onGiveUp();
        return;
      }
      setTimeout(measure, 150);
    }

    measure();
    return () => {
      cancelled = true;
    };
  }, [target, stepKey, onGiveUp]);

  useEffect(() => {
    if (!target) return;
    function reposition() {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (el) setState((s) => (s.key === stepKey ? { ...s, rect: el.getBoundingClientRect() } : s));
    }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [target, stepKey]);

  return { rect: state.rect, ready: state.ready };
}

function cardPosition(rect: DOMRect | null) {
  if (typeof window === "undefined") return { top: 0, left: 0, centered: true };
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const margin = 16;

  if (viewportW < 640 || !rect) {
    return { centered: !rect, bottomSheet: viewportW < 640 && !!rect };
  }

  const estCardHeight = 190;
  const spaceBelow = viewportH - rect.bottom;
  const top =
    spaceBelow > estCardHeight + margin ? rect.bottom + margin : Math.max(margin, rect.top - estCardHeight - margin);
  let left = rect.left;
  if (left + CARD_WIDTH + margin > viewportW) left = viewportW - CARD_WIDTH - margin;
  left = Math.max(margin, left);
  return { top, left, centered: false, bottomSheet: false };
}

export function TourOverlay() {
  const { active, stepIndex, steps, next, back, skip } = useTour();
  const step = steps[stepIndex];
  const cardRef = useRef<HTMLDivElement>(null);
  const { rect, ready } = useSpotlightRect(step?.target, step?.id ?? "", next);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") skip();
      else if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, skip]);

  if (!active || !step || !ready) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const pos = cardPosition(rect);

  return (
    <div className="fixed inset-0 z-[999]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* Click-blocker: keeps the tour modal while the app underneath is dimmed/spotlit */}
      <div className={rect ? "fixed inset-0" : "fixed inset-0 bg-black/60"} onClick={(e) => e.stopPropagation()} />

      {rect && (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-primary transition-[top,left,width,height] duration-200"
          style={{
            // Clamp to the visible viewport — a target that's much taller than
            // the screen (a long card grid) would otherwise draw a spotlight
            // that extends far past what's actually on screen.
            top: Math.max(8, rect.top - 8),
            left: rect.left - 8,
            width: rect.width + 16,
            height: Math.min(rect.height + 16, window.innerHeight - 16),
            boxShadow: "0 0 0 9999px rgba(10, 12, 16, 0.6)",
          }}
        />
      )}

      <div
        ref={cardRef}
        className="glass-panel-strong fixed w-[calc(100vw-2rem)] max-w-80 p-4 shadow-2xl"
        style={
          pos.centered
            ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
            : pos.bottomSheet
              ? { left: 16, right: 16, bottom: 16, width: "auto", maxWidth: "none" }
              : { top: pos.top, left: pos.left }
        }
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={skip}
            aria-label="Skip tour"
            className="-mt-1 -mr-1 rounded-md p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <h3 className="mt-1.5 text-base font-semibold">{step.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={skip}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Skip tour
          </button>
          <div className="flex gap-1.5">
            {!isFirst && (
              <Button type="button" variant="secondary" size="sm" onClick={back}>
                Back
              </Button>
            )}
            <Button type="button" size="sm" onClick={next}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

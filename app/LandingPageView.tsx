"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Store,
  Car,
  UtensilsCrossed,
  ShoppingBag,
  Scissors,
  Shirt,
  Smartphone,
  Wrench,
  Beef,
  Zap,
  BadgePercent,
  Handshake,
  CalendarClock,
  MessageCircle,
  FileCheck,
  IdCard,
  UserCheck,
  MapPin,
  Briefcase,
  ArrowRight,
  Phone,
  Mail,
  Pencil,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ALL_LOAN_PRODUCTS } from "@/lib/constants/loanProducts";
import { CurrencyField } from "@/components/marketing/CurrencyField";
import { MoneyFlowDiagram } from "@/components/marketing/MoneyFlowDiagram";
import { Reveal } from "@/components/marketing/Reveal";
import { EditableText } from "@/components/marketing/EditableText";
import { saveLandingFieldAction } from "./landingActions";
import type { LandingContent } from "@/lib/db/siteContent";

// Tasteful stock photography as a placeholder until real branch/client photos
// are provided (all Unsplash License, free for commercial use).
const PEOPLE = [
  {
    label: "Market Trader",
    alt: "Market trader at a fruit stall — photo by Omotayo Tajudeen on Unsplash",
    src: "https://images.unsplash.com/photo-1585540083814-ea6ee8af9e4f?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Tailor",
    alt: "Tailor working at a sewing machine — photo by Ali Mkumbwa on Unsplash",
    src: "https://images.unsplash.com/photo-1687422809069-0fa3546b8471?q=80&w=800&auto=format&fit=crop",
  },
  {
    label: "Food Vendor",
    alt: "Food vendor grilling suya at a street stall — photo by Ben Iwara on Unsplash",
    src: "https://images.unsplash.com/photo-1765584829902-51939816637c?q=80&w=800&auto=format&fit=crop",
  },
];

const TRADES = [
  { label: "Market Trader", icon: Store },
  { label: "Car Wash Operator", icon: Car },
  { label: "Food Vendor / Cook", icon: UtensilsCrossed },
  { label: "Shop Owner", icon: ShoppingBag },
  { label: "Tailor / Fashion Designer", icon: Scissors },
  { label: "Laundry / Dry Cleaner", icon: Shirt },
  { label: "POS / Mobile Money Agent", icon: Smartphone },
  { label: "Phone Seller / Repairer", icon: Wrench },
  { label: "Butcher", icon: Beef },
];

const FEATURE_ICONS = [Zap, BadgePercent, Handshake, CalendarClock, MessageCircle, FileCheck];
const REQUIREMENT_ICONS = [Briefcase, IdCard, UserCheck, MapPin];

export function LandingPageView({ initialContent, isSuperAdmin }: { initialContent: LandingContent; isSuperAdmin: boolean }) {
  const [content, setContent] = useState(initialContent);
  const [editMode, setEditMode] = useState(false);
  // A signed-in super admin viewing this page isn't here to log in again —
  // "Log in" would just be a dead end for them, so it becomes a way back to
  // the app instead.
  const authHref = isSuperAdmin ? "/dashboard" : "/login";
  const authLabel = isSuperAdmin ? "Go to dashboard" : "Log in";

  async function saveField<K extends keyof LandingContent>(field: K, value: LandingContent[K]) {
    const result = await saveLandingFieldAction(field, value);
    if (!result.error) setContent((c) => ({ ...c, [field]: value }));
    return result;
  }

  function saveFeatureLabel(index: number) {
    return (next: string) => {
      const updated = content.featureLabels.map((f, i) => (i === index ? next : f));
      return saveField("featureLabels", updated);
    };
  }

  function saveRequirementField(index: number, key: "label" | "detail") {
    return (next: string) => {
      const updated = content.requirements.map((r, i) => (i === index ? { ...r, [key]: next } : r));
      return saveField("requirements", updated);
    };
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 p-4 pb-16 sm:gap-24">
      {isSuperAdmin && (
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className="fixed right-4 bottom-4 z-50 flex items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground shadow-lg transition-transform hover:scale-105"
        >
          {editMode ? <X className="size-4" /> : <Pencil className="size-4" />}
          {editMode ? "Done editing" : "Edit page"}
        </button>
      )}

      <header className="flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <a
            href={`tel:${content.contactPhone.replace(/\s+/g, "")}`}
            className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:flex"
          >
            <Phone className="size-4" />
            {content.contactPhone}
          </a>
          <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href={authHref}>{authLabel}</Link>
          </Button>
        </div>
      </header>

      {/* Hero - asymmetric split: copy left, stat panel right, glossy currency
          field drifting behind both with pointer-driven parallax */}
      <section className="relative -mx-4 overflow-hidden px-4 py-2 sm:-mx-0 sm:px-0">
        <CurrencyField />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
          <div className="space-y-5">
            <EditableText
              as="h1"
              value={content.heroHeadline}
              editMode={editMode}
              onSave={(v) => saveField("heroHeadline", v)}
              className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl"
            />
            <EditableText
              as="p"
              value={content.heroSubheadline}
              editMode={editMode}
              multiline
              onSave={(v) => saveField("heroSubheadline", v)}
              className="max-w-[46ch] text-base text-muted-foreground"
            />
            <div className="flex items-center gap-3 pt-2">
              <Button asChild size="lg" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
                <Link href={authHref}>
                  {authLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <span className="text-xs text-muted-foreground">RC: 9640793</span>
            </div>
          </div>

          <GlassPanel className="brand-glass grid grid-cols-3 gap-4 p-6 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-semibold text-brand">9</p>
              <p className="text-xs text-muted-foreground">trades financed</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-brand">Flexible</p>
              <p className="text-xs text-muted-foreground">collateral options</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-brand">5km</p>
              <p className="text-xs text-muted-foreground">of your branch</p>
            </div>
          </GlassPanel>
        </div>
      </section>

      {/* How the money moves - distinct layout family: animated 3-stop journey */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold tracking-tight">How the money moves</h2>
        <MoneyFlowDiagram />
      </section>

      {/* Who we finance - bento-style icon grid, varied cell sizes */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight">Who we finance</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TRADES.map((t, i) => (
            <Reveal key={t.label} index={i}>
              <div className="glass-panel flex h-full items-center gap-3 p-4 transition-transform duration-200 hover:-translate-y-1">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-foreground text-foreground">
                  <t.icon className="size-4.5" />
                </div>
                <p className="text-sm font-medium">{t.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Built for people like you - photographic counterpoint to the icon-only bento above */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight">Built for people like you</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PEOPLE.map((p, i) => (
            <Reveal key={p.label} index={i}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl">
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent p-4 pt-10">
                  <p className="text-sm font-medium text-white">{p.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Our products - three cards, distinct from the bento/photo layouts above */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight">Our products</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {ALL_LOAN_PRODUCTS.map((p, i) => (
            <Reveal key={p.value} index={i}>
              <GlassPanel className="flex h-full flex-col gap-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{p.label}</p>
                  {"comingSoon" in p && p.comingSoon && (
                    <Badge variant="secondary" className="shrink-0">
                      Coming soon
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </GlassPanel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Why work with us - plain icon rows, no card boxes */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight">Why work with us</h2>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {content.featureLabels.map((label, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <Reveal key={i} index={i}>
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <Icon className="size-4.5 shrink-0 text-brand" />
                  <EditableText
                    value={label}
                    editMode={editMode}
                    onSave={saveFeatureLabel(i)}
                    className="text-sm font-medium"
                  />
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Requirements - distinct layout family: numbered vertical list */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight">What you need to apply</h2>
        <div className="space-y-3">
          {content.requirements.map((r, i) => {
            const Icon = REQUIREMENT_ICONS[i];
            return (
              <Reveal key={i} index={i}>
                <GlassPanel className="flex items-start gap-4 p-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-foreground text-foreground">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <EditableText
                      value={r.label}
                      editMode={editMode}
                      onSave={saveRequirementField(i, "label")}
                      className="text-sm font-semibold"
                    />
                    <EditableText
                      value={r.detail}
                      editMode={editMode}
                      multiline
                      onSave={saveRequirementField(i, "detail")}
                      className="mt-0.5 block text-sm text-muted-foreground"
                    />
                  </div>
                </GlassPanel>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Mission + closing CTA */}
      <section className="space-y-5">
        <GlassPanel className="brand-glass space-y-4 p-8 text-center sm:p-10">
          <EditableText
            as="h2"
            value={content.missionHeading}
            editMode={editMode}
            onSave={(v) => saveField("missionHeading", v)}
            className="text-2xl font-semibold tracking-tight"
          />
          <EditableText
            as="p"
            value={content.missionBody}
            editMode={editMode}
            multiline
            onSave={(v) => saveField("missionBody", v)}
            className="mx-auto max-w-[60ch] text-sm text-muted-foreground"
          />
          <Button asChild size="lg" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href={authHref}>
              {authLabel}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </GlassPanel>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t border-border pt-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
        <p>Alkhair Microcredit Limited &middot; RC: 9640793</p>
        <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-4">
          <span className="flex items-center gap-1.5">
            <Phone className="size-3.5 shrink-0" />
            {editMode ? (
              <EditableText value={content.contactPhone} editMode={editMode} onSave={(v) => saveField("contactPhone", v)} />
            ) : (
              <a href={`tel:${content.contactPhone.replace(/\s+/g, "")}`} className="hover:text-foreground">
                {content.contactPhone}
              </a>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <Mail className="size-3.5 shrink-0" />
            {editMode ? (
              <EditableText value={content.contactEmail} editMode={editMode} onSave={(v) => saveField("contactEmail", v)} />
            ) : (
              <a href={`mailto:${content.contactEmail}`} className="hover:text-foreground">
                {content.contactEmail}
              </a>
            )}
          </span>
        </div>
        <p>&copy; {new Date().getFullYear()} Alkhair Microcredit Limited. All rights reserved.</p>
      </footer>
    </div>
  );
}

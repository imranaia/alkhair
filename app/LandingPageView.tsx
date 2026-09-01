"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
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
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CurrencyField } from "@/components/marketing/CurrencyField";
import { MoneyFlowDiagram } from "@/components/marketing/MoneyFlowDiagram";
import { Reveal } from "@/components/marketing/Reveal";
import { EditableText } from "@/components/marketing/EditableText";
import { saveLandingFieldAction } from "./landingActions";
import type { LandingContent } from "@/lib/db/siteContent";

// Tasteful stock photography as a placeholder until real branch/client photos
// are provided (all Unsplash License, free for commercial use). The photos
// themselves aren't admin-editable (no image upload yet) — only the label
// captioning each one is.
const PEOPLE = [
  {
    alt: "Market trader at a fruit stall — photo by Omotayo Tajudeen on Unsplash",
    src: "https://images.unsplash.com/photo-1585540083814-ea6ee8af9e4f?q=80&w=800&auto=format&fit=crop",
  },
  {
    alt: "Tailor working at a sewing machine — photo by Ali Mkumbwa on Unsplash",
    src: "https://images.unsplash.com/photo-1687422809069-0fa3546b8471?q=80&w=800&auto=format&fit=crop",
  },
  {
    alt: "Food vendor grilling suya at a street stall — photo by Ben Iwara on Unsplash",
    src: "https://images.unsplash.com/photo-1765584829902-51939816637c?q=80&w=800&auto=format&fit=crop",
  },
];

// Icons cycle by index rather than being chosen per-entry — there's no icon
// picker in this CMS, so a super admin can add a box without needing to pick
// one. Trade/feature/requirement counts are variable; these lists just need
// to be at least as long as what's realistically added.
const TRADE_ICONS = [Store, Car, UtensilsCrossed, ShoppingBag, Scissors, Shirt, Smartphone, Wrench, Beef];
const FEATURE_ICONS = [Zap, BadgePercent, Handshake, CalendarClock, MessageCircle, FileCheck];
const REQUIREMENT_ICONS = [Briefcase, IdCard, UserCheck, MapPin];

function AddBoxButton({ onClick, label, className }: { onClick: () => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/40 p-4 text-sm font-medium text-brand transition-colors hover:bg-brand/5 ${className ?? ""}`}
    >
      <Plus className="size-4" />
      {label}
    </button>
  );
}

function RemoveBoxButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-2 top-2 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      aria-label="Remove"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

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

  async function saveOrToast<K extends keyof LandingContent>(field: K, value: LandingContent[K]) {
    const { error } = await saveField(field, value);
    if (error) toast.error(error);
  }

  // Money flow
  function saveMoneyFlowStep(index: number, key: "label" | "detail") {
    return (next: string) => {
      const updated = content.moneyFlowSteps.map((s, i) => (i === index ? { ...s, [key]: next } : s));
      return saveField("moneyFlowSteps", updated);
    };
  }

  // Trades
  function saveTradeLabel(index: number) {
    return (next: string) => saveField("trades", content.trades.map((t, i) => (i === index ? next : t)));
  }
  function addTrade() {
    saveOrToast("trades", [...content.trades, "New trade"]);
  }
  function removeTrade(index: number) {
    saveOrToast(
      "trades",
      content.trades.filter((_, i) => i !== index),
    );
  }

  // People captions
  function savePeopleLabel(index: number) {
    return (next: string) => saveField("peopleLabels", content.peopleLabels.map((l, i) => (i === index ? next : l)));
  }

  // Products
  function saveProductField(index: number, key: "label" | "description") {
    return (next: string) => saveField("products", content.products.map((p, i) => (i === index ? { ...p, [key]: next } : p)));
  }
  function toggleProductComingSoon(index: number, comingSoon: boolean) {
    saveOrToast(
      "products",
      content.products.map((p, i) => (i === index ? { ...p, comingSoon } : p)),
    );
  }
  function addProduct() {
    saveOrToast("products", [...content.products, { label: "New product", description: "Describe it here.", comingSoon: false }]);
  }
  function removeProduct(index: number) {
    saveOrToast(
      "products",
      content.products.filter((_, i) => i !== index),
    );
  }

  // Features
  function saveFeatureLabel(index: number) {
    return (next: string) => saveField("featureLabels", content.featureLabels.map((f, i) => (i === index ? next : f)));
  }
  function addFeature() {
    saveOrToast("featureLabels", [...content.featureLabels, "New feature"]);
  }
  function removeFeature(index: number) {
    saveOrToast(
      "featureLabels",
      content.featureLabels.filter((_, i) => i !== index),
    );
  }

  // Requirements
  function saveRequirementField(index: number, key: "label" | "detail") {
    return (next: string) => saveField("requirements", content.requirements.map((r, i) => (i === index ? { ...r, [key]: next } : r)));
  }
  function addRequirement() {
    saveOrToast("requirements", [...content.requirements, { label: "New requirement", detail: "Describe it here." }]);
  }
  function removeRequirement(index: number) {
    saveOrToast(
      "requirements",
      content.requirements.filter((_, i) => i !== index),
    );
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
        <EditableText
          as="h2"
          value={content.moneyFlowHeading}
          editMode={editMode}
          onSave={(v) => saveField("moneyFlowHeading", v)}
          className="text-2xl font-semibold tracking-tight"
        />
        <MoneyFlowDiagram steps={content.moneyFlowSteps} editMode={editMode} onSaveStep={saveMoneyFlowStep} />
      </section>

      {/* Who we finance - bento-style icon grid, varied cell sizes */}
      <section className="space-y-5">
        <EditableText
          as="h2"
          value={content.tradesHeading}
          editMode={editMode}
          onSave={(v) => saveField("tradesHeading", v)}
          className="text-2xl font-semibold tracking-tight"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {content.trades.map((label, i) => {
            const Icon = TRADE_ICONS[i % TRADE_ICONS.length];
            return (
              <Reveal key={i} index={i}>
                <div className="glass-panel relative flex h-full items-center gap-3 p-4 transition-transform duration-200 hover:-translate-y-1">
                  {editMode && <RemoveBoxButton onClick={() => removeTrade(i)} />}
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-foreground text-foreground">
                    <Icon className="size-4.5" />
                  </div>
                  <EditableText value={label} editMode={editMode} onSave={saveTradeLabel(i)} className="flex-1 text-sm font-medium" />
                </div>
              </Reveal>
            );
          })}
          {editMode && <AddBoxButton onClick={addTrade} label="Add trade" />}
        </div>
      </section>

      {/* Built for people like you - photographic counterpoint to the icon-only bento above */}
      <section className="space-y-5">
        <EditableText
          as="h2"
          value={content.peopleHeading}
          editMode={editMode}
          onSave={(v) => saveField("peopleHeading", v)}
          className="text-2xl font-semibold tracking-tight"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {PEOPLE.map((p, i) => (
            <Reveal key={i} index={i}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl">
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent p-4 pt-10">
                  <EditableText
                    value={content.peopleLabels[i] ?? ""}
                    editMode={editMode}
                    onSave={savePeopleLabel(i)}
                    className="text-sm font-medium text-white"
                  />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Our products - three cards, distinct from the bento/photo layouts above */}
      <section className="space-y-5">
        <EditableText
          as="h2"
          value={content.productsHeading}
          editMode={editMode}
          onSave={(v) => saveField("productsHeading", v)}
          className="text-2xl font-semibold tracking-tight"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          {content.products.map((p, i) => (
            <Reveal key={i} index={i}>
              <GlassPanel className="relative flex h-full flex-col gap-2 p-5">
                {editMode && <RemoveBoxButton onClick={() => removeProduct(i)} />}
                <div className="flex items-center justify-between gap-2 pr-5">
                  <EditableText value={p.label} editMode={editMode} onSave={saveProductField(i, "label")} className="text-sm font-semibold" />
                  {!editMode && p.comingSoon && (
                    <Badge variant="secondary" className="shrink-0">
                      Coming soon
                    </Badge>
                  )}
                </div>
                <EditableText
                  value={p.description}
                  editMode={editMode}
                  multiline
                  onSave={saveProductField(i, "description")}
                  className="text-sm text-muted-foreground"
                />
                {editMode && (
                  <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={p.comingSoon} onCheckedChange={(v) => toggleProductComingSoon(i, v === true)} />
                    Coming soon
                  </label>
                )}
              </GlassPanel>
            </Reveal>
          ))}
          {editMode && <AddBoxButton onClick={addProduct} label="Add product" className="min-h-24" />}
        </div>
      </section>

      {/* Why work with us - plain icon rows, no card boxes */}
      <section className="space-y-5">
        <EditableText
          as="h2"
          value={content.featuresHeading}
          editMode={editMode}
          onSave={(v) => saveField("featuresHeading", v)}
          className="text-2xl font-semibold tracking-tight"
        />
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {content.featureLabels.map((label, i) => {
            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
            return (
              <Reveal key={i} index={i}>
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <Icon className="size-4.5 shrink-0 text-brand" />
                  <EditableText value={label} editMode={editMode} onSave={saveFeatureLabel(i)} className="flex-1 text-sm font-medium" />
                  {editMode && (
                    <button
                      type="button"
                      onClick={() => removeFeature(i)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
        {editMode && <AddBoxButton onClick={addFeature} label="Add feature" className="w-full sm:w-auto" />}
      </section>

      {/* Requirements - distinct layout family: numbered vertical list */}
      <section className="space-y-5">
        <EditableText
          as="h2"
          value={content.requirementsHeading}
          editMode={editMode}
          onSave={(v) => saveField("requirementsHeading", v)}
          className="text-2xl font-semibold tracking-tight"
        />
        <div className="space-y-3">
          {content.requirements.map((r, i) => {
            const Icon = REQUIREMENT_ICONS[i % REQUIREMENT_ICONS.length];
            return (
              <Reveal key={i} index={i}>
                <GlassPanel className="relative flex items-start gap-4 p-5">
                  {editMode && <RemoveBoxButton onClick={() => removeRequirement(i)} />}
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
          {editMode && <AddBoxButton onClick={addRequirement} label="Add requirement" />}
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

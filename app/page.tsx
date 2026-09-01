import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
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
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { Logo } from "@/components/brand/Logo";
import { GlassPanel } from "@/components/layout/GlassPanel";
import { Button } from "@/components/ui/button";
import { CurrencyField } from "@/components/marketing/CurrencyField";
import { MoneyFlowDiagram } from "@/components/marketing/MoneyFlowDiagram";
import { Reveal } from "@/components/marketing/Reveal";

// TODO: demo placeholder — swap for the real branch line once provided.
const CONTACT_PHONE = "+234 800 000 0000";
const CONTACT_EMAIL = "alkhairmicrocredit@gmail.com";

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

const FEATURES = [
  { label: "Fast processing and approval", icon: Zap },
  { label: "Ethical financing — profit only, never interest", icon: BadgePercent },
  { label: "Flexible collateral options", icon: Handshake },
  { label: "Flexible weekly repayment", icon: CalendarClock },
  { label: "Friendly, responsive support", icon: MessageCircle },
  { label: "Simple, clear terms", icon: FileCheck },
];

const REQUIREMENTS = [
  {
    label: "Your own business",
    detail: "An existing trade or service you run — financing is built around businesses already up and running.",
    icon: Briefcase,
  },
  { label: "A valid NIN", detail: "National Identification Number on record before approval.", icon: IdCard },
  {
    label: "A guarantor with their own business or work",
    detail: "Not a family member, someone independent who can vouch for you.",
    icon: UserCheck,
  },
  { label: "A business within 5km", detail: "Your trade should be based close to the branch you apply through.", icon: MapPin },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.roleKey === "client" ? "/portal" : "/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 p-4 pb-16 sm:gap-24">
      <header className="flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <a
            href={`tel:${CONTACT_PHONE.replace(/\s+/g, "")}`}
            className="hidden items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:flex"
          >
            <Phone className="size-4" />
            {CONTACT_PHONE}
          </a>
          <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </header>

      {/* Hero - asymmetric split: copy left, stat panel right, glossy currency
          field drifting behind both with pointer-driven parallax */}
      <section className="relative -mx-4 overflow-hidden px-4 py-2 sm:-mx-0 sm:px-0">
        <CurrencyField />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12">
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Financing for the business you already run.
            </h1>
            <p className="max-w-[46ch] text-base text-muted-foreground">
              Fast approval, flexible collateral, and transparent profit terms — no interest, ever — built for market
              traders, shop owners, and service providers.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <Button asChild size="lg" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
                <Link href="/login">
                  Log in
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

      {/* Why work with us - plain icon rows, no card boxes */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight">Why work with us</h2>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.label} index={i}>
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <f.icon className="size-4.5 shrink-0 text-brand" />
                <p className="text-sm font-medium">{f.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Requirements - distinct layout family: numbered vertical list */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight">What you need to apply</h2>
        <div className="space-y-3">
          {REQUIREMENTS.map((r, i) => (
            <Reveal key={r.label} index={i}>
              <GlassPanel className="flex items-start gap-4 p-5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand-foreground text-foreground">
                  <r.icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{r.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.detail}</p>
                </div>
              </GlassPanel>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Mission + closing CTA */}
      <section className="space-y-5">
        <GlassPanel className="brand-glass space-y-4 p-8 text-center sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Every small business deserves the opportunity.</h2>
          <p className="mx-auto max-w-[60ch] text-sm text-muted-foreground">
            Alkhair Microcredit Limited supports hardworking entrepreneurs with financing built around how they
            actually work, week to week, trade to trade.
          </p>
          <Button asChild size="lg" className="gap-1.5 bg-brand text-brand-foreground hover:bg-brand/90">
            <Link href="/login">
              Log in
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </GlassPanel>
      </section>

      <footer className="flex flex-col items-center gap-3 border-t border-border pt-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
        <p>Alkhair Microcredit Limited &middot; RC: 9640793</p>
        <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-4">
          <a href={`tel:${CONTACT_PHONE.replace(/\s+/g, "")}`} className="flex items-center gap-1.5 hover:text-foreground">
            <Phone className="size-3.5" />
            {CONTACT_PHONE}
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-1.5 hover:text-foreground">
            <Mail className="size-3.5" />
            {CONTACT_EMAIL}
          </a>
        </div>
        <p>&copy; {new Date().getFullYear()} Alkhair Microcredit Limited. All rights reserved.</p>
      </footer>
    </div>
  );
}

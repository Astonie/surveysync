"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Wifi, WifiOff, RefreshCw, FileText, Users, Smartphone,
  CheckCircle, ArrowRight, ChevronRight, Menu, X, Globe, Shield, Zap,
} from "lucide-react";

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <BarChart3 className="h-6 w-6" />
          SurveySync
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#stats" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Open Source</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/login?register=true">
            <Button size="sm" className="gap-1">Get Started <ArrowRight className="h-3.5 w-3.5" /></Button>
          </Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
          <a href="#features" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Features</a>
          <a href="#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>How It Works</a>
          <a href="#stats" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Open Source</a>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full">Sign In</Button>
            </Link>
            <Link href="/login?register=true" onClick={() => setMobileOpen(false)}>
              <Button className="w-full">Get Started</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function HeroMockup() {
  return (
    <div className="relative mx-auto max-w-lg">
      <div className="absolute -inset-4 bg-gradient-to-b from-primary/10 to-transparent rounded-2xl blur-2xl" />
      <div className="relative bg-card border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-secondary/50">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">surveysync.app/collect/abc123</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Customer Feedback Survey</h4>
            <Badge variant="success" className="text-[10px] gap-1"><Wifi className="h-2.5 w-2.5" /> Online</Badge>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "60%" }} />
          </div>
          <p className="text-xs text-muted-foreground text-right">3 / 5</p>
          <div className="space-y-2">
            <p className="text-sm font-medium">How would you rate our service? *</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${n === 4 ? "bg-primary text-primary-foreground scale-110" : "bg-secondary text-secondary-foreground"}`}>
                  {n}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <div className="h-9 w-24 rounded-lg bg-secondary" />
            <div className="h-9 w-32 rounded-lg bg-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    icon: WifiOff,
    title: "Offline-First",
    description: "Collect data anywhere without internet. Responses save locally and sync automatically when you're back online.",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: RefreshCw,
    title: "Real-Time Sync",
    description: "Data syncs seamlessly between devices. Changes propagate instantly when connected, conflict-free.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description: "Qualitative and quantitative analysis with sentiment detection, word frequency, cross-tabulation, and visual charts.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: FileText,
    title: "Survey Builder",
    description: "Drag-and-drop builder with 6 question types: text, multiple choice, checkbox, dropdown, rating scale, and date.",
    color: "text-green-600 bg-green-50",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Invite collectors, manage access, track collection sessions with pause/resume, and review responses in real-time.",
    color: "text-rose-600 bg-rose-50",
  },
  {
    icon: Smartphone,
    title: "PWA Ready",
    description: "Install as a native app on any device. Works on iOS, Android, and desktop with a full offline experience.",
    color: "text-cyan-600 bg-cyan-50",
  },
];

const steps = [
  {
    number: "01",
    title: "Create Your Survey",
    description: "Use the intuitive builder to add questions, set response types, and customize your survey. Save drafts as you go.",
    icon: FileText,
  },
  {
    number: "02",
    title: "Collect Responses",
    description: "Share with your team or publish publicly. Collectors can work offline — data syncs automatically when reconnected.",
    icon: Users,
  },
  {
    number: "03",
    title: "Analyze Results",
    description: "Dive into real-time analytics with sentiment analysis, cross-tabulation, word clouds, and exportable raw data.",
    icon: BarChart3,
  },
];

const stats = [
  { value: "100%", label: "Open Source" },
  { value: "6", label: "Question Types" },
  { value: "0", label: "Dependencies Sold" },
  { value: "∞", label: "Offline Capability" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-slide-up">
              <Badge variant="outline" className="gap-1.5 w-fit">
                <Globe className="h-3 w-3" />
                Open Source & Free
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Collect Data
                <span className="text-primary"> Anywhere</span>,
                <br />Sync Everywhere
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                An offline-first data collection tool built for professional research.
                Create surveys, collect responses in the field without internet, and analyze results in real-time.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login?register=true">
                  <Button size="lg" className="gap-2 text-base px-8">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="https://github.com/Astonie/surveysync" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    View on GitHub
                  </Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Built with Next.js, Prisma, PostgreSQL &bull; Deploy on Vercel
              </p>
            </div>
            <div className="hidden lg:block animate-slide-up delay-200">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-slide-up">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything You Need for Field Research
            </h2>
            <p className="text-muted-foreground text-lg">
              From survey creation to data analysis — a complete toolkit designed for researchers who work beyond the office.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`group relative bg-card border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up delay-${(i + 1) * 100}`}
              >
                <div className={`h-11 w-11 rounded-lg flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-slide-up">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Three Steps to Better Data
            </h2>
            <p className="text-muted-foreground text-lg">
              Get started in minutes. No complicated setup, no vendor lock-in.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.number} className={`relative text-center animate-slide-up delay-${(i + 1) * 100}`}>
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary font-bold text-lg mb-5">
                  {step.number}
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-6 -right-4 h-5 w-5 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-slide-up">
            <Badge variant="secondary" className="mb-4">Open Source</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Built in the Open
            </h2>
            <p className="text-muted-foreground text-lg">
              SurveySync is free and open source. No hidden fees, no data harvesting, no vendor lock-in.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <div key={stat.label} className={`text-center animate-slide-up delay-${(i + 1) * 100}`}>
                <p className="text-4xl sm:text-5xl font-bold text-primary mb-2">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground animate-slide-up delay-500">
            {["Next.js", "Prisma", "PostgreSQL", "Tailwind CSS", "Dexie.js", "Serwist PWA"].map((tech) => (
              <span key={tech} className="px-3 py-1.5 bg-card border rounded-full text-xs font-medium">{tech}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground p-10 sm:p-14 text-center animate-slide-up">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-40" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Start Collecting?</h2>
              <p className="text-primary-foreground/80 text-lg mb-8 max-w-lg mx-auto">
                Create your first survey in minutes. No credit card required, no limits on responses.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/login?register=true">
                  <Button size="lg" variant="secondary" className="gap-2 text-base px-8">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="https://github.com/Astonie/surveysync" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="gap-2 text-base px-8 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    Star on GitHub
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 font-bold text-primary">
              <BarChart3 className="h-5 w-5" />
              SurveySync
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
              <a href="https://github.com/Astonie/surveysync" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
              <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
            </nav>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} SurveySync. Open source under MIT.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

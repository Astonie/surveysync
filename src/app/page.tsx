"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  BarChart3, Wifi, CheckCircle, ArrowRight, Menu, X, Globe,
  GraduationCap, Building2, HeartPulse, TrendingUp, Microscope,
  CloudOff, Users, ClipboardList, ShieldCheck, Smartphone,
  Lock, FileText, Database,
} from "lucide-react";

interface LandingUser {
  name: string | null;
  email: string;
}

function Navbar({ user }: { user: LandingUser | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "#solutions", label: "Who It's For" },
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#ownership", label: "Data Ownership" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <BarChart3 className="h-6 w-6" />
          SurveySync
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs">
                  {(user.name || user.email).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <span className="hidden sm:inline">{user.name || user.email}</span>
              </Link>
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/login?register=true">
                <Button size="sm" className="gap-1">Start a Study <ArrowRight className="h-3.5 w-3.5" /></Button>
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>
              {l.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button className="w-full">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
                <Link href="/login?register=true" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full">Start a Study</Button>
                </Link>
              </>
            )}
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
          <span className="text-xs text-muted-foreground ml-2">surveysync.app/collect/patient-study</span>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Patient Experience Study</h4>
            <Badge variant="success" className="text-[10px] gap-1"><Wifi className="h-2.5 w-2.5" /> 2 collectors online</Badge>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: "60%" }} />
          </div>
          <p className="text-xs text-muted-foreground text-right">Section 2 of 4</p>
          <div className="space-y-2">
            <p className="text-sm font-medium">How satisfied were you with today&rsquo;s visit? *</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${n === 4 ? "bg-primary text-primary-foreground scale-110" : "bg-secondary text-secondary-foreground"}`}>
                  {n}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-500" /> Saved offline</span>
            <span>347 responses</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const valueStats = [
  {
    icon: CloudOff,
    title: "Works fully offline",
    description: "Collect responses in the field, in the clinic, or underground — no connection required.",
  },
  {
    icon: Database,
    title: "No response caps",
    description: "Run studies at any scale, from a pilot of 30 to national surveys. Collect as much as you need.",
  },
  {
    icon: FileText,
    title: "Research-grade exports",
    description: "Download clean, analysis-ready data for your statistics tools and manuscripts.",
  },
  {
    icon: Lock,
    title: "Your data stays yours",
    description: "No data harvesting, no third-party selling, and no lock-in. Export or self-host anytime.",
  },
];

const solutions = [
  {
    icon: GraduationCap,
    title: "Academic Research",
    description: "Field surveys, theses, and longitudinal studies for faculty, labs, and graduate students who need reliable data wherever their subjects are.",
    examples: ["Longitudinal health surveys", "Remote participant interviews", "Lab and classroom studies"],
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: TrendingUp,
    title: "Market & Consumer Research",
    description: "Customer feedback, NPS, and brand studies that keep field teams on the same dataset — online or on the shop floor.",
    examples: ["Customer satisfaction programs", "Product and pricing studies", "Mystery shopper audits"],
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: HeartPulse,
    title: "Public Health & NGOs",
    description: "Community assessments and program evaluations in low-connectivity areas, where every offline response is critical.",
    examples: ["Community health assessments", "Program monitoring & evaluation", "Outreach campaigns"],
    color: "text-rose-600 bg-rose-50",
  },
  {
    icon: Building2,
    title: "Enterprise & Field Operations",
    description: "Site audits, inspections, and employee engagement across multiple locations with coordinated field teams.",
    examples: ["Compliance and safety inspections", "Employee engagement surveys", "Multi-site quality checks"],
    color: "text-emerald-600 bg-emerald-50",
  },
];

const features = [
  {
    icon: CloudOff,
    title: "Reliable collection, even offline",
    description: "Responses are saved on the device the moment they are entered and sync automatically when a connection returns. No lost data, no double entry, no excuses.",
  },
  {
    icon: Microscope,
    title: "Analytics built for real research",
    description: "Go beyond charts: cross-tabulate variables, surface recurring themes in open-ended answers, and review raw data for every response.",
  },
  {
    icon: Users,
    title: "Coordinate your whole field team",
    description: "Invite collectors by email, control who has access, and track live collection sessions with pause, resume, and submit controls.",
  },
  {
    icon: ClipboardList,
    title: "Guided, structured questionnaires",
    description: "Organize surveys into sections and pages, enforce required answers, and keep every collector asking questions in a consistent order.",
  },
  {
    icon: ShieldCheck,
    title: "Data you can defend",
    description: "Own your dataset, export it anytime, and audit how every response was collected — confidence you need for findings that matter.",
  },
  {
    icon: Smartphone,
    title: "Field-ready on any device",
    description: "Works on phones, tablets, and laptops — install it like an app and collect where your respondents actually are.",
  },
];

const steps = [
  {
    number: "01",
    title: "Design your study",
    description: "Structure questions into sections, choose from six question types, and set which answers are required — without learning a spreadsheet.",
    icon: ClipboardList,
  },
  {
    number: "02",
    title: "Deploy your field team",
    description: "Share a link with your team or the public. Collectors keep working offline, and live sessions show exactly how much each person has collected.",
    icon: Users,
  },
  {
    number: "03",
    title: "Turn responses into findings",
    description: "Explore results in real time, dig into open-ended answers, and export clean data for your statistics tools and publications.",
    icon: Microscope,
  },
];

export default function LandingPage() {
  const [user, setUser] = useState<LandingUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar user={user} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-slide-up">
              <Badge variant="outline" className="gap-1.5 w-fit">
                <Globe className="h-3 w-3" />
                Built for research teams &amp; field professionals
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                Field research that never misses
                <span className="text-primary"> a single response</span>.
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                SurveySync is an end-to-end research platform for designing studies, collecting
                dependable data — even fully offline — and turning responses into findings your
                organization can trust.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href={user ? "/dashboard" : "/login?register=true"}>
                  <Button size="lg" className="gap-2 text-base px-8">
                    {user ? "Go to Dashboard" : "Start a Study Free"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#solutions">
                  <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                    See Who It&rsquo;s For
                  </Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                Trusted by research teams in academia, public health, market research, and field operations.
              </p>
            </div>
            <div className="hidden lg:block animate-slide-up" style={{ animationDelay: "200ms" }}>
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Value stats */}
      <section className="border-y bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 py-10">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {valueStats.map((stat, i) => (
              <div key={stat.title} className="flex gap-3 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="h-10 w-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{stat.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{stat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section id="solutions" className="py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-slide-up">
            <Badge variant="secondary" className="mb-4">Who It&rsquo;s For</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Built Around the Work of Research Teams
            </h2>
            <p className="text-muted-foreground text-lg">
              Wherever your study happens — a lab, a clinic, a market, or the field — SurveySync adapts to how your team actually works.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {solutions.map((s, i) => (
              <div
                key={s.title}
                className="group relative bg-card border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <div className={`h-11 w-11 rounded-lg flex items-center justify-center mb-4 ${s.color}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                <ul className="mt-4 space-y-1.5">
                  {s.examples.map((e) => (
                    <li key={e} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 animate-slide-up">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything You Need to Run a Serious Study
            </h2>
            <p className="text-muted-foreground text-lg">
              From questionnaire design to defensible data — one workflow, no disconnected tools.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="group relative bg-card border rounded-xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-slide-up"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <div className={`h-11 w-11 rounded-lg flex items-center justify-center mb-4 bg-primary/10`}>
                  <f.icon className="h-5 w-5 text-primary" />
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
              From Question to Finding in Three Steps
            </h2>
            <p className="text-muted-foreground text-lg">
              No complicated setup, no training courses — your team can be collecting data in minutes.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.number} className="relative text-center animate-slide-up" style={{ animationDelay: `${(i + 1) * 100}ms` }}>
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary font-bold text-lg mb-5">
                  {step.number}
                </div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data ownership CTA */}
      <section id="ownership" className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground p-10 sm:p-14 animate-slide-up">
            <div className="absolute inset-0 opacity-40 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')]" />
            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Your research data is yours — always.
                </h2>
                <p className="text-primary-foreground/80 text-lg mb-6 leading-relaxed">
                  Large organizations and research institutions have non-negotiables: data ownership,
                  exportability, and control. SurveySync is built around them.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    "Export complete datasets to CSV for SPSS, R, Excel, or your own pipelines",
                    "Self-host on your own infrastructure when compliance demands it",
                    "No data harvesting, no third-party reselling — ever",
                    "Open, auditable code you can review and extend",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary-foreground shrink-0 mt-0.5" />
                      <span className="text-primary-foreground/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3 md:items-end">
                <Link href={user ? "/dashboard" : "/login?register=true"} className="w-full md:w-auto">
                  <Button size="lg" variant="secondary" className="gap-2 text-base px-8 w-full md:w-auto">
                    {user ? "Go to Dashboard" : "Start Your Next Study"} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="https://github.com/Astonie/surveysync" target="_blank" rel="noopener noreferrer" className="w-full md:w-auto">
                  <Button size="lg" variant="outline" className="gap-2 text-base px-8 w-full md:w-auto border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    Review the Source
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
              <a href="#solutions" className="hover:text-foreground transition-colors">Who It&rsquo;s For</a>
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

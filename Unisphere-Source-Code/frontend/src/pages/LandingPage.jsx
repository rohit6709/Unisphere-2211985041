import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BellIcon,
  CalendarIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  LogoMarkIcon,
  MoonIcon,
  SunIcon,
  TeamIcon,
  XCircleIcon,
} from '../components/icons';
import { useThemeContext } from '../context/ThemeContext';

const PAGE_CONTAINER = 'mx-auto w-full max-w-[1320px] px-5 sm:px-6 lg:px-10';

const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#problems', label: 'Problems' },
  { href: '#features', label: 'Features' },
];

const problemPoints = [
  {
    tag: '01',
    title: 'Poor Club Discovery',
    description:
      'Freshers have no structured way to find clubs matching their interests. They rely on orientation fairs or word of mouth — and miss most of what campus has to offer.',
  },
  {
    tag: '02',
    title: 'Missed Events',
    description:
      'Students learn about events after they happen. No centralized, real-time event feed exists — critical updates are buried in WhatsApp groups and printed flyers.',
  },
  {
    tag: '03',
    title: 'Registration Friction',
    description:
      'Event sign-ups involve manual forms, spreadsheets, or in-person queues — creating friction, lost data, and drop-offs before students even show up.',
  },
  {
    tag: '04',
    title: 'Communication Chaos',
    description:
      'Post-event communication lives in WhatsApp groups that never get cleaned up. Dead groups, missed announcements, and notification overload for everyone.',
  },
];

const featureCards = [
  {
    eyebrow: 'Discovery',
    title: 'Interest-Driven Club Feed',
    description:
      'Students browse clubs by category and interest tags. No more orientation fairs or word-of-mouth — find your community in minutes, not months.',
    Icon: TeamIcon,
    accent: 'sage',
  },
  {
    eyebrow: 'Events',
    title: 'Unified Event Calendar',
    description:
      'One real-time feed for every fest, workshop, and club meeting on campus. Register in one tap — no forms, no spreadsheets, no queues.',
    Icon: CalendarIcon,
    accent: 'citron',
  },
  {
    eyebrow: 'Approvals',
    title: 'Structured Approval Flows',
    description:
      'Club leaders propose events, faculty advisors approve, admins publish. Every step tracked and transparent — no more follow-up chasing.',
    Icon: CheckCircleIcon,
    accent: 'ink',
  },
];

const accentBg = (a) => ({
    sage: 'bg-sage text-sage-foreground',
    citron: 'bg-accent text-accent-foreground',
    ink: 'bg-foreground text-background',
    cream: 'bg-secondary text-secondary-foreground',
  }[a] || 'bg-secondary');

/* =====================================================  NAVBAR  ===================================================== */
function Navbar({ theme, toggleTheme }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
      <div className={`${PAGE_CONTAINER} flex h-16 items-center justify-between`}>
        <Link to="/" className="flex items-center gap-2.5 group" data-testid="nav-logo">
          <LogoMarkIcon size={32} />
          <span className="font-display text-[22px] leading-none tracking-tight text-foreground">Unisphere</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`nav-link-${l.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-secondary transition text-foreground"
            data-testid="theme-toggle"
          >
            {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
          <Link
            to="/login"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 transition"
            data-testid="nav-cta"
          >
            Sign in <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* =====================================================  HERO  ===================================================== */
function HeroSection() {
  return (
    <section id="about" className="relative overflow-hidden grain">
      <div className={`${PAGE_CONTAINER} relative pt-14 pb-24 md:pt-20 md:pb-32`}>
        <div className="absolute right-0 top-12 hidden lg:block h-[420px] w-[420px] dotted-grid opacity-60 -z-10 rounded-full gradient-mask-b" />

        <div className="grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <div className="rise rise-1 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-mono uppercase tracking-widest text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              University Club & Event Platform
            </div>

            <h1 className="rise rise-2 mt-6 font-display text-[clamp(3rem,7.2vw,6.5rem)] leading-[0.95] tracking-tight text-balance text-foreground">
              One place to run<br />
              your <em className="not-italic underline-citron font-display">campus</em> ecosystem.
            </h1>

            <p className="rise rise-3 mt-7 max-w-xl text-lg text-muted-foreground leading-relaxed">
              Unisphere replaces WhatsApp groups, paper flyers, and scattered spreadsheets with a structured, approval-gated platform for
              <span className="text-foreground"> clubs, events, and campus communication.</span>
            </p>

            <div className="rise rise-4 mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background hover:opacity-90 transition"
                data-testid="hero-cta-start"
              >
                Get Started
                <ArrowRightIcon size={16} />
              </Link>
              <a
                href="#features"
                className="group inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium hover:bg-secondary transition text-foreground"
                data-testid="hero-cta-explore"
              >
                Explore Features
                <ChevronDownIcon size={16} />
              </a>
            </div>

          </div>

          {/* Hero composition: stacked cards mock */}
          <div className="lg:col-span-5 relative rise rise-3">
            <div className="relative h-[520px] sm:h-[560px]">
              {/* Big primary card */}
              <div className="absolute right-0 top-24 w-[88%] rounded-3xl bg-card border border-border ring-soft p-5 animate-float">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-sage text-sage-foreground grid place-items-center">
                      <TeamIcon size={14} strokeWidth={2} color="currentColor" />
                    </div>
                    <div className="text-sm font-medium text-foreground">Robotics Club · Proposal</div>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">EVT-218</span>
                </div>
                <div className="mt-4 font-display text-2xl leading-tight text-foreground">"Tech Fest 2026" — Annual hackathon</div>
                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  {['120 RSVPs', 'Sat · 10 AM', 'Pending Approval'].map((t) => (
                    <span key={t} className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-7 w-7 rounded-full border-2 border-card ${
                          ['bg-accent', 'bg-sage', 'bg-foreground', 'bg-secondary'][i]
                        }`}
                      />
                    ))}
                  </div>
                  <button className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[12px] font-medium text-accent-foreground">
                    <CheckCircleIcon size={14} color="currentColor" /> Approve
                  </button>
                </div>
              </div>

              {/* Floating notification chip */}
              <div
                className="absolute right-[-8px] top-0 z-10 rounded-2xl bg-foreground text-background px-4 py-3 shadow-lg max-w-[280px] animate-float"
                style={{ animationDelay: '1.2s' }}
              >
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest opacity-70">
                  <BellIcon size={12} color="currentColor" /> New approval
                </div>
                <div className="mt-1 text-sm leading-snug">
                  Dr. Pillai approved <span className="underline-citron text-background">"Tech Fest 2026"</span>
                </div>
              </div>

              {/* Sparkle accent */}
              <div className="absolute left-[8%] top-[18%] h-3 w-3 rotate-45 bg-accent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================  PROBLEMS  ===================================================== */
function ProblemSolvedSection() {
  return (
    <section id="problems" className="relative py-24 md:py-32 bg-secondary/40">
      <div className={PAGE_CONTAINER}>
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground">— What we fix</div>
            <h2 className="mt-4 font-display text-5xl md:text-6xl leading-[0.95] tracking-tight text-foreground">
              Campus life<br />
              deserves <em className="not-italic underline-citron">better</em>
              <br />
              tooling.
            </h2>
            <p className="mt-6 text-muted-foreground max-w-sm">
              We replace the messy patchwork of WhatsApp, Sheets, and printed forms with a single, calm system designed for the way modern institutions actually work.
            </p>
          </div>

          <div className="lg:col-span-8 space-y-3">
            {problemPoints.map((p, i) => (
              <div
                key={p.tag}
                className="group relative grid grid-cols-12 items-center gap-4 rounded-2xl border border-border bg-card/70 p-6 hover-lift"
                data-testid={`problem-card-${i}`}
              >
                <div className="col-span-2 sm:col-span-1 font-mono text-sm text-muted-foreground">{p.tag}</div>
                <div className="col-span-9 sm:col-span-9">
                  <div className="flex items-center gap-3">
                    <XCircleIcon size={16} color="currentColor" />
                    <h3 className="font-display text-2xl leading-tight text-foreground">{p.title}</h3>
                  </div>
                  <p className="mt-2 text-muted-foreground max-w-2xl">{p.description}</p>
                </div>
                <div className="col-span-1 sm:col-span-2 flex justify-end items-center gap-2">
                  <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground px-3 py-1 text-[11px] font-medium">
                    <CheckCircleIcon size={12} color="currentColor" /> Solved
                  </div>
                  <span className="text-muted-foreground transition-transform group-hover:rotate-45">
                    <ArrowUpRightIcon size={18} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================  FEATURES  ===================================================== */
function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className={PAGE_CONTAINER}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-muted-foreground">— Capabilities</div>
            <h2 className="mt-4 font-display text-5xl md:text-6xl leading-[0.95] tracking-tight max-w-3xl text-foreground">
              Everything campus life needs, <em className="not-italic underline-citron">nothing</em> it doesn't.
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureCards.map((f, i) => {
            const Icon = f.Icon;
            return (
              <article
                key={f.title}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 hover-lift"
                data-testid={`feature-card-${i}`}
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accentBg(f.accent)}`}>
                  <Icon size={20} strokeWidth={1.8} color="currentColor" />
                </div>
                <div className="mt-6 text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">{f.eyebrow}</div>
                <h3 className="mt-2 font-display text-2xl leading-tight text-foreground">{f.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{f.description}</p>

                <div className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full bg-accent/0 group-hover:bg-accent/10 transition-colors" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =====================================================  CTA  ===================================================== */
function CTASection() {
  return (
    <section className="relative py-24 md:py-32">
      <div className={PAGE_CONTAINER}>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground text-background p-10 md:p-16 grain">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-40 w-40 dotted-grid opacity-20" />

          <div className="relative grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <div className="text-xs font-mono uppercase tracking-[0.22em] text-background/60">— Ready when you are</div>
              <h3 className="mt-4 font-display text-5xl md:text-7xl leading-[0.92] tracking-tight">
  Students discover. Leaders propose. Faculty approve.{' '}
  <em className="not-italic text-accent">Admins oversee.</em>
</h3>
            </div>
            <div className="md:col-span-4 flex flex-wrap gap-3 md:justify-end">
              <Link
                to="/login"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-accent text-accent-foreground px-6 text-sm font-medium hover:opacity-90 transition"
                data-testid="cta-primary"
              >
                Get Started <ArrowRightIcon size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================  FOOTER  ===================================================== */
function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className={`${PAGE_CONTAINER} py-6`}>
          <div className="text-xs text-muted-foreground font-mono text-center">© {new Date().getFullYear()} Unisphere · Built for campuses that care</div>

        {/* Massive editorial wordmark */}
        <div className="pointer-events-none mt-4 select-none overflow-hidden">
          <div className="font-display text-[clamp(5rem,18vw,18rem)] leading-[0.85] tracking-[-0.04em] text-foreground/5 text-center">
            unisphere.
          </div>
        </div>
      </div>
    </footer>
  );
}

/* =====================================================  PAGE  ===================================================== */
export default function LandingPage() {
  const { theme, toggleTheme } = useThemeContext();

  return (
    <div id="top" className="min-h-screen bg-background text-foreground antialiased">
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <main>
        <HeroSection />
        <ProblemSolvedSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
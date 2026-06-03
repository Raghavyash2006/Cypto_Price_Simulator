import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import LandingChart from '../components/landing/LandingChart';
import ThemeToggle from '../components/layout/ThemeToggle';
import { toggleTheme } from '../features/ui/uiSlice';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'AI Mentor', href: '#mentor' },
  { label: 'Trading', href: '#trading' },
  { label: 'Leaderboard', href: '#leaderboard' },
  { label: 'FAQ', href: '#faq' }
];

const features = [
  {
    title: 'Adaptive learning paths',
    text: 'Personalized lessons, milestones, and challenges that adapt to skill level and pace.',
    accent: 'from-cyan-400/20 to-blue-500/10'
  },
  {
    title: 'Gamified progress engine',
    text: 'XP, streaks, badges, and quests designed to keep learners engaged and moving forward.',
    accent: 'from-emerald-400/20 to-teal-500/10'
  },
  {
    title: 'Live market simulation',
    text: 'Practice with risk-free portfolios, strategy experiments, and real-time crypto price patterns.',
    accent: 'from-violet-400/20 to-fuchsia-500/10'
  },
  {
    title: 'Community-driven growth',
    text: 'Mentors, leaderboards, and peer chat keep learning social, competitive, and rewarding.',
    accent: 'from-amber-400/20 to-orange-500/10'
  }
];

const mentorInsights = [
  'AI explains terms in plain language',
  'Generates a next-step study plan',
  'Recommends practice lessons from your weak spots'
];

const leaderboard = [
  { name: 'Nova', xp: '12,480 XP', rank: '#1', share: '92%' },
  { name: 'Cipher', xp: '11,950 XP', rank: '#2', share: '85%' },
  { name: 'Astra', xp: '11,230 XP', rank: '#3', share: '77%' }
];

const testimonials = [
  {
    quote: 'It feels like a fintech startup built for serious learners, not just a course site.',
    name: 'Maya Chen',
    role: 'Web3 product designer'
  },
  {
    quote: 'The simulated trading and AI mentor make crypto finally click for my team.',
    name: 'Jordan Lee',
    role: 'Community growth lead'
  },
  {
    quote: 'The UI is polished enough to ship as a real SaaS landing page tomorrow.',
    name: 'Ari Patel',
    role: 'Startup founder'
  }
];

const faqs = [
  {
    question: 'Is this platform suitable for beginners?',
    answer: 'Yes. The learning flow starts with fundamentals, then adapts lessons and practice to your pace.'
  },
  {
    question: 'Can I practice without using real money?',
    answer: 'Absolutely. The virtual trading suite mirrors market movement so learners can experiment safely.'
  },
  {
    question: 'How does the AI mentor help?',
    answer: 'It summarizes lessons, recommends next steps, and helps users understand market concepts faster.'
  },
  {
    question: 'Is the experience responsive on mobile?',
    answer: 'Yes. The layout, cards, charts, and navigation are all built to work smoothly on small screens.'
  }
];

const statCards = [
  { label: 'Active learners', value: '24.8k' },
  { label: 'XP earned today', value: '1.2M' },
  { label: 'Simulated trades', value: '84k' }
];

const floatingIcons = [
  { label: 'BTC', top: '10%', left: '6%' },
  { label: 'ETH', top: '24%', right: '8%' },
  { label: 'SOL', top: '66%', left: '10%' },
  { label: 'AI', top: '72%', right: '12%' }
];

export default function HomePage() {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.ui.theme);

  const sectionClass = 'rounded-[2rem] border border-[color:var(--page-border)] bg-[var(--page-surface)] shadow-[0_20px_80px_-30px_rgba(15,23,42,0.75)] backdrop-blur-xl';
  const headingClass = 'text-[var(--page-text)]';
  const mutedClass = 'text-[var(--page-muted)]';

  return (
    <div className="relative overflow-hidden bg-[var(--page-bg)] text-[var(--page-text)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-[-10rem] h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-24 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/4 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:72px_72px] opacity-30" />
      </div>

      <header className="sticky top-0 z-50 border-b border-[color:var(--page-border)] bg-[color:color-mix(in_srgb,var(--page-bg)_76%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20">
              CS
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Crypto Simulator</p>
              <p className={`text-sm ${mutedClass}`}>AI-powered gamified learning</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-[var(--page-muted)] md:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="transition hover:text-[var(--page-text)]">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={() => dispatch(toggleTheme())} />
            <Link
              to="/login"
              className="hidden rounded-full border border-[color:var(--page-border)] px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-white/10 sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[color:var(--page-border)] bg-[var(--page-surface)] px-6 py-12 shadow-[0_30px_100px_-40px_rgba(15,23,42,0.9)] backdrop-blur-2xl sm:px-10 lg:px-12 lg:py-16">
          {floatingIcons.map((icon, index) => (
            <motion.div
              key={icon.label}
              animate={{ y: [0, -12, 0], rotate: [0, 4, 0] }}
              transition={{ duration: 6 + index, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute hidden h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sm font-semibold text-white shadow-lg backdrop-blur-md md:flex"
              style={{ top: icon.top, left: icon.left, right: icon.right }}
            >
              {icon.label}
            </motion.div>
          ))}

          <div className="relative grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-7"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--page-border)] bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.9)]" />
                Premium crypto academy
              </div>
              <div className="space-y-5">
                <h1 className={`max-w-3xl text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl ${headingClass}`}>
                  Learn crypto like a startup-backed product: smart, gamified, and built to scale.
                </h1>
                <p className={`max-w-2xl text-lg leading-8 ${mutedClass}`}>
                  An AI-powered platform that turns blockchain education into a premium SaaS experience with live practice,
                  adaptive mentoring, streak rewards, and real-time market visuals.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-7 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:-translate-y-0.5"
                >
                  Get started free
                </Link>
                <a
                  href="#mentor"
                  className="rounded-full border border-[color:var(--page-border)] px-7 py-3 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  See the AI mentor
                </a>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {statCards.map((stat) => (
                  <div key={stat.label} className="rounded-3xl border border-[color:var(--page-border)] bg-black/10 p-4">
                    <p className="text-sm text-[var(--page-muted)]">{stat.label}</p>
                    <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className={`${sectionClass} relative overflow-hidden p-5 sm:p-6`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-fuchsia-400" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="glass-panel rounded-3xl p-4">
                  <p className="text-sm text-cyan-300">AI signal</p>
                  <p className="mt-2 text-xl font-semibold">Smart onboarding</p>
                  <p className="mt-3 text-sm text-slate-300">Learners are routed into lessons, quests, and trading drills based on skill level.</p>
                </div>
                <div className="glass-panel rounded-3xl p-4">
                  <p className="text-sm text-emerald-300">XP velocity</p>
                  <p className="mt-2 text-xl font-semibold">+18% week over week</p>
                  <p className="mt-3 text-sm text-slate-300">Progress streaks and completion bonuses keep users engaged and returning daily.</p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-4">
                <div className="mb-4 flex items-center justify-between text-sm text-slate-300">
                  <span>Portfolio growth</span>
                  <span>7 day view</span>
                </div>
                <div className="h-72">
                  <LandingChart theme={theme} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  ['Risk-free', 'Practice with virtual capital'],
                  ['AI mentor', 'Personalized lesson summaries'],
                  ['Ranked', 'Compete on a live leaderboard']
                ].map(([title, desc]) => (
                  <div key={title} className="glass-panel rounded-2xl p-4">
                    <p className="font-semibold">{title}</p>
                    <p className="mt-1 text-sm text-slate-300">{desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="mt-8 space-y-6 scroll-mt-28">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">Features</p>
            <h2 className={`mt-3 text-3xl font-bold sm:text-4xl ${headingClass}`}>Built like a premium fintech launch site.</h2>
            <p className={`mt-3 text-base leading-7 ${mutedClass}`}>
              Every surface is designed to feel modern, trustworthy, and product-ready with motion, depth, and polished micro-interactions.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <motion.article
                key={feature.title}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className={`${sectionClass} bg-gradient-to-br ${feature.accent} p-6`}
              >
                <div className="flex h-full flex-col gap-4 rounded-[1.5rem] bg-[var(--page-surface)] p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold">
                    0{index + 1}
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className={`text-sm leading-6 ${mutedClass}`}>{feature.text}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="mentor" className="mt-8 scroll-mt-28">
          <div className={`${sectionClass} grid gap-8 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8`}>
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">AI Mentor Showcase</p>
              <h2 className={`text-3xl font-bold sm:text-4xl ${headingClass}`}>A mentor that teaches, adapts, and motivates.</h2>
              <p className={`${mutedClass} text-base leading-7`}>
                The AI assistant translates crypto concepts into practical steps, then recommends the right quests, lessons,
                and market drills to close knowledge gaps.
              </p>

              <div className="space-y-3">
                {mentorInsights.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/65 p-5 shadow-2xl shadow-cyan-500/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Mentor chat</p>
                  <h3 className="mt-1 text-xl font-semibold">Crypto Coach AI</h3>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">Online</span>
              </div>

              <div className="mt-5 space-y-4">
                <div className="max-w-[82%] rounded-3xl rounded-tl-md bg-white/8 px-4 py-3 text-sm text-slate-100">
                  Today you learned wallet basics. Ready for a gas fee simulation and a risk quiz?
                </div>
                <div className="ml-auto max-w-[82%] rounded-3xl rounded-tr-md bg-gradient-to-r from-cyan-400 to-emerald-400 px-4 py-3 text-sm font-medium text-slate-950">
                  Yes — show me the fastest path to level 2.
                </div>
                <div className="max-w-[82%] rounded-3xl rounded-tl-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
                  Perfect. I’ll unlock a micro-lesson, a virtual trade, and a streak bonus if you finish both.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="trading" className="mt-8 scroll-mt-28">
          <div className={`${sectionClass} grid gap-8 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8`}>
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">Virtual Trading Showcase</p>
              <h2 className={`mt-3 text-3xl font-bold sm:text-4xl ${headingClass}`}>Practice the market without real-world risk.</h2>
              <p className={`mt-3 max-w-2xl text-base leading-7 ${mutedClass}`}>
                Simulate entries, exits, and portfolio management inside a polished sandbox that mirrors real crypto momentum.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  ['Paper balance', '$25,000'],
                  ['Win rate', '68.4%'],
                  ['Avg. hold', '3.2 days']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="mt-2 text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Trade activity</span>
                  <span>Live simulation</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    'BTC breakout long — +8.2% virtual return',
                    'ETH swing trade — +4.1% virtual return',
                    'SOL momentum scalp — +3.7% virtual return',
                    'Risk module unlocked — reward boosted'
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Signals</p>
                  <h3 className="mt-1 text-xl font-semibold">Momentum panel</h3>
                </div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Bullish
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {[
                  { symbol: 'BTC', score: 92, note: 'Strong learning module correlation' },
                  { symbol: 'ETH', score: 84, note: 'Healthy simulation volume' },
                  { symbol: 'SOL', score: 76, note: 'High volatility practice window' }
                ].map((asset) => (
                  <div key={asset.symbol} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{asset.symbol}</p>
                        <p className="text-sm text-slate-400">{asset.note}</p>
                      </div>
                      <span className="text-xl font-black text-cyan-300">{asset.score}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${asset.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="leaderboard" className="mt-8 scroll-mt-28">
          <div className={`${sectionClass} grid gap-8 p-6 lg:grid-cols-[0.95fr_1.05fr] lg:p-8`}>
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">Leaderboard Preview</p>
              <h2 className={`mt-3 text-3xl font-bold sm:text-4xl ${headingClass}`}>Friendly competition drives retention.</h2>
              <p className={`mt-3 text-base leading-7 ${mutedClass}`}>
                Learners climb the ranks with XP from lessons, quizzes, and trading milestones — a motivating loop that feels like a live product.
              </p>

              <div className="mt-6 space-y-4">
                {leaderboard.map((player) => (
                  <div key={player.name} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{player.rank}</p>
                        <p className="mt-1 text-lg font-semibold">{player.name}</p>
                      </div>
                      <p className="text-sm font-medium text-slate-300">{player.xp}</p>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400" style={{ width: player.share }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Badges for streaks, quizzes, and module completions',
                'Weekly challenges that unlock advanced mentor prompts',
                'Classroom-style team events with live ranking updates',
                'Seasonal reward tracks for consistent progress'
              ].map((item) => (
                <div key={item} className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
                  <div className="mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-emerald-400/20" />
                  <p className="text-sm leading-6 text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">Testimonials</p>
          <div className="mt-4 grid gap-5 lg:grid-cols-3">
            {testimonials.map((item, index) => (
              <motion.article
                key={item.name}
                whileHover={{ y: -6 }}
                className={`${sectionClass} p-6`}
              >
                <p className="text-5xl leading-none text-cyan-300/80">“</p>
                <p className="mt-3 text-base leading-7 text-slate-200">{item.quote}</p>
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-slate-400">{item.role}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">0{index + 1}</span>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="faq" className="mt-8 scroll-mt-28">
          <div className={`${sectionClass} grid gap-8 p-6 lg:grid-cols-[0.8fr_1.2fr] lg:p-8`}>
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-300">FAQ</p>
              <h2 className={`mt-3 text-3xl font-bold sm:text-4xl ${headingClass}`}>Quick answers for curious learners.</h2>
              <p className={`mt-3 text-base leading-7 ${mutedClass}`}>
                Clear onboarding and transparent product messaging are part of the premium startup feel.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-3xl border border-white/10 bg-white/5 p-5 open:bg-white/8">
                  <summary className="cursor-pointer list-none text-lg font-semibold outline-none">
                    <div className="flex items-center justify-between gap-4">
                      <span>{faq.question}</span>
                      <span className="text-cyan-300 transition group-open:rotate-45">+</span>
                    </div>
                  </summary>
                  <p className={`mt-4 text-sm leading-7 ${mutedClass}`}>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[color:var(--page-border)] bg-black/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-black text-slate-950">
                CS
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Crypto Simulator</p>
                <p className={`text-sm ${mutedClass}`}>Premium AI crypto learning platform</p>
              </div>
            </div>
            <p className={`mt-5 max-w-xl text-sm leading-7 ${mutedClass}`}>
              Built to feel like a polished fintech startup: modern, trustworthy, and designed for serious product storytelling.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">Product</p>
            <div className="mt-4 space-y-3 text-sm text-[var(--page-muted)]">
              <a href="#features" className="block transition hover:text-[var(--page-text)]">Features</a>
              <a href="#mentor" className="block transition hover:text-[var(--page-text)]">AI Mentor</a>
              <a href="#trading" className="block transition hover:text-[var(--page-text)]">Virtual Trading</a>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">Get started</p>
            <div className="mt-4 space-y-3">
              <Link to="/register" className="block rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-5 py-3 text-center text-sm font-bold text-slate-950">
                Create account
              </Link>
              <Link to="/login" className="block rounded-full border border-[color:var(--page-border)] px-5 py-3 text-center text-sm font-semibold hover:bg-white/10">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
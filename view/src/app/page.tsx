import Link from "next/link";
import {
  Zap,
  Users,
  BarChart3,
  Trophy,
  MapPin,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Github,
  User,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">B</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">BadmintonHub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link href="/login" className="btn-primary text-sm px-4 py-2">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-32 bg-gradient-to-b from-primary-50 to-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(22,163,74,0.15),rgba(255,255,255,0))]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Left Box (Project Built By) */}
            <div className="order-2 lg:order-1 bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 text-left w-full max-w-md mx-auto shadow-xl relative overflow-hidden hover:border-primary-200 transition-all group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100/50 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-50 rounded-full blur-3xl -ml-10 -mb-10" />

              <div className="relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 group-hover:bg-primary-100 transition-colors flex items-center justify-center text-primary-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Project Built By</h2>
                    <p className="text-gray-500 text-sm">Developed by Sairam Maruri. Let&apos;s connect!</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-600">
                    <User className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900">MARURI SAI RAMA LINGA REDDY</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <a href="mailto:sairam.maruri@gmail.com" className="text-sm hover:text-primary-600 transition-colors">sairam.maruri@gmail.com</a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <a href="tel:+917893865644" className="text-sm hover:text-primary-600 transition-colors">+91 78938 65644</a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Globe className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <a href="https://saiii.in" target="_blank" rel="noreferrer" className="text-sm hover:text-primary-600 transition-colors">Portfolio - saiii.in</a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Linkedin className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <a href="https://linkedin.com/in/sairam-maruri/" target="_blank" rel="noreferrer" className="text-sm hover:text-primary-600 transition-colors">linkedin.com/in/sairam-maruri/</a>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Github className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <a href="https://github.com/sairam3824" target="_blank" rel="noreferrer" className="text-sm hover:text-primary-600 transition-colors">github.com/sairam3824</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side (Hero Content) */}
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                AI-powered match pairing included
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-bold text-gray-900 leading-tight">
                Manage your badminton team{" "}
                <span className="text-primary-600">effortlessly</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Schedule matches, track live scores, analyse performance, and get AI
                pairing suggestions — all in one place for your entire team.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
                <Link href="/login" className="btn-primary px-8 py-3 text-base">
                  Start for free
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <Link href="/login" className="btn-secondary px-8 py-3 text-base">
                  Sign in to existing team
                </Link>
              </div>
              <p className="mt-4 text-sm text-gray-400">No credit card required · Free forever for small teams</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything your team needs
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              A complete platform built for badminton clubs, from casual groups to competitive teams.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="p-6 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center mb-4 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof / Demo */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Multi-team, fully isolated
              </h2>
              <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                Whether you play in multiple clubs or manage several teams, BadmintonHub keeps every team&apos;s data completely separate and secure.
              </p>
              <ul className="space-y-4">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-600">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/login" className="btn-primary px-6 py-2.5">
                  Create your team
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
                  <div className="text-3xl font-bold text-primary-600 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to level up your badminton game?
          </h2>
          <p className="text-primary-100 text-lg mb-8">
            Join teams already using BadmintonHub to manage their matches.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors text-base">
            Get started free
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="text-gray-400 text-sm">BadmintonHub</span>
          </div>
          <p className="text-gray-500 text-sm">© {new Date().getFullYear()} BadmintonHub. Built for badminton players.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: Users,
    title: "Team Management",
    description: "Create teams, invite players, manage roles, and switch between multiple teams seamlessly.",
  },
  {
    icon: Zap,
    title: "Live Scoring",
    description: "Track scores in real-time during matches with automatic winner declaration for badminton rules.",
  },
  {
    icon: BarChart3,
    title: "Statistics & Analytics",
    description: "Win/loss records, head-to-head comparisons, leaderboards, and detailed match history.",
  },
  {
    icon: MapPin,
    title: "Venue Management",
    description: "Manage multiple courts and locations. Track where matches are played and plan accordingly.",
  },
  {
    icon: Trophy,
    title: "Rankings & Leaderboard",
    description: "Automatic team leaderboard based on wins, losses, and performance metrics.",
  },
  {
    icon: Sparkles,
    title: "AI Pairing Suggestions",
    description: "Smart doubles match pairing powered by AI, considering skill levels and past performance.",
  },
];

const benefits = [
  "Complete data isolation between teams",
  "Mobile-first design for courtside use",
  "Role-based access control (Admin/Member)",
  "Availability tracking before matches",
  "Smart notifications for upcoming matches",
];

const stats = [
  { value: "21pts", label: "Standard set target" },
  { value: "3 sets", label: "Best of three" },
  { value: "6", label: "Players per team" },
  { value: "∞", label: "Teams supported" },
];

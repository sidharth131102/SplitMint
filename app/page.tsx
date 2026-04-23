import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Brain, TrendingUp, ArrowRight, Zap } from "lucide-react";
import ThemeToggle from "@/components/layout/ThemeToggle";

const features = [
  { icon: Users, title: "Smart Groups", desc: "Create groups, add participants, and split every expense fairly with equal, custom, or percentage splits." },
  { icon: Brain, title: "MintSense AI", desc: "Just type 'paid 840 for dinner with Rahul' and AI fills out the entire expense form for you." },
  { icon: TrendingUp, title: "Balance Engine", desc: "Real-time debt matrix, minimal settlement paths, and AI-explained payment plans so everyone knows what to pay." },
  { icon: Zap, title: "Finance Chatbot", desc: "Powered by Groq's blazing-fast LLM — ask questions about your spending, debts, and financial patterns." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background overflow-hidden">
      {/* Animated background mesh */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.12)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(245,158,11,0.08)_0%,_transparent_50%)]" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold" style={{ fontFamily: "var(--font-sora)" }}>SplitMint</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-8">
          <Sparkles className="w-3 h-3" />
          AI-Powered Bill Splitting
        </div>

        <h1
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-3xl"
          style={{ fontFamily: "var(--font-sora)" }}
        >
          Split bills{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-400">
            smarter
          </span>{" "}
          with AI
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
          SplitMint combines expense tracking with MintSense AI — just describe your expense in plain English and let AI handle the math.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/register">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-base gap-2">
              Start for free <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
              Sign in
            </Button>
          </Link>
        </div>

        {/* Decorative expense cards */}
        <div className="relative mt-20 w-full max-w-2xl">
          <div className="absolute -top-4 -left-8 bg-card border border-border rounded-2xl p-4 shadow-xl rotate-[-4deg] opacity-80 hidden md:block">
            <p className="text-xs text-muted-foreground">Rahul paid</p>
            <p className="font-mono font-bold text-primary text-lg">₹1,240.00</p>
            <p className="text-xs text-muted-foreground mt-1">Dinner at Taj 🍽️</p>
          </div>
          <div className="absolute -top-2 -right-8 bg-card border border-primary/20 rounded-2xl p-4 shadow-xl rotate-[3deg] opacity-80 hidden md:block">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-xs text-primary font-medium">MintSense</span>
            </div>
            <p className="text-xs">&quot;Parsed: ₹840 dinner, split equally between 3&quot;</p>
          </div>
          <div className="mx-auto bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold">Goa Trip 🏖️</span>
              <span className="text-xs text-muted-foreground">4 members</span>
            </div>
            <div className="space-y-2">
              {["Priya → Me: ₹420", "You → Rahul: ₹280", "Ananya → Me: ₹350"].map((line) => (
                <div key={line} className="flex justify-between text-sm px-3 py-2 rounded-xl bg-secondary">
                  <span>{line.split(":")[0]}</span>
                  <span className="font-mono font-semibold text-primary">{line.split(":")[1]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12" style={{ fontFamily: "var(--font-sora)" }}>
          Everything you need to split fairly
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 py-20">
        <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-sora)" }}>
          Ready to split smarter?
        </h2>
        <p className="text-muted-foreground mb-8">Join thousands splitting smarter with AI-powered expense tracking.</p>
        <Link href="/register">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 text-base gap-2">
            Get started for free <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      <footer className="border-t border-border/50 text-center py-6 text-muted-foreground text-xs">
        © 2026 SplitMint · Split smarter, settle faster, stress less.
      </footer>
    </main>
  );
}

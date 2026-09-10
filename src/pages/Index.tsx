import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, Users, TrendingUp, ArrowRight, BarChart3, Shield } from "lucide-react";

const features = [
  {
    icon: Wallet,
    title: "Personal Tracking",
    description: "Log daily expenses with categories, notes, and date filters. See where your money goes with beautiful charts.",
  },
  {
    icon: Users,
    title: "Group Splitting",
    description: "Create groups for roommates, trips, or dinners. Split bills equally or with custom amounts.",
  },
  {
    icon: TrendingUp,
    title: "Smart Balances",
    description: "Automatic debt simplification tells you exactly who owes whom. Settle up with one tap.",
  },
];

const stats = [
  { value: "100%", label: "Free to use" },
  { value: "< 1s", label: "Instant sync" },
  { value: "256-bit", label: "Encrypted" },
];

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative py-24 md:py-36 flex flex-col items-center text-center gap-8">
          <div className="animate-slide-up flex flex-col items-center gap-6 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Smart expense tracking for modern life
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Split expenses,{" "}
              <span className="text-gradient">not friendships</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Track personal spending, split group bills, and settle debts — all in one
              beautifully simple app. No more awkward money conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="lg" className="text-base px-8 gap-2" asChild>
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/login">Log In</Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-8 md:gap-16 pt-8 animate-fade-in">
            {stats.map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="font-mono-num text-2xl md:text-3xl font-bold text-foreground">{value}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20 md:py-28">
        <div className="text-center mb-16">
          <p className="section-header mb-3">Features</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Everything you need to{" "}
            <span className="text-gradient">manage money</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }, i) => (
            <div
              key={title}
              className="glass-card glass-glow p-8 flex flex-col gap-4 hover:border-primary/30 transition-colors"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="glass-card glass-glow p-12 md:p-16 text-center flex flex-col items-center gap-6">
          <BarChart3 className="h-10 w-10 text-primary" />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ready to take control?
          </h2>
          <p className="text-muted-foreground max-w-lg text-lg">
            Join thousands who track expenses smarter. Set up in 30 seconds.
          </p>
          <Button size="lg" className="text-base px-8 gap-2" asChild>
            <Link to="/signup">
              Start Tracking Now
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            Split<span className="text-gradient">Track</span>
          </span>
          <span>© {new Date().getFullYear()} SplitTrack. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;

import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wallet, LayoutDashboard, Users, Menu, X, LogOut, User, Download, RefreshCw, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePWA } from "@/hooks/usePWA";

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/friends", label: "Friends", icon: UserPlus },
];

const TopNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLanding = location.pathname === "/";
  const { user, profile, signOut } = useAuth();
  const { canInstall, installApp, needsUpdate, updateApp, dismissUpdate } = usePWA();

  const initials = (profile?.display_name || profile?.email || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      {needsUpdate && (
        <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-sm animate-in slide-in-from-top">
          <span className="font-medium">A new version of SplitTrack is available!</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={updateApp} className="h-7 text-xs px-2">
              <RefreshCw className="h-3 w-3 mr-1" /> Update
            </Button>
            <button onClick={dismissUpdate} className="opacity-70 hover:opacity-100 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {canInstall && (
        <div className="md:hidden fixed inset-x-4 bottom-20 z-40">
          <div className="glass-card flex items-center justify-between gap-3 rounded-2xl border border-border/60 px-4 py-3 shadow-xl">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Install SplitTrack</p>
              <p className="text-xs text-muted-foreground">Open it like an app from your home screen.</p>
            </div>
            <Button size="sm" className="shrink-0" onClick={installApp}>
              <Download className="mr-2 h-4 w-4" /> Install
            </Button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-50 glass-card border-t-0 border-x-0 rounded-none">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Wallet className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Split<span className="text-gradient">Track</span>
            </span>
          </Link>

          {user && !isLanding && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === to
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}

          <div className="hidden md:flex items-center gap-2">
            {canInstall && (
              <Button
                variant="outline"
                size="sm"
                onClick={installApp}
                className="hidden lg:flex"
              >
                <Download className="h-4 w-4 mr-2" /> Install App
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium max-w-[120px] truncate">
                      {profile?.display_name || profile?.email}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  {canInstall && (
                    <DropdownMenuItem onClick={installApp} className="lg:hidden text-primary focus:text-primary">
                      <Download className="h-4 w-4 mr-2" />
                      Install App
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Log In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          <button
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border/50 p-4 animate-slide-up">
            <div className="flex flex-col gap-2">
              {user && !isLanding &&
                navLinks.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === to
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {label}
                  </Link>
                ))}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/50 mt-2">
                {canInstall && (
                  <Button variant="secondary" className="w-full justify-start" onClick={() => { installApp(); setMobileOpen(false); }}>
                    <Download className="h-4 w-4 mr-2" /> Install App
                  </Button>
                )}
                <div className="flex gap-2 w-full">
                  {user ? (
                    <>
                      <Button variant="ghost" size="sm" className="flex-1" asChild>
                        <Link to="/profile" onClick={() => setMobileOpen(false)}>Profile</Link>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => { handleSignOut(); setMobileOpen(false); }}>
                        Log Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="flex-1" asChild>
                        <Link to="/login" onClick={() => setMobileOpen(false)}>Log In</Link>
                      </Button>
                      <Button size="sm" className="flex-1" asChild>
                        <Link to="/signup" onClick={() => setMobileOpen(false)}>Get Started</Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

export default TopNav;

import { Link, useLocation } from "react-router-dom";
import { Home, Wallet, Users, User, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/friends", label: "Friends", icon: UserPlus },
  { to: "/profile", label: "Profile", icon: User },
];

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const isLanding = location.pathname === "/";

  if (isLanding || !user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-card border-b-0 border-x-0 rounded-none">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

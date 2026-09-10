import { useLocation } from "react-router-dom";
import TopNav from "./TopNav";
import BottomNav from "./BottomNav";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopNav />
      <main className={`flex-1 ${isLanding ? "" : "container py-6 pb-24 md:pb-6"}`} data-mobile="main-content">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;

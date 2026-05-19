import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Zap, FolderOpen, Search } from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/meters", icon: Zap, label: "Meters" },
  { to: "/cases", icon: FolderOpen, label: "Cases" },
  { to: "/analyze", icon: Search, label: "Analyze Feeder" },
];

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 bg-brand-900 text-white flex flex-col">
        <div className="px-5 py-5 border-b border-blue-800">
          <h1 className="text-lg font-bold tracking-wide">MBypass</h1>
          <p className="text-xs text-blue-300 mt-0.5">Theft Detection System</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-brand-600 text-white"
                    : "text-blue-200 hover:bg-blue-800 hover:text-white"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-blue-800 text-xs text-blue-400">
          v1.0.0
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

import { NavLink, useLocation } from "react-router-dom";
import { Home, MessageCircle, Sprout, ListTodo, Landmark } from "lucide-react";
import { useLang } from "@/context/LangContext";

const TABS = [
  { to: "/", icon: Home, key: "home", label: "Home" },
  { to: "/assistant", icon: MessageCircle, key: "assistant", label: "assistant" },
  { to: "/my-farm", icon: Sprout, key: "farm", label: "my_farm" },
  { to: "/tasks", icon: ListTodo, key: "tasks", label: "tasks" },
  { to: "/schemes", icon: Landmark, key: "schemes", label: "schemes" },
];

export function BottomNav() {
  const { t } = useLang();
  const loc = useLocation();
  return (
    <nav
      data-testid="bottom-nav"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-stone-200 shadow-[0_-4px_12px_-1px_rgba(0,0,0,0.06)] z-50 h-20 px-2"
    >
      <div className="grid grid-cols-5 h-full">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(tab.to);
          const label = tab.key === "home" ? "Home" : t(tab.label);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              data-testid={`nav-${tab.key}`}
              className="flex flex-col items-center justify-center gap-1"
            >
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${active ? "bg-green-700 text-white" : "text-stone-400"}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-semibold truncate max-w-full ${active ? "text-green-800" : "text-stone-400"}`}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

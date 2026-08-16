import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { WifiOff, Wheat, ChevronLeft, Settings } from "lucide-react";
import { useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useLang } from "@/context/LangContext";
import { useOnline } from "@/lib/offline";
import { runTaskReminders } from "@/lib/notifications";

export function AppShell() {
  const { t } = useLang();
  const online = useOnline();
  const nav = useNavigate();
  const loc = useLocation();
  const isHome = loc.pathname === "/";

  useEffect(() => {
    runTaskReminders();
  }, [loc.pathname]);

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex justify-center">
      <div className="w-full max-w-md bg-[#F9F8F6] min-h-screen relative shadow-xl">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200 px-4 py-3 flex items-center gap-3">
          {!isHome ? (
            <button
              data-testid="back-btn"
              onClick={() => nav(-1)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-600 active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-green-700 flex items-center justify-center">
              <Wheat className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-stone-900 leading-tight font-[Manrope] truncate">{t("brand")}</p>
            <p className="text-[11px] text-stone-500 truncate">{t("subtitle")}</p>
          </div>
          <LanguagePicker compact />
          <Link to="/settings" data-testid="settings-link" className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-500 shrink-0 active:scale-95 transition-transform">
            <Settings className="w-6 h-6" />
          </Link>
        </header>

        {!online && (
          <div className="bg-stone-800 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium">
            <WifiOff className="w-4 h-4" /> {t("offline")}
          </div>
        )}

        <main className="px-4 py-5 pb-28">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  );
}

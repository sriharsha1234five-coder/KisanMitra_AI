import { useNavigate } from "react-router-dom";
import { Mic, Keyboard, Camera, Sun, Landmark, MapPin, ListTodo, BookOpen, History, Sparkles, Images } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { WeatherCard } from "@/components/WeatherCard";

const HERO_IMG =
  "https://images.unsplash.com/photo-1701781245882-dcbb6ce18c5b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwxfHxmYXJtZXIlMjB1c2luZyUyMHNtYXJ0cGhvbmUlMjBhZ3JpY3VsdHVyZXxlbnwwfHx8fDE3ODY5MTAxOTN8MA&ixlib=rb-4.1.0&q=85";

export default function Home() {
  const { t } = useLang();
  const nav = useNavigate();

  const PRIMARY = [
    { key: "speak", icon: Mic, mode: "speak", color: "bg-green-700", ring: "ring-green-200" },
    { key: "type", icon: Keyboard, mode: "type", color: "bg-emerald-600", ring: "ring-emerald-200" },
    { key: "show", icon: Camera, mode: "show", color: "bg-lime-600", ring: "ring-lime-200" },
  ];

  const SHORTCUTS = [
    { key: "today_plan", icon: Sun, to: "/today" },
    { key: "diary", icon: Images, to: "/diary" },
    { key: "schemes", icon: Landmark, to: "/schemes" },
    { key: "supplies", icon: MapPin, to: "/supplies" },
    { key: "tasks", icon: ListTodo, to: "/tasks" },
    { key: "guide", icon: BookOpen, to: "/guide" },
    { key: "history", icon: History, to: "/history" },
  ];

  return (
    <div className="space-y-6 km-fade-up">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        <img src={HERO_IMG} alt="Farmer" className="w-full h-40 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-green-900/85 to-green-900/20" />
        <div className="absolute bottom-0 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-green-200">{t("tagline")}</p>
          <h1 className="text-2xl font-extrabold font-[Manrope] leading-tight mt-1">{t("home_greeting")}</h1>
        </div>
      </div>

      {/* Weather */}
      <WeatherCard />

      {/* Primary actions */}
      <div className="space-y-3">
        {PRIMARY.map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              data-testid={`home-${a.mode}`}
              onClick={() => nav(`/assess?mode=${a.mode}`)}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl ${a.color} text-white text-left active:scale-[0.98] transition-transform shadow-md shadow-green-900/10`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold font-[Manrope]">{t(a.key)}</p>
                <p className="text-white/80 text-sm">{t(`${a.key}_hint`)}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help me decide / demo */}
      <button
        data-testid="try-demo"
        onClick={() => nav("/assess?mode=demo")}
        className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl border-2 border-amber-300 bg-amber-50 text-amber-800 font-bold active:scale-95 transition-transform"
      >
        <Sparkles className="w-5 h-5" /> {t("try_demo")}
      </button>

      {/* Shortcuts grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 mb-3">What can I do?</h2>
        <div className="grid grid-cols-3 gap-3">
          {SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                data-testid={`shortcut-${s.key}`}
                onClick={() => nav(s.to)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-stone-200 active:scale-95 transition-transform"
              >
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-green-700" />
                </div>
                <span className="text-xs font-semibold text-stone-700 text-center leading-tight">{t(s.key)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

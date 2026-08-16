import { useEffect, useState } from "react";
import { Sprout, Mountain, CloudSun, Droplets, Camera, Brain, CheckCircle2, Loader2 } from "lucide-react";
import { useLang } from "@/context/LangContext";

const AGENTS = [
  { key: "crop", icon: Sprout, label: "Crop Agent" },
  { key: "soil", icon: Mountain, label: "Soil Agent" },
  { key: "weather", icon: CloudSun, label: "Weather Agent" },
  { key: "irrigation", icon: Droplets, label: "Irrigation Agent" },
  { key: "vision", icon: Camera, label: "Vision Agent" },
  { key: "decision", icon: Brain, label: "Decision Agent" },
];

// Sequential agent visualization while the AI request is in flight.
export function AgentSwarm({ hasImage }) {
  const { t } = useLang();
  const agents = AGENTS.filter((a) => a.key !== "vision" || hasImage);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => Math.min(a + 1, agents.length));
    }, 700);
    return () => clearInterval(id);
  }, [agents.length]);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6" data-testid="agent-swarm">
      <h3 className="font-bold text-stone-800 text-lg mb-4 font-[Manrope]">{t("ai_agents")}</h3>
      <div className="grid grid-cols-2 gap-3">
        {agents.map((a, i) => {
          const Icon = a.icon;
          const done = i < active;
          const running = i === active;
          return (
            <div
              key={a.key}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                done ? "border-green-200 bg-green-50" : running ? "border-amber-200 bg-amber-50" : "border-stone-100 bg-stone-50"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${done ? "bg-green-700 text-white" : running ? "bg-amber-400 text-amber-900" : "bg-stone-200 text-stone-400"}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-stone-800 truncate">{a.label}</p>
                <p className="text-xs text-stone-500 flex items-center gap-1">
                  {done ? (
                    <><CheckCircle2 className="w-3 h-3 text-green-600" /> {t("done")}</>
                  ) : running ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> {t("analyzing")}</>
                  ) : (
                    "…"
                  )}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

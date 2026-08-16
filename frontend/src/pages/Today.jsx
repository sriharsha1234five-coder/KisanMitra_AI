import { useState, useEffect } from "react";
import { Sun, Loader2, CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { ListenButton } from "@/components/ListenButton";
import { cacheSet, cacheGet } from "@/lib/offline";
import { getWeatherContext } from "@/components/WeatherCard";
import { useOnline } from "@/lib/offline";
import { toast } from "sonner";

export default function Today() {
  const { lang, t } = useLang();
  const online = useOnline();
  const [plan, setPlan] = useState(cacheGet("daily_plan", null));
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!online) {
      toast.error("Daily plan needs internet. Showing your last saved plan.");
      return;
    }
    setLoading(true);
    try {
      const farms = await api.get("/farms").then((r) => r.data);
      const tasks = await api.get("/tasks").then((r) => r.data.filter((x) => !x.done).map((x) => x.title));
      const { data } = await api.post("/daily-plan", {
        farm: farms[0] || {},
        tasks,
        weather: getWeatherContext(),
        language: lang,
      });
      setPlan(data);
      cacheSet("daily_plan", data);
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!plan && online) generate();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="space-y-5 km-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Sun className="w-7 h-7 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope]">{t("today_plan")}</h1>
          <p className="text-stone-500 text-sm">A simple checklist for today</p>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 flex flex-col items-center gap-3 text-stone-500">
          <Loader2 className="w-8 h-8 animate-spin text-green-700" />
          {t("analyzing")}
        </div>
      )}

      {plan && !loading && (
        <>
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
            {plan.items?.map((item, i) => {
              const done = checked[i];
              return (
                <button
                  key={i}
                  data-testid={`today-item-${i}`}
                  onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
                  className="w-full flex items-center gap-3 text-left"
                >
                  {done ? <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" /> : <Circle className="w-6 h-6 text-stone-300 shrink-0" />}
                  <span className={`font-medium ${done ? "line-through text-stone-400" : "text-stone-800"}`}>{item}</span>
                </button>
              );
            })}
          </div>
          <ListenButton text={plan.summary || (plan.items || []).join(". ")} testId="today-listen" className="w-full justify-center" />
        </>
      )}

      {!plan && !loading && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">
          No plan yet. {online ? "Tap below to generate." : t("offline_msg")}
        </div>
      )}

      <button
        data-testid="regenerate-plan"
        onClick={generate}
        disabled={loading}
        className="w-full h-14 rounded-2xl border-2 border-green-700 text-green-800 font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-5 h-5" /> {plan ? "Regenerate Plan" : "Generate Today's Plan"}
      </button>
    </div>
  );
}

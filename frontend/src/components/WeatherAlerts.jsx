import { CloudRain, Thermometer, Wind as WindIcon, AlertTriangle } from "lucide-react";
import { useLang } from "@/context/LangContext";

const CONFIG = {
  heavy_rain: { icon: CloudRain, titleKey: "heavy_rain_title", adviceKey: "heavy_rain_advice" },
  rain_now: { icon: CloudRain, titleKey: "rain_now_title", adviceKey: "rain_now_advice" },
  heat: { icon: Thermometer, titleKey: "heat_title", adviceKey: "heat_advice" },
  wind: { icon: WindIcon, titleKey: "wind_title", adviceKey: "wind_advice" },
};

// Builds a short spoken/notification title for an alert.
export function alertTitle(a, t, forecast) {
  const cfg = CONFIG[a.type];
  return cfg ? t(cfg.titleKey) : t("alerts_title");
}

export function WeatherAlerts({ alerts, forecast }) {
  const { t } = useLang();
  if (!alerts?.length) return null;

  const whenLabel = (idx) => {
    if (idx === 0) return t("alert_when_today");
    const f = forecast?.[idx];
    return f ? new Date(f.date).toLocaleDateString(undefined, { weekday: "long" }) : "";
  };

  return (
    <div className="space-y-3" data-testid="weather-alerts">
      <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" /> {t("alerts_title")}
      </h2>
      {alerts.map((a, i) => {
        const cfg = CONFIG[a.type] || CONFIG.heavy_rain;
        const Icon = cfg.icon;
        const warn = a.severity === "warning";
        return (
          <div
            key={i}
            data-testid={`alert-${a.type}-${a.severity}`}
            className={`rounded-2xl border-2 p-4 flex gap-3 ${warn ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${warn ? "bg-red-600 text-white" : "bg-amber-400 text-amber-900"}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${warn ? "bg-red-600 text-white" : "bg-amber-400 text-amber-900"}`}>
                  {warn ? t("alert_warning") : t("alert_watch")}
                </span>
                <span className="text-xs font-semibold text-stone-500">{whenLabel(a.day_index)}</span>
              </div>
              <p className={`font-bold mt-1 ${warn ? "text-red-800" : "text-amber-800"}`}>{t(cfg.titleKey)}</p>
              <p className="text-sm text-stone-700 font-medium mt-0.5 leading-relaxed">{t(cfg.adviceKey)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

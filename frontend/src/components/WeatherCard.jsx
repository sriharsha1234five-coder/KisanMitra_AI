import { useState, useEffect } from "react";
import { CloudSun, Droplets, Wind, Navigation, Loader2, CloudOff } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { cacheSet, cacheGet } from "@/lib/offline";
import { useOnline } from "@/lib/offline";
import { WeatherAlerts, alertTitle } from "@/components/WeatherAlerts";
import { runWeatherAlertNotifications } from "@/lib/notifications";

// Compact weather card. Auto-uses saved coords; offers "use my location".
export function WeatherCard() {
  const { t } = useLang();
  const online = useOnline();
  const [data, setData] = useState(cacheGet("weather", null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchByCoords = async (lat, lon) => {
    setLoading(true);
    setError(false);
    try {
      const { data } = await api.get("/weather", { params: { lat, lon } });
      setData(data);
      cacheSet("weather", data);
      runWeatherAlertNotifications(data.alerts, (a) => alertTitle(a, t, data.forecast));
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const useLocation = () => {
    if (!navigator.geolocation) { setError(true); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        localStorage.setItem("km_coords", JSON.stringify(coords));
        fetchByCoords(coords.lat, coords.lon);
      },
      () => { setLoading(false); setError(true); }
    );
  };

  useEffect(() => {
    const saved = localStorage.getItem("km_coords");
    if (saved && online) {
      const c = JSON.parse(saved);
      fetchByCoords(c.lat, c.lon);
    }
    // eslint-disable-next-line
  }, []);

  if (!data && !loading) {
    return (
      <button
        data-testid="weather-enable"
        onClick={useLocation}
        className="w-full flex items-center justify-between gap-3 p-4 rounded-2xl bg-sky-50 border border-sky-100 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-sky-100 flex items-center justify-center">
            {error ? <CloudOff className="w-6 h-6 text-sky-600" /> : <CloudSun className="w-6 h-6 text-sky-600" />}
          </div>
          <div className="text-left">
            <p className="font-bold text-sky-900">{t("weather")}</p>
            <p className="text-xs text-sky-700">{error ? t("weather_unavailable") : t("enable_location")}</p>
          </div>
        </div>
        <Navigation className="w-5 h-5 text-sky-600" />
      </button>
    );
  }

  if (loading && !data) {
    return (
      <div className="w-full flex items-center gap-3 p-4 rounded-2xl bg-sky-50 border border-sky-100 text-sky-700">
        <Loader2 className="w-5 h-5 animate-spin" /> {t("weather")}...
      </div>
    );
  }

  const c = data.current;
  return (
    <div className="space-y-3">
    <div data-testid="weather-card" className="rounded-2xl bg-gradient-to-br from-sky-600 to-sky-500 text-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sky-100 text-xs font-bold uppercase tracking-wider">{data.place || t("weather")}</p>
          <p className="text-4xl font-extrabold font-[Manrope] mt-1">{Math.round(c.temp)}°C</p>
          <p className="text-sky-50 font-medium">{c.condition}</p>
        </div>
        <CloudSun className="w-14 h-14 text-white/80" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="bg-white/15 rounded-xl p-2 text-center">
          <Droplets className="w-4 h-4 mx-auto mb-1" />
          <p className="text-xs text-sky-100">{t("humidity")}</p>
          <p className="font-bold text-sm">{c.humidity}%</p>
        </div>
        <div className="bg-white/15 rounded-xl p-2 text-center">
          <CloudSun className="w-4 h-4 mx-auto mb-1" />
          <p className="text-xs text-sky-100">{t("rain")}</p>
          <p className="font-bold text-sm">{c.precipitation} mm</p>
        </div>
        <div className="bg-white/15 rounded-xl p-2 text-center">
          <Wind className="w-4 h-4 mx-auto mb-1" />
          <p className="text-xs text-sky-100">{t("wind")}</p>
          <p className="font-bold text-sm">{Math.round(c.wind)}</p>
        </div>
      </div>
      {data.forecast?.length > 0 && (
        <div className="flex justify-between mt-4 pt-3 border-t border-white/20">
          {data.forecast.map((f, i) => (
            <div key={i} className="text-center">
              <p className="text-xs text-sky-100">{i === 0 ? "Today" : new Date(f.date).toLocaleDateString(undefined, { weekday: "short" })}</p>
              <p className="font-bold text-sm mt-1">{Math.round(f.max)}°</p>
              <p className="text-xs text-sky-100">{f.rain_prob != null ? `${f.rain_prob}%` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
    <WeatherAlerts alerts={data.alerts} forecast={data.forecast} />
    </div>
  );
}

// Returns a short weather context string for AI prompts, if available.
export function getWeatherContext() {
  const data = cacheGet("weather", null);
  if (!data?.current) return "";
  const c = data.current;
  let ctx = `${c.condition}, ${Math.round(c.temp)}°C, humidity ${c.humidity}%, recent rain ${c.precipitation}mm`;
  if (data.alerts?.length) {
    ctx += ". Upcoming alerts: " + data.alerts.map((a) => `${a.type} (${a.severity})`).join(", ");
  }
  return ctx;
}

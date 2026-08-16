import { useState } from "react";
import { MapPin, Search, ExternalLink, Navigation, Info, Loader2 } from "lucide-react";
import { useLang } from "@/context/LangContext";
import { toast } from "sonner";

const CATEGORIES = [
  "Seeds & nursery",
  "Fertilizers",
  "Pesticides / crop protection",
  "Farm equipment",
  "Irrigation supplies",
  "Veterinary / dairy",
];

export default function Supplies() {
  const { t } = useLang();
  const [place, setPlace] = useState("");
  const [locating, setLocating] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { toast.error("Location is not available on this device. Enter a town instead."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlace(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`);
        setLocating(false);
        toast.success("Using your current location");
      },
      () => { setLocating(false); toast.error("Location access is unavailable. Enter a town or city manually."); }
    );
  };

  const search = () => {
    const where = place.trim() || "near me";
    const query = encodeURIComponent(`agricultural input suppliers ${category} ${where}`);
    window.open(`https://www.google.com/maps/search/${query}`, "_blank", "noopener");
  };

  return (
    <div className="space-y-5 km-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><MapPin className="w-7 h-7 text-green-700" /></div>
        <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope]">{t("supplies")}</h1>
      </div>

      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 flex gap-2">
        <Info className="w-5 h-5 text-blue-600 shrink-0" />
        <p className="text-blue-900 text-sm font-medium">We help you find nearby agricultural-input suppliers using maps. Always verify the shop name, opening hours, contact and prices directly with the shop.</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Location</p>
          <div className="flex gap-2">
            <input data-testid="supplies-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Enter town / district" className="flex-1 h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium" />
            <button data-testid="use-location" onClick={useMyLocation} className="w-14 h-14 rounded-xl bg-green-50 text-green-700 flex items-center justify-center border-2 border-green-100">
              {locating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">What do you need?</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} data-testid={`supply-cat-${c}`} onClick={() => setCategory(c)} className={`px-3 h-10 rounded-full font-semibold text-sm border-2 ${category === c ? "border-green-700 bg-green-700 text-white" : "border-stone-200 text-stone-600"}`}>{c}</button>
            ))}
          </div>
        </div>

        <button data-testid="search-supplies" onClick={search} className="w-full h-14 rounded-xl bg-green-700 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <Search className="w-5 h-5" /> Find nearby suppliers
          <ExternalLink className="w-4 h-4 opacity-80" />
        </button>
      </div>

      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Price information</p>
        <p className="text-amber-900 text-sm font-medium">We do not show live prices to avoid outdated information. Price unavailable — contact the shop for the current price.</p>
      </div>
    </div>
  );
}

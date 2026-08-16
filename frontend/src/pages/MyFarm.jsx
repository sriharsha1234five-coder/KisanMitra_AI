import { useState, useEffect } from "react";
import { Sprout, Plus, Trash2, Loader2, X } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { cacheSet, cacheGet } from "@/lib/offline";
import { useOnline } from "@/lib/offline";
import { toast } from "sonner";

const FIELDS = [
  ["name", "Farm name (e.g. Rice Field)"],
  ["crop", "Crop"],
  ["variety", "Variety (optional)"],
  ["growth_stage", "Growth stage"],
  ["soil_type", "Soil type"],
  ["irrigation", "Irrigation method"],
  ["location", "Location"],
];

export default function MyFarm() {
  const { t } = useLang();
  const online = useOnline();
  const [farms, setFarms] = useState(cacheGet("farms", []));
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/farms");
      setFarms(data);
      cacheSet("farms", data);
    } catch (e) {
      if (online) toast.error(errText(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    if (!form.name && !form.crop) { toast.error("Add a farm name or crop."); return; }
    setSaving(true);
    try {
      await api.post("/farms", form);
      setShowForm(false);
      setForm({});
      load();
      toast.success("Farm saved");
    } catch (e) { toast.error(errText(e)); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await api.delete(`/farms/${id}`); setFarms((f) => f.filter((x) => x.id !== id)); } catch (e) { toast.error(errText(e)); }
  };

  return (
    <div className="space-y-5 km-fade-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <Sprout className="w-7 h-7 text-green-700" />
          </div>
          <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope]">{t("my_farm")}</h1>
        </div>
      </div>

      {loading && farms.length === 0 && (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-green-700" /></div>
      )}

      {!loading && farms.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">
          No farms yet. Add your first farm to get personalized advice.
        </div>
      )}

      <div className="space-y-3">
        {farms.map((f) => (
          <div key={f.id} data-testid={`farm-${f.id}`} className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-stone-900 font-[Manrope]">{f.name || f.crop}</h3>
              <button data-testid={`delete-farm-${f.id}`} onClick={() => remove(f.id)} className="text-stone-400"><Trash2 className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {[["Crop", f.crop], ["Stage", f.growth_stage], ["Soil", f.soil_type], ["Irrigation", f.irrigation], ["Location", f.location]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="bg-stone-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{k}</p>
                  <p className="text-stone-800 font-semibold text-sm">{v}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        data-testid="add-farm-btn"
        onClick={() => setShowForm(true)}
        className="w-full h-14 rounded-2xl bg-green-700 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
      >
        <Plus className="w-5 h-5" /> {t("add_farm")}
      </button>

      {showForm && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-[Manrope]">{t("add_farm")}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-6 h-6 text-stone-500" /></button>
            </div>
            {FIELDS.map(([k, ph]) => (
              <input
                key={k}
                data-testid={`farm-field-${k}`}
                value={form[k] || ""}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                placeholder={ph}
                className="w-full h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium"
              />
            ))}
            <button data-testid="save-farm" onClick={save} disabled={saving} className="w-full h-14 rounded-xl bg-green-700 text-white font-semibold flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-5 h-5 animate-spin" />} Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { History as HistoryIcon, Trash2, Loader2, X, WifiOff } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { AssessmentCard } from "@/components/AssessmentCard";
import { cacheSet, cacheGet } from "@/lib/offline";
import { useOnline } from "@/lib/offline";
import { toast } from "sonner";

function statusDot(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("urgent")) return "bg-red-500";
  if (s.includes("good")) return "bg-green-500";
  return "bg-amber-500";
}

export default function History() {
  const { t } = useLang();
  const online = useOnline();
  const [items, setItems] = useState(cacheGet("history", []));
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const { data } = await api.get("/history");
      setItems(data);
      cacheSet("history", data);
    } catch (e) { if (online) toast.error(errText(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const remove = async (id) => {
    setItems((x) => x.filter((i) => i.id !== id));
    try { await api.delete(`/history/${id}`); } catch (e) {}
  };

  return (
    <div className="space-y-5 km-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><HistoryIcon className="w-7 h-7 text-green-700" /></div>
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope]">{t("history")}</h1>
          {!online && <p className="text-xs text-stone-500 flex items-center gap-1"><WifiOff className="w-3 h-3" /> Showing saved advice</p>}
        </div>
      </div>

      {loading && items.length === 0 && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-green-700" /></div>}
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">No past assessments yet. Analyze your farm to build your history.</div>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
            <button data-testid={`history-${it.id}`} onClick={() => setSelected(it)} className="flex-1 text-left flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${statusDot(it.result?.overall_status)}`} />
              <div className="min-w-0">
                <p className="font-bold text-stone-900 truncate">{it.inputs?.crop || it.result?.primary_concern || "Assessment"}</p>
                <p className="text-sm text-stone-500 truncate">{it.result?.overall_status} · {new Date(it.created_at).toLocaleDateString()}</p>
              </div>
            </button>
            <button data-testid={`delete-history-${it.id}`} onClick={() => remove(it.id)} className="text-stone-400"><Trash2 className="w-5 h-5" /></button>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-[#F9F8F6] rounded-t-3xl p-5 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-[Manrope]">Assessment</h2>
              <button onClick={() => setSelected(null)}><X className="w-6 h-6 text-stone-500" /></button>
            </div>
            <AssessmentCard r={selected.result} />
          </div>
        </div>
      )}
    </div>
  );
}

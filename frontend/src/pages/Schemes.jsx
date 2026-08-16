import { useState, useEffect } from "react";
import { Landmark, Search, Sparkles, ExternalLink, Bell, X, Loader2, ShieldCheck, ChevronRight } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { ListenButton } from "@/components/ListenButton";
import { cacheSet, cacheGet } from "@/lib/offline";
import { toast } from "sonner";

const MATCH_COLOR = { High: "bg-green-100 text-green-800", Medium: "bg-amber-100 text-amber-800", Low: "bg-stone-100 text-stone-600" };

export default function Schemes() {
  const { lang, t } = useLang();
  const [schemes, setSchemes] = useState(cacheGet("schemes", []));
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState(null);
  const [showMatch, setShowMatch] = useState(false);
  const [profile, setProfile] = useState({ state: "", crop: "", category: "", irrigation: "" });
  const [matches, setMatches] = useState(null);
  const [matching, setMatching] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/schemes", { params: { q: q || undefined, category: cat } });
      setSchemes(data.schemes);
      setCategories(data.categories);
      cacheSet("schemes", data.schemes);
    } catch (e) { /* offline: use cache */ }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, cat]);

  const runMatch = async () => {
    setMatching(true);
    try {
      const { data } = await api.post("/schemes/match", { ...profile, language: lang });
      setMatches(data.matches);
    } catch (e) { toast.error(errText(e)); } finally { setMatching(false); }
  };

  const remind = async (scheme) => {
    try {
      await api.post("/tasks", { title: `Apply / check: ${scheme.name}`, priority: "High", source: "scheme" });
      toast.success("Reminder saved to your tasks");
    } catch (e) { toast.error(errText(e)); }
  };

  return (
    <div className="space-y-5 km-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><Landmark className="w-7 h-7 text-green-700" /></div>
        <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope]">{t("schemes")}</h1>
      </div>

      <button data-testid="find-schemes-btn" onClick={() => { setShowMatch(true); setMatches(null); }} className="w-full h-14 rounded-2xl bg-amber-400 text-amber-900 font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform">
        <Sparkles className="w-5 h-5" /> {t("find_schemes")}
      </button>

      <div className="relative">
        <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input data-testid="scheme-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_schemes")} className="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {["all", ...categories].map((c) => (
          <button key={c} data-testid={`cat-${c}`} onClick={() => setCat(c)} className={`shrink-0 px-4 h-10 rounded-full font-semibold text-sm border-2 ${cat === c ? "border-green-700 bg-green-700 text-white" : "border-stone-200 text-stone-600 bg-white"}`}>{c === "all" ? "All" : c}</button>
        ))}
      </div>

      <div className="space-y-3">
        {schemes.map((s) => (
          <button key={s.id} data-testid={`scheme-${s.id}`} onClick={() => setSelected(s)} className="w-full text-left bg-white rounded-2xl border border-stone-200 p-5 active:scale-[0.99] transition-transform">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-700">{s.category}</span>
              <ChevronRight className="w-5 h-5 text-stone-300" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 font-[Manrope] mt-2 leading-tight">{s.name}</h3>
            <p className="text-stone-600 text-sm mt-1 line-clamp-2">{s.what}</p>
          </button>
        ))}
        {schemes.length === 0 && <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">No schemes found. Try another search.</div>}
      </div>

      {/* Scheme detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-700">{selected.category}</span>
                <h2 className="text-xl font-extrabold text-stone-900 font-[Manrope] mt-2 leading-tight">{selected.name}</h2>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-6 h-6 text-stone-500" /></button>
            </div>

            <ListenButton
              text={`${selected.name}. ${selected.what}. Who may be eligible: ${selected.eligibility}. Benefit: ${selected.benefit}. Always verify on the official source.`}
              testId="scheme-listen"
            />

            <div className="space-y-4 mt-4">
              {[["What is it?", selected.what], ["Who may be eligible?", selected.eligibility], ["What benefit?", selected.benefit], ["Application method", selected.how_to_apply]].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-400">{label}</p>
                  <p className="text-stone-800 font-medium mt-1">{val}</p>
                </div>
              ))}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Required documents</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selected.documents.map((d) => <span key={d} className="px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-sm font-medium">{d}</span>)}
                </div>
              </div>

              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 flex gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-amber-900 text-sm font-medium">Scheme rules, benefits and deadlines can change. Always verify current information on the official government source before applying.</p>
              </div>

              <a data-testid="scheme-source" href={selected.official_source} target="_blank" rel="noopener noreferrer" className="w-full h-14 rounded-xl bg-green-700 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <ExternalLink className="w-5 h-5" /> {t("official_source")}
              </a>
              <button data-testid="scheme-remind" onClick={() => remind(selected)} className="w-full h-14 rounded-xl border-2 border-green-700 text-green-800 font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
                <Bell className="w-5 h-5" /> {t("remind_me")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI match sheet */}
      {showMatch && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={() => setShowMatch(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-[Manrope]">{t("find_schemes")}</h2>
              <button onClick={() => setShowMatch(false)}><X className="w-6 h-6 text-stone-500" /></button>
            </div>
            {!matches && (
              <>
                {[["state", "State (e.g. Tamil Nadu)"], ["crop", "Main crop"], ["category", "Farmer category (e.g. small/marginal)"], ["irrigation", "Irrigation type"]].map(([k, ph]) => (
                  <input key={k} data-testid={`match-${k}`} value={profile[k]} onChange={(e) => setProfile((p) => ({ ...p, [k]: e.target.value }))} placeholder={ph} className="w-full h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium" />
                ))}
                <button data-testid="run-match" onClick={runMatch} disabled={matching} className="w-full h-14 rounded-xl bg-green-700 text-white font-semibold flex items-center justify-center gap-2">
                  {matching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Find schemes for me
                </button>
              </>
            )}
            {matches && (
              <div className="space-y-3">
                <p className="text-sm text-stone-500 font-medium">Potentially relevant schemes. You may be eligible based on the info provided — verify current eligibility on the official source.</p>
                {matches.map((m) => (
                  <div key={m.id} data-testid={`match-result-${m.id}`} className="bg-white rounded-2xl border border-stone-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${MATCH_COLOR[m.match] || MATCH_COLOR.Low}`}>Match: {m.match}</span>
                    </div>
                    <h3 className="font-bold text-stone-900 mt-2">{m.name}</h3>
                    <p className="text-stone-600 text-sm mt-1">{m.reason}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => { setShowMatch(false); setSelected(m); }} className="flex-1 h-11 rounded-xl border-2 border-green-700 text-green-800 font-semibold text-sm">View details</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setMatches(null)} className="w-full h-12 rounded-xl bg-stone-100 text-stone-600 font-semibold">Edit profile</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

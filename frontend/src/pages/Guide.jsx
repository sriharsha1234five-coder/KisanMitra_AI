import { useState, useEffect } from "react";
import { BookOpen, ChevronDown, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { ListenButton } from "@/components/ListenButton";
import { cacheSet, cacheGet } from "@/lib/offline";

export default function Guide() {
  const { t } = useLang();
  const [articles, setArticles] = useState(cacheGet("guide", []));
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(articles.length === 0);

  useEffect(() => {
    api.get("/guide").then(({ data }) => {
      setArticles(data.articles);
      cacheSet("guide", data.articles);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 km-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><BookOpen className="w-7 h-7 text-green-700" /></div>
        <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope]">{t("guide")}</h1>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-green-700" /></div>}

      <div className="space-y-3">
        {articles.map((a) => {
          const isOpen = open === a.id;
          return (
            <div key={a.id} data-testid={`guide-${a.id}`} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : a.id)} className="w-full flex items-center justify-between gap-2 p-5 text-left">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">{a.category}</p>
                  <h3 className="font-bold text-stone-900 font-[Manrope] mt-1">{a.title}</h3>
                </div>
                <ChevronDown className={`w-5 h-5 text-stone-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-5">
                  <p className="text-stone-700 font-medium leading-relaxed">{a.body}</p>
                  <div className="mt-4"><ListenButton text={`${a.title}. ${a.body}`} testId={`guide-listen-${a.id}`} /></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

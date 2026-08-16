import { useState, useEffect, useRef } from "react";
import { Camera, Plus, Trash2, Loader2, X, CalendarDays } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { DiaryImage } from "@/components/DiaryImage";
import { toast } from "sonner";

function groupByDate(items) {
  const groups = {};
  items.forEach((it) => {
    const d = new Date(it.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    (groups[d] = groups[d] || []).push(it);
  });
  return groups;
}

export default function Diary() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState("");
  const [crop, setCrop] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewer, setViewer] = useState(null);
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await api.get("/diary");
      setItems(data);
    } catch (e) { toast.error(errText(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setShowForm(true);
  };

  const save = async () => {
    if (!file) return;
    setSaving(true);
    const form = new FormData();
    form.append("file", file);
    form.append("note", note);
    form.append("crop", crop);
    try {
      await api.post("/diary", form, { headers: { "Content-Type": "multipart/form-data" } });
      setShowForm(false); setFile(null); setPreview(null); setNote(""); setCrop("");
      load();
      toast.success("Photo saved to diary");
    } catch (e) { toast.error(errText(e)); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    setItems((x) => x.filter((i) => i.id !== id));
    try { await api.delete(`/diary/${id}`); } catch (e) {}
  };

  const groups = groupByDate(items);

  return (
    <div className="space-y-5 km-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><Camera className="w-7 h-7 text-green-700" /></div>
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope]">{t("diary")}</h1>
          <p className="text-stone-500 text-sm">Watch a problem spread or heal over time</p>
        </div>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-green-700" /></div>}
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">No photos yet. Add a dated photo to start your crop timeline.</div>
      )}

      <div className="space-y-6">
        {Object.entries(groups).map(([date, list]) => (
          <div key={date}>
            <div className="flex items-center gap-2 text-stone-500 mb-3">
              <CalendarDays className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{date}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {list.map((it) => (
                <div key={it.id} data-testid={`diary-${it.id}`} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                  <button onClick={() => setViewer(it)} className="block w-full">
                    <DiaryImage id={it.id} className="w-full h-32" />
                  </button>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      {it.crop && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">{it.crop}</span>}
                      <button data-testid={`delete-diary-${it.id}`} onClick={() => remove(it.id)} className="text-stone-400 ml-auto"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    {it.note && <p className="text-sm text-stone-700 mt-1 line-clamp-2">{it.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" data-testid="diary-file" />
      <button data-testid="add-photo-btn" onClick={() => fileRef.current?.click()} className="w-full h-14 rounded-2xl bg-green-700 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
        <Plus className="w-5 h-5" /> {t("add_photo")}
      </button>

      {/* Add form */}
      {showForm && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-[Manrope]">{t("add_photo")}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-6 h-6 text-stone-500" /></button>
            </div>
            {preview && <img src={preview} alt="preview" className="w-full h-52 object-cover rounded-2xl" />}
            <input data-testid="diary-crop" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="Crop (e.g. Rice)" className="w-full h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium" />
            <textarea data-testid="diary-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("photo_note")} rows={2} className="w-full p-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium resize-none" />
            <button data-testid="save-diary" onClick={save} disabled={saving} className="w-full h-14 rounded-xl bg-green-700 text-white font-semibold flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-5 h-5 animate-spin" />} Save
            </button>
          </div>
        </div>
      )}

      {/* Viewer */}
      {viewer && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setViewer(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="w-7 h-7" /></button>
          <DiaryImage id={viewer.id} className="max-w-full max-h-[70vh] rounded-2xl" />
          {viewer.note && <p className="text-white mt-4 text-center font-medium">{viewer.note}</p>}
        </div>
      )}
    </div>
  );
}

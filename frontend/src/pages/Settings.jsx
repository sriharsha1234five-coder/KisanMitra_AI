import { useState } from "react";
import { Settings as SettingsIcon, LogOut, Trash2, ShieldCheck, Info, Loader2 } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { LanguagePicker } from "@/components/LanguagePicker";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const [deleting, setDeleting] = useState(false);

  const deleteData = async () => {
    if (!window.confirm("Delete all your saved farms, tasks, history and chats? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await api.delete("/account/data");
      ["history", "farms", "tasks", "daily_plan"].forEach((k) => localStorage.removeItem(`km_cache_${k}`));
      toast.success("Your saved data was deleted");
    } catch (e) { toast.error(errText(e)); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-5 km-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><SettingsIcon className="w-7 h-7 text-green-700" /></div>
        <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope]">{t("settings")}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Account</p>
        <p className="font-bold text-stone-900 mt-1">{user?.name}</p>
        <p className="text-stone-500 text-sm">{user?.email}</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-400">Language</p>
        <LanguagePicker />
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-2">
        <div className="flex items-center gap-2"><Info className="w-5 h-5 text-green-700" /><p className="font-bold text-stone-800">About AI Assistance</p></div>
        <p className="text-stone-600 text-sm leading-relaxed">KisanMitra AI provides AI-assisted farming information and decision support. AI results may be incomplete or incorrect. Important agricultural decisions should be verified with qualified agricultural professionals or trusted official guidance.</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-2">
        <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-700" /><p className="font-bold text-stone-800">Privacy</p></div>
        <p className="text-stone-600 text-sm leading-relaxed">We only ask for what is needed. Location, microphone and camera are used only when you choose. You can delete your saved data anytime.</p>
        <button data-testid="delete-data" onClick={deleteData} disabled={deleting} className="w-full h-12 mt-2 rounded-xl border-2 border-red-200 text-red-600 font-semibold flex items-center justify-center gap-2">
          {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />} Delete my saved data
        </button>
      </div>

      <button data-testid="logout-btn" onClick={logout} className="w-full h-14 rounded-2xl bg-stone-800 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
        <LogOut className="w-5 h-5" /> {t("logout")}
      </button>
    </div>
  );
}

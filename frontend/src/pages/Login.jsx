import { useState } from "react";
import { Wheat, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { LanguagePicker } from "@/components/LanguagePicker";
import { errText } from "@/lib/api";
import { toast } from "sonner";

export default function Login() {
  const { login, register } = useAuth();
  const { t } = useLang();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setLoading(false);
    }
  };

  const field = (k) => ({
    value: form[k],
    onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <div className="min-h-screen bg-[#F9F8F6] flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-white shadow-xl flex flex-col">
        <div className="bg-green-700 px-6 pt-12 pb-16 text-white relative">
          <div className="flex justify-end mb-6">
            <div className="bg-white/10 rounded-xl p-1">
              <LanguagePicker compact />
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            <Wheat className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-extrabold font-[Manrope] leading-tight">{t("brand")}</h1>
          <p className="text-green-50 mt-1 font-medium">{t("subtitle")}</p>
          <p className="text-green-100/90 text-sm mt-3">{t("tagline")}</p>
        </div>

        <form onSubmit={submit} className="px-6 -mt-8 flex-1">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
            <div className="flex gap-2 bg-stone-100 rounded-xl p-1">
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`tab-${m}`}
                  onClick={() => setMode(m)}
                  className={`flex-1 h-11 rounded-lg font-semibold transition-colors ${mode === m ? "bg-green-700 text-white" : "text-stone-500"}`}
                >
                  {m === "login" ? t("login") : t("register")}
                </button>
              ))}
            </div>

            {mode === "register" && (
              <input
                data-testid="name-input"
                {...field("name")}
                placeholder={t("name")}
                required
                className="w-full h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium"
              />
            )}
            <input
              data-testid="email-input"
              type="email"
              {...field("email")}
              placeholder={t("email")}
              required
              className="w-full h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium"
            />
            <input
              data-testid="password-input"
              type="password"
              {...field("password")}
              placeholder={t("password")}
              required
              className="w-full h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium"
            />
            <button
              data-testid="auth-submit"
              disabled={loading}
              className="w-full h-14 rounded-xl bg-green-700 hover:bg-green-800 text-white text-lg font-semibold active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {mode === "login" ? t("login") : t("register")}
            </button>
          </div>
          <p className="text-center text-stone-400 text-xs mt-6 px-4 leading-relaxed">
            KisanMitra AI provides AI-assisted farming information. Verify important decisions with qualified agricultural professionals.
          </p>
        </form>
      </div>
    </div>
  );
}

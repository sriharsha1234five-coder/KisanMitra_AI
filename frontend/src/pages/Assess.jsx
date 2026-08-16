import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Camera, X, Loader2, Sparkles, ChevronDown, ScanSearch } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { VoiceButton } from "@/components/VoiceButton";
import { AgentSwarm } from "@/components/AgentSwarm";
import { AssessmentCard } from "@/components/AssessmentCard";
import { cacheSet, cacheGet } from "@/lib/offline";
import { getWeatherContext } from "@/components/WeatherCard";
import { toast } from "sonner";

const DEMO = {
  crop: "Rice",
  growth_stage: "Vegetative",
  soil_type: "Loamy",
  irrigation: "Flood irrigation",
  weather: "Recent rainfall",
  problem: "My rice plants have yellowing leaves in patches.",
};

const DETAIL_FIELDS = [
  ["crop", "Crop (e.g. Rice, Tomato)"],
  ["variety", "Variety (optional)"],
  ["growth_stage", "Growth stage"],
  ["soil_type", "Soil type"],
  ["irrigation", "Irrigation method"],
  ["location", "Location (village/district)"],
  ["weather", "Weather now (optional)"],
];

export default function Assess() {
  const { lang, t } = useLang();
  const [params] = useSearchParams();
  const mode = params.get("mode");
  const fileRef = useRef(null);

  const [form, setForm] = useState({});
  const [problem, setProblem] = useState("");
  const [image, setImage] = useState(null); // base64
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (mode === "demo") {
      setForm(DEMO);
      setProblem(DEMO.problem);
      setShowDetails(true);
    }
    if (mode === "show") setTimeout(() => fileRef.current?.click(), 300);
  }, [mode]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!problem.trim() && !image && !form.crop) {
      toast.error("Please describe the problem, add details, or a photo.");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/assess", {
        ...form,
        weather: form.weather || getWeatherContext(),
        problem,
        image_base64: image,
        language: lang,
      });
      setResult(data.result);
      const saved = cacheGet("history", []);
      cacheSet("history", [data, ...saved].slice(0, 30));
    } catch (e) {
      toast.error(errText(e, "AI analysis is unavailable right now."));
    } finally {
      setLoading(false);
    }
  };

  const saveTask = async (title) => {
    try {
      await api.post("/tasks", { title, priority: "High", source: "assessment" });
      toast.success("Saved to your tasks");
    } catch (e) {
      toast.error(errText(e));
    }
  };

  return (
    <div className="space-y-5 km-fade-up">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope] flex items-center gap-2">
          <ScanSearch className="w-7 h-7 text-green-700" /> {t("analyze")}
        </h1>
        <p className="text-stone-500 text-sm mt-1">{t("home_greeting")}</p>
      </div>

      {!result && (
        <>
          {/* Speak */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 flex flex-col items-center gap-4">
            <VoiceButton big onResult={(txt) => setProblem((p) => (p ? p + " " + txt : txt))} />
          </div>

          {/* Type */}
          <textarea
            data-testid="problem-input"
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder={t("type_placeholder")}
            rows={3}
            className="w-full p-4 rounded-2xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium resize-none"
          />

          {/* Image */}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" data-testid="image-input" />
          {image ? (
            <div className="relative rounded-2xl overflow-hidden border border-stone-200">
              <img src={image} alt="crop" className="w-full h-52 object-cover" />
              <button
                data-testid="remove-image"
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              data-testid="add-image"
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl border-2 border-dashed border-stone-300 text-stone-600 font-semibold active:scale-95 transition-transform"
            >
              <Camera className="w-5 h-5" /> {t("show")}
            </button>
          )}

          {/* Optional details */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <button
              data-testid="details-toggle"
              onClick={() => setShowDetails((v) => !v)}
              className="w-full flex items-center justify-between p-4 font-semibold text-stone-700"
            >
              Add farm details (optional)
              <ChevronDown className={`w-5 h-5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
            </button>
            {showDetails && (
              <div className="px-4 pb-4 space-y-3">
                {DETAIL_FIELDS.map(([k, ph]) => (
                  <input
                    key={k}
                    data-testid={`field-${k}`}
                    value={form[k] || ""}
                    onChange={(e) => setField(k, e.target.value)}
                    placeholder={ph}
                    className="w-full h-12 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium"
                  />
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <AgentSwarm hasImage={!!image} />
          ) : (
            <button
              data-testid="analyze-btn"
              onClick={analyze}
              className="w-full h-16 rounded-2xl bg-green-700 hover:bg-green-800 text-white text-lg font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <Sparkles className="w-6 h-6" /> {t("analyze")}
            </button>
          )}
        </>
      )}

      {result && (
        <>
          <AssessmentCard r={result} onSaveTask={saveTask} />
          <button
            data-testid="new-assessment"
            onClick={() => {
              setResult(null);
              setProblem("");
              setImage(null);
              setForm({});
            }}
            className="w-full h-14 rounded-2xl border-2 border-green-700 text-green-800 font-semibold active:scale-95 transition-transform"
          >
            New Assessment
          </button>
        </>
      )}
    </div>
  );
}

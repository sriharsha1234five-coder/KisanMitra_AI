import { Volume2, Square, Loader2 } from "lucide-react";
import { useState } from "react";
import { speak, stopSpeaking } from "@/lib/voice";
import { useLang } from "@/context/LangContext";

export function ListenButton({ text, className = "", testId = "listen-btn" }) {
  const { t } = useLang();
  const [state, setState] = useState("idle"); // idle | loading | playing

  const onClick = async () => {
    if (state === "playing" || state === "loading") {
      stopSpeaking();
      setState("idle");
      return;
    }
    setState("loading");
    await speak(text, {
      onStart: () => setState("playing"),
      onEnd: () => setState("idle"),
    });
  };

  return (
    <button
      data-testid={testId}
      onClick={onClick}
      className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl border-2 border-green-700 text-green-800 font-semibold bg-green-50 active:scale-95 transition-transform ${className}`}
    >
      {state === "loading" ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : state === "playing" ? (
        <Square className="w-5 h-5" />
      ) : (
        <Volume2 className="w-5 h-5" />
      )}
      <span>{state === "playing" ? t("stop") : t("listen")}</span>
    </button>
  );
}

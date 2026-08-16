import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { createRecorder, transcribe } from "@/lib/voice";
import { useLang } from "@/context/LangContext";
import { toast } from "sonner";

// Large accessible mic button. On stop, transcribes and calls onResult(text).
export function VoiceButton({ onResult, big = false }) {
  const { lang, t } = useLang();
  const [state, setState] = useState("idle"); // idle | recording | processing
  const recorderRef = useRef(null);

  const toggle = async () => {
    if (state === "recording") {
      setState("processing");
      try {
        const blob = await recorderRef.current.stop();
        const text = await transcribe(blob, lang);
        onResult(text || "");
      } catch (e) {
        toast.error("Could not transcribe. Please type instead.");
      } finally {
        setState("idle");
      }
      return;
    }
    try {
      recorderRef.current = createRecorder();
      await recorderRef.current.start();
      setState("recording");
    } catch (e) {
      toast.error("We couldn't access your microphone. You can type instead.");
      setState("idle");
    }
  };

  if (big) {
    return (
      <div className="flex flex-col items-center gap-3">
        <button
          data-testid="voice-record-btn"
          onClick={toggle}
          className={`relative flex items-center justify-center w-40 h-40 rounded-full text-white active:scale-95 transition-transform shadow-lg shadow-green-900/30 ${
            state === "recording" ? "bg-red-600" : "bg-green-700"
          }`}
        >
          {state === "recording" && (
            <span className="absolute inset-0 rounded-full bg-red-500 opacity-40 animate-ping" />
          )}
          {state === "processing" ? (
            <Loader2 className="w-16 h-16 animate-spin" />
          ) : state === "recording" ? (
            <Square className="w-14 h-14" />
          ) : (
            <Mic className="w-16 h-16" />
          )}
        </button>
        <p className="text-stone-600 font-medium text-center">
          {state === "recording"
            ? "Listening... tap to stop"
            : state === "processing"
            ? t("analyzing")
            : t("speak_hint")}
        </p>
      </div>
    );
  }

  return (
    <button
      data-testid="voice-mic-btn"
      onClick={toggle}
      className={`flex items-center justify-center w-12 h-12 rounded-full text-white active:scale-95 transition-transform ${
        state === "recording" ? "bg-red-600 animate-pulse" : "bg-green-700"
      }`}
    >
      {state === "processing" ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : state === "recording" ? (
        <Square className="w-5 h-5" />
      ) : (
        <Mic className="w-6 h-6" />
      )}
    </button>
  );
}

import { useState, useRef, useEffect } from "react";
import { Send, Camera, X, Loader2, Wheat } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { VoiceButton } from "@/components/VoiceButton";
import { ListenButton } from "@/components/ListenButton";
import { toast } from "sonner";

export default function Assistant() {
  const { lang, t } = useLang();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const fileRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const send = async () => {
    if (!input.trim() && !image) return;
    const userMsg = { role: "user", text: input, image };
    setMessages((m) => [...m, userMsg]);
    const sendImg = image;
    setInput("");
    setImage(null);
    setLoading(true);
    try {
      const { data } = await api.post("/chat", {
        message: userMsg.text,
        image_base64: sendImg,
        language: lang,
        session_id: sessionId,
      });
      setMessages((m) => [...m, { role: "ai", text: data.reply }]);
    } catch (e) {
      toast.error(errText(e, "AI is unavailable right now."));
      setMessages((m) => [...m, { role: "ai", text: "Sorry, I couldn't respond right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 190px)" }}>
      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-10 km-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Wheat className="w-9 h-9 text-green-700" />
            </div>
            <h2 className="text-xl font-bold text-stone-800 font-[Manrope]">{t("assistant")}</h2>
            <p className="text-stone-500 mt-2 px-6">{t("speak_hint")}</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl p-4 ${
                m.role === "user" ? "bg-green-700 text-white rounded-br-md" : "bg-white border border-stone-200 text-stone-800 rounded-bl-md"
              }`}
            >
              {m.image && <img src={m.image} alt="crop" className="rounded-xl mb-2 max-h-48 object-cover" />}
              {m.text && <p className="whitespace-pre-wrap leading-relaxed font-medium">{m.text}</p>}
              {m.role === "ai" && m.text && <div className="mt-3"><ListenButton text={m.text} testId={`chat-listen-${i}`} /></div>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-md p-4 flex items-center gap-2 text-stone-500">
              <Loader2 className="w-5 h-5 animate-spin" /> {t("analyzing")}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 -mx-4 px-4 pt-3 bg-[#F9F8F6]">
        {image && (
          <div className="relative inline-block mb-2">
            <img src={image} alt="preview" className="h-20 rounded-xl border border-stone-200" />
            <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-white rounded-2xl border-2 border-stone-200 p-2">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" data-testid="chat-image-input" />
          <button data-testid="chat-camera" onClick={() => fileRef.current?.click()} className="w-11 h-11 rounded-xl flex items-center justify-center text-green-700 shrink-0">
            <Camera className="w-6 h-6" />
          </button>
          <textarea
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={t("type_placeholder")}
            rows={1}
            className="flex-1 py-2.5 outline-none resize-none font-medium max-h-24"
          />
          <div className="shrink-0"><VoiceButton onResult={(txt) => setInput((v) => (v ? v + " " + txt : txt))} /></div>
          <button
            data-testid="chat-send"
            onClick={send}
            disabled={loading}
            className="w-11 h-11 rounded-xl bg-green-700 text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

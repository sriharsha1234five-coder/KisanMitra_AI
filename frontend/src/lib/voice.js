import { api } from "./api";

// ---- Speech to text: record mic audio, send to backend Whisper ----
export function createRecorder() {
  let mediaRecorder = null;
  let chunks = [];
  let stream = null;

  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.start();
    },
    stop() {
      return new Promise((resolve) => {
        if (!mediaRecorder) return resolve(null);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          if (stream) stream.getTracks().forEach((tr) => tr.stop());
          resolve(blob);
        };
        mediaRecorder.stop();
      });
    },
  };
}

export async function transcribe(blob, language = "en") {
  const form = new FormData();
  form.append("file", blob, "audio.webm");
  form.append("language", language);
  const { data } = await api.post("/stt", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data.text;
}

// ---- Text to speech playback via backend OpenAI TTS, with browser fallback ----
let currentAudio = null;

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

export async function speak(text, { onStart, onEnd } = {}) {
  stopSpeaking();
  try {
    const res = await api.post("/tts", { text }, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onplay = () => onStart && onStart();
    audio.onended = () => {
      onEnd && onEnd();
      currentAudio = null;
    };
    await audio.play();
    return true;
  } catch (e) {
    // Fallback to browser speech synthesis
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.onstart = () => onStart && onStart();
      u.onend = () => onEnd && onEnd();
      window.speechSynthesis.speak(u);
      return true;
    }
    onEnd && onEnd();
    return false;
  }
}

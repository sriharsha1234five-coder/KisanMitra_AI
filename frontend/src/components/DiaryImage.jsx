import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ImageIcon } from "lucide-react";

// Fetches a diary image as a blob (auth header via interceptor) and renders it.
export function DiaryImage({ id, className = "" }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let objectUrl;
    let mounted = true;
    api
      .get(`/diary/${id}/image`, { responseType: "blob" })
      .then((res) => {
        if (!mounted) return;
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => setErr(true));
    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  if (err) {
    return (
      <div className={`bg-stone-100 flex items-center justify-center ${className}`}>
        <ImageIcon className="w-8 h-8 text-stone-300" />
      </div>
    );
  }
  if (!url) {
    return <div className={`bg-stone-100 animate-pulse ${className}`} />;
  }
  return <img src={url} alt="crop" className={`object-cover ${className}`} />;
}

import { createContext, useContext, useState } from "react";
import { t as translate } from "@/lib/i18n";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("km_lang") || "en");
  const change = (l) => {
    localStorage.setItem("km_lang", l);
    setLang(l);
  };
  const t = (key) => translate(lang, key);
  return (
    <LangContext.Provider value={{ lang, setLang: change, t }}>{children}</LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

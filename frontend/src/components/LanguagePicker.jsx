import { Languages } from "lucide-react";
import { LANGUAGES } from "@/lib/i18n";
import { useLang } from "@/context/LangContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguagePicker({ compact = false }) {
  const { lang, setLang } = useLang();
  return (
    <Select value={lang} onValueChange={setLang}>
      <SelectTrigger
        data-testid="language-picker"
        className={`h-11 rounded-xl border-2 border-stone-200 bg-white font-semibold ${compact ? "w-[130px]" : "w-full"}`}
      >
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-green-700" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code} data-testid={`lang-${l.code}`}>
            {l.native}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

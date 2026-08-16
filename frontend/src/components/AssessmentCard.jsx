import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronDown,
  ListChecks,
  Eye,
  CalendarPlus,
} from "lucide-react";
import { ListenButton } from "@/components/ListenButton";
import { useLang } from "@/context/LangContext";

function statusStyle(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("urgent")) return { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-600", text: "text-red-700", Icon: AlertTriangle };
  if (s.includes("good")) return { bg: "bg-green-50", border: "border-green-200", dot: "bg-green-600", text: "text-green-700", Icon: CheckCircle2 };
  return { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", text: "text-amber-700", Icon: AlertTriangle };
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <h3 className="flex items-center gap-2 font-bold text-stone-800 mb-3 font-[Manrope]">
        {Icon && <Icon className="w-5 h-5 text-green-700" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

// r = assessment result JSON. Provides Read/Listen, Why accordion, Save as Task.
export function AssessmentCard({ r, onSaveTask }) {
  const { t } = useLang();
  const [showWhy, setShowWhy] = useState(false);
  const st = statusStyle(r.overall_status);
  const spoken =
    r.summary ||
    `${r.overall_status}. ${r.primary_concern}. ${(r.action_plan?.today || []).join(". ")}`;

  return (
    <div className="space-y-4" data-testid="assessment-result">
      {/* Status banner */}
      <div className={`rounded-2xl border-2 ${st.border} ${st.bg} p-5`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${st.dot}`} />
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {t("overall_status")}
          </span>
        </div>
        <p className={`text-2xl font-extrabold mt-1 ${st.text} font-[Manrope]`} data-testid="assessment-status">
          {r.overall_status}
        </p>
        <p className="text-stone-700 mt-2 font-medium">{r.primary_concern}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <ListenButton text={spoken} testId="assessment-listen" />
          {onSaveTask && (
            <button
              data-testid="save-primary-task"
              onClick={() => onSaveTask(r.primary_concern)}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-green-700 text-white font-semibold active:scale-95 transition-transform"
            >
              <CalendarPlus className="w-5 h-5" /> {t("save_task")}
            </button>
          )}
        </div>
      </div>

      {/* Factors considered */}
      {r.factors_considered?.length > 0 && (
        <Section title={t("factors")} icon={CheckCircle2}>
          <div className="flex flex-wrap gap-2">
            {r.factors_considered.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-50 text-green-800 text-sm font-semibold border border-green-100">
                <CheckCircle2 className="w-4 h-4" /> {f}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Image observations */}
      {r.image_observations?.length > 0 && (
        <Section title={t("image_obs")} icon={Eye}>
          <ul className="space-y-2">
            {r.image_observations.map((x, i) => (
              <li key={i} className="text-stone-700 font-medium">• {x}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Possible factors */}
      {r.possible_factors?.length > 0 && (
        <Section title={t("possible")} icon={Info}>
          <ul className="space-y-2">
            {r.possible_factors.map((x, i) => (
              <li key={i} className="text-stone-700 font-medium">• {x}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Action plan */}
      {r.action_plan && (
        <Section title={t("action_plan")} icon={ListChecks}>
          <div className="space-y-4">
            {[["today", t("today")], ["next_days", t("next_days")], ["if_changes", t("if_changes")]].map(
              ([key, label]) =>
                r.action_plan[key]?.length > 0 && (
                  <div key={key}>
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">{label}</p>
                    <div className="space-y-2">
                      {r.action_plan[key].map((step, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 bg-stone-50 rounded-xl p-3">
                          <span className="text-stone-800 font-medium">{step}</span>
                          {onSaveTask && key !== "if_changes" && (
                            <button
                              data-testid={`save-task-${key}-${i}`}
                              onClick={() => onSaveTask(step)}
                              className="shrink-0 text-green-700"
                              title={t("save_task")}
                            >
                              <CalendarPlus className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        </Section>
      )}

      {/* Why accordion */}
      {r.why?.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <button
            data-testid="why-toggle"
            onClick={() => setShowWhy((v) => !v)}
            className="w-full flex items-center justify-between p-5 font-bold text-stone-800 font-[Manrope]"
          >
            <span>{t("why")}</span>
            <ChevronDown className={`w-5 h-5 transition-transform ${showWhy ? "rotate-180" : ""}`} />
          </button>
          {showWhy && (
            <div className="px-5 pb-5">
              {r.confidence && (
                <p className="text-sm mb-3">
                  <span className="font-bold text-stone-500 uppercase tracking-wider">{t("confidence")}: </span>
                  <span className="font-semibold text-green-700">{r.confidence}</span>
                </p>
              )}
              <ul className="space-y-2">
                {r.why.map((x, i) => (
                  <li key={i} className="text-stone-700 font-medium">• {x}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Important note */}
      {r.important_note && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-amber-800 mb-1">{t("important")}</p>
            <p className="text-amber-900 font-medium text-sm leading-relaxed">{r.important_note}</p>
          </div>
        </div>
      )}
    </div>
  );
}

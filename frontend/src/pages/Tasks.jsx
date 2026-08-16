import { useState, useEffect } from "react";
import { ListTodo, Plus, Trash2, CheckCircle2, Circle, Loader2, X, Flag } from "lucide-react";
import { api, errText } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { cacheSet, cacheGet } from "@/lib/offline";
import { useOnline } from "@/lib/offline";
import { toast } from "sonner";

const PRIORITIES = ["High", "Medium", "Low"];
const PRIO_COLOR = { High: "text-red-600 bg-red-50", Medium: "text-amber-600 bg-amber-50", Low: "text-stone-500 bg-stone-100" };

export default function Tasks() {
  const { t } = useLang();
  const online = useOnline();
  const [tasks, setTasks] = useState(cacheGet("tasks", []));
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", due: "", priority: "Medium" });

  const load = async () => {
    try {
      const { data } = await api.get("/tasks");
      setTasks(data);
      cacheSet("tasks", data);
    } catch (e) { if (online) toast.error(errText(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const add = async () => {
    if (!form.title.trim()) { toast.error("Add a task title."); return; }
    try {
      await api.post("/tasks", form);
      setShowForm(false);
      setForm({ title: "", due: "", priority: "Medium" });
      load();
    } catch (e) { toast.error(errText(e)); }
  };

  const toggle = async (task) => {
    setTasks((ts) => ts.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)));
    try { await api.put(`/tasks/${task.id}`, { done: !task.done }); } catch (e) { load(); }
  };

  const remove = async (id) => {
    setTasks((ts) => ts.filter((x) => x.id !== id));
    try { await api.delete(`/tasks/${id}`); } catch (e) { toast.error(errText(e)); }
  };

  return (
    <div className="space-y-5 km-fade-up">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
          <ListTodo className="w-7 h-7 text-green-700" />
        </div>
        <h1 className="text-2xl font-extrabold text-stone-900 font-[Manrope]">{t("tasks")}</h1>
      </div>

      {loading && tasks.length === 0 && <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-green-700" /></div>}
      {!loading && tasks.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-500">No tasks yet. Add farm tasks or save them from an AI assessment.</div>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} data-testid={`task-${task.id}`} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
            <button data-testid={`toggle-task-${task.id}`} onClick={() => toggle(task)}>
              {task.done ? <CheckCircle2 className="w-7 h-7 text-green-600" /> : <Circle className="w-7 h-7 text-stone-300" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${task.done ? "line-through text-stone-400" : "text-stone-800"}`}>{task.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${PRIO_COLOR[task.priority] || PRIO_COLOR.Medium}`}>
                  <Flag className="w-3 h-3" /> {task.priority}
                </span>
                {task.due && <span className="text-xs text-stone-400">Due: {task.due}</span>}
              </div>
            </div>
            <button data-testid={`delete-task-${task.id}`} onClick={() => remove(task.id)} className="text-stone-400"><Trash2 className="w-5 h-5" /></button>
          </div>
        ))}
      </div>

      <button data-testid="add-task-btn" onClick={() => setShowForm(true)} className="w-full h-14 rounded-2xl bg-green-700 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform">
        <Plus className="w-5 h-5" /> {t("add_task")}
      </button>

      {showForm && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-[Manrope]">{t("add_task")}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-6 h-6 text-stone-500" /></button>
            </div>
            <input data-testid="task-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" className="w-full h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium" />
            <input data-testid="task-due" type="date" value={form.due} onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))} className="w-full h-14 px-4 rounded-xl border-2 border-stone-200 focus:border-green-600 outline-none font-medium" />
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button key={p} data-testid={`prio-${p}`} onClick={() => setForm((f) => ({ ...f, priority: p }))} className={`flex-1 h-12 rounded-xl font-semibold border-2 ${form.priority === p ? "border-green-700 bg-green-50 text-green-800" : "border-stone-200 text-stone-500"}`}>{p}</button>
              ))}
            </div>
            <button data-testid="save-task-btn" onClick={add} className="w-full h-14 rounded-xl bg-green-700 text-white font-semibold">Save Task</button>
          </div>
        </div>
      )}
    </div>
  );
}

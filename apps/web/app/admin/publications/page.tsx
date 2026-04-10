"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
const MDPreview = dynamic(() => import("@uiw/react-md-editor").then((m) => m.default.Markdown), { ssr: false });

interface Publication {
  id: string;
  title: string;
  sourceType: string;
  authorName: string | null;
  status: string;
  tags: string[];
  createdAt: string;
}

const CATEGORIES = ["Речь", "Эмоции", "Поведение", "Мама", "Сенсорика", "Другое"];

function getAdminToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/adminToken=([^;]+)/);
  return match ? match[1] : "";
}

const EMPTY_FORM = { title: "", content: "", category: "Поведение", authorName: "", isPublished: false };

export default function PublicationsPage() {
  const [rows, setRows] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/publications", {
        headers: { "x-admin-key": getAdminToken() },
      });
      const json = await res.json();
      setRows(json.data ?? []);
      setError(null);
    } catch {
      setError("Не удалось загрузить публикации");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": getAdminToken() },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">📝 Публикации</h1>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">
            ↻ Обновить
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-colors"
          >
            {showForm ? "✕ Отмена" : "+ Добавить статью"}
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-slate-800 rounded-xl p-6 mb-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white">Новая статья</h2>

          <div className="grid grid-cols-2 gap-4">
            <input
              required
              placeholder="Заголовок *"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
            <input
              placeholder="Имя автора"
              value={form.authorName}
              onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-indigo-500 w-48"
          >
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          {/* Markdown editor + preview */}
          <div className="grid grid-cols-2 gap-4" data-color-mode="dark">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Редактор (Markdown)</label>
              <MDEditor
                value={form.content}
                onChange={(v) => setForm((f) => ({ ...f, content: v ?? "" }))}
                height={400}
                preview="edit"
              />
              <p className="text-xs text-slate-500">
                <span className="font-mono">**жирный**</span> · <span className="font-mono">*курсив*</span> · <span className="font-mono">## Заголовок</span> · <span className="font-mono">- список</span> · <span className="font-mono">&gt; цитата</span>
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Предпросмотр</label>
              <div className="bg-white rounded-lg p-4 min-h-[400px] overflow-auto prose prose-sm max-w-none">
                <MDPreview source={form.content} />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-slate-300 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
              className="w-4 h-4 accent-indigo-500"
            />
            Опубликовать сразу
          </label>

          {saveError && <p className="text-red-400 text-sm">{saveError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-60 w-48"
          >
            {saving ? "Сохранение..." : "Сохранить статью"}
          </button>
        </form>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Загрузка...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📄</div>
          <p>Нет публикаций. Добавьте первую статью.</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-slate-300">
              <tr>
                <th className="text-left px-4 py-3">Заголовок</th>
                <th className="text-left px-4 py-3">Автор</th>
                <th className="text-left px-4 py-3">Категория</th>
                <th className="text-left px-4 py-3">Источник</th>
                <th className="text-left px-4 py-3">Статус</th>
                <th className="text-left px-4 py-3">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-4 py-3 text-white font-medium max-w-xs truncate">{row.title}</td>
                  <td className="px-4 py-3 text-slate-300">{row.authorName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{row.tags[0] ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                      {row.sourceType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "approved" && (
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-green-700 text-green-100">✅ Опубликовано</span>
                    )}
                    {row.status === "pending" && (
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-yellow-700 text-yellow-100">⏳ На проверке</span>
                    )}
                    {row.status === "rejected" && (
                      <span className="text-xs px-2 py-0.5 rounded font-semibold bg-red-800 text-red-200">❌ Отклонено</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(row.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

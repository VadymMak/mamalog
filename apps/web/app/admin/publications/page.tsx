"use client";

import { useEffect, useState, useMemo } from "react";
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
const EMPTY_IMPORT = { url: "", category: "Поведение" };

export default function PublicationsPage() {
  const [rows, setRows] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importForm, setImportForm] = useState(EMPTY_IMPORT);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Filter / sort state
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "category">("date_desc");

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

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!importForm.url.trim()) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/import-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importForm),
      });
      const json = await res.json() as { success: boolean; title?: string; error?: string };
      if (json.success) {
        setImportResult({ ok: true, message: `✅ Добавлено: «${json.title}»` });
        setImportForm(EMPTY_IMPORT);
        load();
      } else {
        setImportResult({ ok: false, message: json.error ?? "Ошибка импорта" });
      }
    } catch {
      setImportResult({ ok: false, message: "Ошибка подключения" });
    } finally {
      setImporting(false);
    }
  }

  const filteredRows = useMemo(() => {
    let result = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q));
    }
    if (filterCategory) {
      result = result.filter((r) => r.tags.includes(filterCategory));
    }
    result.sort((a, b) => {
      if (sortBy === "date_asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "category") return (a.tags[0] ?? "").localeCompare(b.tags[0] ?? "");
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // date_desc
    });
    return result;
  }, [rows, search, filterCategory, sortBy]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">📝 Публикации</h1>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">
            ↻ Обновить
          </button>
          <button
            onClick={() => { setShowImport((v) => !v); setShowForm(false); setImportResult(null); }}
            className="px-4 py-1.5 text-sm bg-teal-700 hover:bg-teal-600 rounded-lg text-white font-semibold transition-colors"
          >
            {showImport ? "✕ Отмена" : "🔗 Импорт по URL"}
          </button>
          <button
            onClick={() => { setShowForm((v) => !v); setShowImport(false); }}
            className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold transition-colors"
          >
            {showForm ? "✕ Отмена" : "+ Добавить статью"}
          </button>
        </div>
      </div>

      {/* Import form */}
      {showImport && (
        <form onSubmit={handleImport} className="bg-slate-800 rounded-xl p-6 mb-6 flex flex-col gap-4 border border-teal-800">
          <h2 className="text-lg font-semibold text-white">🔗 Импорт статьи по URL</h2>
          <p className="text-slate-400 text-sm">
            Вставьте ссылку на статью — Claude прочитает страницу и отформатирует контент в Markdown.
          </p>

          <div className="flex gap-3">
            <input
              required
              type="url"
              placeholder="https://example.com/article"
              value={importForm.url}
              onChange={(e) => setImportForm((f) => ({ ...f, url: e.target.value }))}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
            />
            <select
              value={importForm.category}
              onChange={(e) => setImportForm((f) => ({ ...f, category: e.target.value }))}
              className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white focus:outline-none focus:border-teal-500 w-40"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {importResult && (
            <p className={`text-sm font-medium ${importResult.ok ? "text-green-400" : "text-red-400"}`}>
              {importResult.message}
            </p>
          )}

          <button
            type="submit"
            disabled={importing}
            className="py-2.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white font-semibold transition-colors disabled:opacity-60 w-56"
          >
            {importing ? "⏳ Читаем и форматируем..." : "🔗 Импортировать"}
          </button>
        </form>
      )}

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

      {/* Search / Filter / Sort */}
      {!loading && rows.length > 0 && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="🔍 Поиск по заголовку..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">Все категории</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="date_desc">Новые сначала</option>
            <option value="date_asc">Старые сначала</option>
            <option value="category">По категории</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Загрузка...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📄</div>
          <p>Нет публикаций. Добавьте первую статью.</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p>Ничего не найдено. Измените фильтры.</p>
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
              {filteredRows.map((row) => (
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

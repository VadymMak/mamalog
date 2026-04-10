"use client";

import { useEffect, useState, useMemo } from "react";

interface ModerationItem {
  id: string;
  title: string;
  content: string;
  sourceType: string;
  authorName: string | null;
  authorRole: string | null;
  tags: string[];
  status: string;
  aiScore: number | null;
  aiReason: string | null;
  trustIndex: number;
  createdAt: string;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-500 text-xs">—</span>;
  const color = score >= 80 ? "bg-green-600" : score >= 40 ? "bg-yellow-600" : "bg-red-600";
  return (
    <span className={`inline-block text-xs font-bold text-white px-2 py-0.5 rounded ${color}`}>
      {score}/100
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-green-700 text-green-100",
    pending:  "bg-yellow-700 text-yellow-100",
    rejected: "bg-red-800 text-red-200",
  };
  const label: Record<string, string> = {
    approved: "✅ Одобрено",
    pending:  "⏳ На проверке",
    rejected: "❌ Отклонено",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${map[status] ?? "bg-slate-600 text-slate-300"}`}>
      {label[status] ?? status}
    </span>
  );
}

type TabKey = "all" | "pending" | "approved" | "rejected";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "all",      label: "📋 Все" },
  { key: "pending",  label: "⏳ На проверке" },
  { key: "approved", label: "✅ Одобрено" },
  { key: "rejected", label: "❌ Отклонено" },
];

export default function ModerationPage() {
  const [allItems, setAllItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Fetch all three statuses in parallel
      const [pending, approved, rejected] = await Promise.all([
        fetch("/api/admin/moderation?status=pending").then((r) => r.json()),
        fetch("/api/admin/moderation?status=approved").then((r) => r.json()),
        fetch("/api/admin/moderation?status=rejected").then((r) => r.json()),
      ]);
      const combined: ModerationItem[] = [
        ...(pending.data ?? []),
        ...(approved.data ?? []),
        ...(rejected.data ?? []),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllItems(combined);
    } catch {
      setError("Не удалось загрузить статьи");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const items = useMemo(
    () => activeTab === "all" ? allItems : allItems.filter((i) => i.status === activeTab),
    [allItems, activeTab]
  );

  const counts = useMemo(() => ({
    all:      allItems.length,
    pending:  allItems.filter((i) => i.status === "pending").length,
    approved: allItems.filter((i) => i.status === "approved").length,
    rejected: allItems.filter((i) => i.status === "rejected").length,
  }), [allItems]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActioning(id);
    try {
      await fetch("/api/admin/moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const newStatus = action === "approve" ? "approved" : "rejected";
      setAllItems((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: newStatus } : item)
      );
    } catch {
      // keep as-is
    } finally {
      setActioning(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить статью навсегда?")) return;
    setActioning(id);
    try {
      await fetch("/api/admin/moderation", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAllItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      // keep as-is
    } finally {
      setActioning(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          🔍 Модерация статей
          {!loading && <span className="text-slate-400 text-lg ml-2">({allItems.length})</span>}
        </h1>
        <button
          onClick={load}
          className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
        >
          ↻ Обновить
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({counts[tab.key]})</span>
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="text-slate-400 py-12 text-center">Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">📭</div>
          <p>Нет статей в этом разделе</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
              {/* Header row */}
              <div className="flex items-start justify-between px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  {/* Badges row */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <StatusBadge status={item.status} />
                    <ScoreBadge score={item.aiScore} />
                    {item.tags[0] && (
                      <span className="text-xs text-slate-400 font-mono bg-slate-700 px-1.5 py-0.5 rounded">
                        {item.tags[0]}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                  {/* Title */}
                  <p className="text-white font-semibold leading-snug">{item.title}</p>
                  {/* Author */}
                  <p className="text-slate-400 text-xs mt-1">
                    ✍️ {item.authorName ?? "Аноним"}
                    {item.authorRole ? <span className="text-slate-500"> · {item.authorRole}</span> : null}
                    <span className="text-slate-600"> · {item.sourceType}</span>
                  </p>
                  {/* AI reason */}
                  {item.aiReason && (
                    <p className="text-slate-500 text-xs mt-1 italic">ИИ: {item.aiReason}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                  >
                    {expanded === item.id ? "Скрыть" : "Читать"}
                  </button>
                  {item.status !== "approved" && (
                    <button
                      disabled={actioning === item.id}
                      onClick={() => handleAction(item.id, "approve")}
                      className="px-3 py-1.5 text-xs bg-green-700 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
                    >
                      ✓ Одобрить
                    </button>
                  )}
                  {item.status !== "rejected" && (
                    <button
                      disabled={actioning === item.id}
                      onClick={() => handleAction(item.id, "reject")}
                      className="px-3 py-1.5 text-xs bg-red-800 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-60"
                    >
                      ✕ Отклонить
                    </button>
                  )}
                  <button
                    disabled={actioning === item.id}
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-red-900 text-slate-400 hover:text-white rounded-lg transition-colors disabled:opacity-60"
                    title="Удалить навсегда"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Expanded content */}
              {expanded === item.id && (
                <div className="px-5 pb-5 border-t border-slate-700">
                  <div className="mt-4 bg-slate-900 rounded-lg p-4 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed max-h-80 overflow-auto">
                    {item.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

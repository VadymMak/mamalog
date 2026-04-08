import { useState, useCallback, useEffect } from "react";
import { api } from "../lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const TAG_OPTIONS = ["сон", "еда", "истерики", "речь", "сенсорика", "РАС", "СДВГ", "ЗПР"];
const AGE_OPTIONS = ["0-3", "3-7", "7-12", "12+"];
const SOURCE_OPTIONS = ["admin", "specialist", "mom"];
const STATUS_FILTERS = [
  { id: "all", label: "Все" },
  { id: "pending", label: "На модерации" },
  { id: "approved", label: "Одобрены" },
  { id: "rejected", label: "Отклонены" },
];

const STATUS_BADGE = {
  pending:  { cls: "kb-badge-pending",  label: "На модерации" },
  approved: { cls: "kb-badge-approved", label: "Одобрено" },
  rejected: { cls: "kb-badge-rejected", label: "Отклонено" },
};

const SOURCE_LABEL = {
  admin:      "Администратор",
  specialist: "Специалист",
  mom:        "Опыт мамы",
};

function TrustStars({ index }) {
  return (
    <span className="kb-stars">
      {"★".repeat(index)}{"☆".repeat(5 - index)}
    </span>
  );
}

// ─── Add / Edit Form ──────────────────────────────────────────────────────────

function ArticleForm({ initial, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [sourceType, setSourceType] = useState(initial?.sourceType ?? "admin");
  const [authorName, setAuthorName] = useState(initial?.authorName ?? "");
  const [authorRole, setAuthorRole] = useState(initial?.authorRole ?? "");
  const [ageGroup, setAgeGroup] = useState(initial?.ageGroup ?? "");
  const [trustIndex, setTrustIndex] = useState(initial?.trustIndex ?? 4);
  const [selectedTags, setSelectedTags] = useState(initial?.tags ?? []);

  function toggleTag(tag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave({
      title: title.trim(),
      content: content.trim(),
      sourceType,
      authorName: authorName.trim() || undefined,
      authorRole: authorRole.trim() || undefined,
      ageGroup: ageGroup || undefined,
      trustIndex: Number(trustIndex),
      tags: selectedTags,
    });
  }

  return (
    <form className="kb-form" onSubmit={handleSubmit}>
      <h2 className="kb-form-title">{initial ? "Редактировать статью" : "Добавить статью"}</h2>

      <div className="kb-form-row">
        <label className="kb-label">Заголовок *</label>
        <input
          className="kb-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Заголовок статьи..."
          required
        />
      </div>

      <div className="kb-form-row">
        <label className="kb-label">Содержание *</label>
        <textarea
          className="kb-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Текст статьи..."
          rows={8}
          required
        />
      </div>

      <div className="kb-form-grid">
        <div className="kb-form-row">
          <label className="kb-label">Тип источника</label>
          <select className="kb-select" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>{SOURCE_LABEL[s] ?? s}</option>
            ))}
          </select>
        </div>

        <div className="kb-form-row">
          <label className="kb-label">Возрастная группа</label>
          <select className="kb-select" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
            <option value="">Все возрасты</option>
            {AGE_OPTIONS.map((a) => (
              <option key={a} value={a}>{a} лет</option>
            ))}
          </select>
        </div>

        <div className="kb-form-row">
          <label className="kb-label">Имя автора</label>
          <input className="kb-input" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Имя автора..." />
        </div>

        <div className="kb-form-row">
          <label className="kb-label">Роль автора</label>
          <input className="kb-input" value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} placeholder="Психолог, логопед..." />
        </div>
      </div>

      <div className="kb-form-row">
        <label className="kb-label">Индекс доверия: {trustIndex} / 5</label>
        <div className="kb-trust-row">
          <input
            type="range"
            min={1} max={5} step={1}
            value={trustIndex}
            onChange={(e) => setTrustIndex(Number(e.target.value))}
            className="kb-range"
          />
          <span className="kb-stars">{"★".repeat(trustIndex)}{"☆".repeat(5 - trustIndex)}</span>
        </div>
      </div>

      <div className="kb-form-row">
        <label className="kb-label">Теги</label>
        <div className="kb-tags-row">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`kb-tag-btn ${selectedTags.includes(tag) ? "kb-tag-btn--active" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="kb-form-actions">
        <button type="submit" className="btn btn-approve" disabled={saving}>
          {saving ? "Сохранение..." : initial ? "Сохранить" : "Добавить"}
        </button>
        <button type="button" className="btn" style={{ background: "#f0f0f5", color: "#444" }} onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function KnowledgeBase({ showToast }) {
  const [articles, setArticles] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const load = useCallback((status = statusFilter) => {
    setLoading(true);
    const params = { admin: "true", limit: 100 };
    if (status !== "all") params.status = status;
    api
      .get("/api/knowledge", { params })
      .then((r) => {
        setArticles(r.data.data ?? []);
        setTotal(r.data.total ?? 0);
        setError(null);
      })
      .catch(() => setError("Не удалось загрузить статьи"))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  async function handleApprove(article) {
    setActioningId(article.id);
    try {
      await api.patch(`/api/knowledge/${article.id}`, { status: "approved", trustIndex: article.trustIndex });
      setArticles((prev) => prev.map((a) => a.id === article.id ? { ...a, status: "approved" } : a));
      showToast("Статья одобрена");
    } catch { showToast("Ошибка", "error"); }
    finally { setActioningId(null); }
  }

  async function handleReject(article) {
    setActioningId(article.id);
    try {
      await api.patch(`/api/knowledge/${article.id}`, { status: "rejected" });
      setArticles((prev) => prev.map((a) => a.id === article.id ? { ...a, status: "rejected" } : a));
      showToast("Статья отклонена");
    } catch { showToast("Ошибка", "error"); }
    finally { setActioningId(null); }
  }

  async function handleDelete(article) {
    if (!window.confirm(`Удалить «${article.title}»?`)) return;
    setActioningId(article.id);
    try {
      await api.delete(`/api/knowledge/${article.id}`);
      setArticles((prev) => prev.filter((a) => a.id !== article.id));
      setTotal((n) => n - 1);
      showToast("Статья удалена");
    } catch { showToast("Ошибка", "error"); }
    finally { setActioningId(null); }
  }

  async function handleSave(data) {
    setSaving(true);
    try {
      if (editingArticle) {
        await api.patch(`/api/knowledge/${editingArticle.id}`, data);
        setArticles((prev) => prev.map((a) => a.id === editingArticle.id ? { ...a, ...data } : a));
        showToast("Статья обновлена");
      } else {
        const res = await api.post("/api/knowledge", data);
        showToast("Статья добавлена (ID: " + res.data.id + ")");
        load(statusFilter);
      }
      setShowForm(false);
      setEditingArticle(null);
    } catch { showToast("Не удалось сохранить статью", "error"); }
    finally { setSaving(false); }
  }

  // Stats counts
  const pendingCount = articles.filter((a) => a.status === "pending").length;
  const approvedCount = articles.filter((a) => a.status === "approved").length;
  const rejectedCount = articles.filter((a) => a.status === "rejected").length;

  return (
    <div className="screen">
      <div className="screen-header">
        <h1 className="screen-title">
          База знаний
          {total > 0 && <span className="screen-count">{total}</span>}
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-refresh" onClick={() => load(statusFilter)}>↻ Обновить</button>
          <button
            className="btn btn-approve"
            onClick={() => { setEditingArticle(null); setShowForm(true); }}
          >
            + Добавить статью
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value">{total}</span>}
          <span className="stat-label">Всего статей</span>
        </div>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value" style={{ color: "#d69e2e" }}>{pendingCount}</span>}
          <span className="stat-label">На модерации</span>
        </div>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value" style={{ color: "#38a169" }}>{approvedCount}</span>}
          <span className="stat-label">Одобрены</span>
        </div>
        <div className="stat-card">
          {loading ? <span className="stat-skeleton" /> : <span className="stat-value" style={{ color: "#e53e3e" }}>{rejectedCount}</span>}
          <span className="stat-label">Отклонены</span>
        </div>
      </div>

      {/* Add / Edit form panel */}
      {showForm && (
        <div className="kb-form-panel">
          <ArticleForm
            initial={editingArticle}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingArticle(null); }}
            saving={saving}
          />
        </div>
      )}

      {/* Status filter */}
      <div className="crm-filter-btns" style={{ marginBottom: 16 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            className={`crm-filter-btn ${statusFilter === f.id ? "crm-filter-btn--active" : ""}`}
            onClick={() => setStatusFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : articles.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📚</span>
          <p>Нет статей</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Заголовок</th>
              <th>Автор</th>
              <th>Тип</th>
              <th>Теги</th>
              <th>Доверие</th>
              <th>Возраст</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => {
              const statusInfo = STATUS_BADGE[a.status] ?? STATUS_BADGE.pending;
              const busy = actioningId === a.id;
              return (
                <tr key={a.id}>
                  <td>
                    <span className="kb-title" title={a.title}>
                      {a.title.length > 60 ? a.title.slice(0, 60) + "…" : a.title}
                    </span>
                  </td>
                  <td>
                    <span className="kb-author">{a.authorName ?? "—"}</span>
                    {a.authorRole && <span className="kb-author-role">{a.authorRole}</span>}
                  </td>
                  <td>
                    <span className="badge badge-free" style={{ whiteSpace: "nowrap" }}>
                      {SOURCE_LABEL[a.sourceType] ?? a.sourceType}
                    </span>
                  </td>
                  <td>
                    <div className="kb-tag-list">
                      {(a.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} className="kb-tag">{tag}</span>
                      ))}
                      {(a.tags ?? []).length > 3 && (
                        <span className="kb-tag kb-tag-more">+{a.tags.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td><TrustStars index={a.trustIndex ?? 3} /></td>
                  <td className="kb-age">{a.ageGroup ?? "—"}</td>
                  <td>
                    <span className={`badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                  </td>
                  <td>
                    <div className="crm-actions">
                      {a.status !== "approved" && (
                        <button
                          className="btn btn-approve"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => handleApprove(a)}
                          disabled={busy}
                          title="Одобрить"
                        >
                          ✓
                        </button>
                      )}
                      {a.status !== "rejected" && (
                        <button
                          className="btn btn-reject"
                          style={{ padding: "4px 10px", fontSize: 12 }}
                          onClick={() => handleReject(a)}
                          disabled={busy}
                          title="Отклонить"
                        >
                          ✗
                        </button>
                      )}
                      <button
                        className="btn"
                        style={{ background: "#ebf4ff", color: "#2b6cb0", padding: "4px 10px", fontSize: 12 }}
                        onClick={() => { setEditingArticle(a); setShowForm(true); }}
                        title="Редактировать"
                      >
                        ✎
                      </button>
                      <button
                        className="btn btn-reject"
                        style={{ padding: "4px 10px", fontSize: 12 }}
                        onClick={() => handleDelete(a)}
                        disabled={busy}
                        title="Удалить"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

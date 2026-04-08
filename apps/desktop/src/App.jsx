import { useState, useCallback } from "react";
import Dashboard from "./screens/Dashboard";
import SpecialistRequests from "./screens/SpecialistRequests";
import CRM from "./screens/CRM";
import UserDetail from "./screens/UserDetail";
import Analytics from "./screens/Analytics";
import ContentModeration from "./screens/ContentModeration";
import KnowledgeBase from "./screens/KnowledgeBase";
import "./styles.css";

const NAV_ITEMS = [
  { id: "analytics", label: "📊 Аналитика" },
  { id: "crm", label: "👥 CRM" },
  { id: "specialists", label: "🩺 Специалисты" },
  { id: "content", label: "📝 Контент" },
  { id: "knowledge", label: "🧠 База знаний" },
  { id: "settings", label: "⚙️ Настройки" },
];

let toastId = 0;

function PlaceholderScreen({ title }) {
  return (
    <div className="screen">
      <h1 className="screen-title">{title}</h1>
      <div className="empty-state">
        <span className="empty-icon">🚧</span>
        <p>Раздел в разработке</p>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("analytics");
  const [selectedUser, setSelectedUser] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  function handleUserClick(user) {
    setSelectedUser(user);
    setActive("user-detail");
  }

  function handleBackFromDetail() {
    setSelectedUser(null);
    setActive("crm");
  }

  function renderContent() {
    switch (active) {
      case "analytics":
        return <Analytics showToast={showToast} />;
      case "crm":
        return <CRM showToast={showToast} onUserClick={handleUserClick} />;
      case "user-detail":
        return (
          <UserDetail
            user={selectedUser}
            onBack={handleBackFromDetail}
            showToast={showToast}
          />
        );
      case "specialists":
        return <SpecialistRequests showToast={showToast} />;
      case "content":
        return <ContentModeration />;
      case "knowledge":
        return <KnowledgeBase showToast={showToast} />;
      default:
        return (
          <PlaceholderScreen
            title={NAV_ITEMS.find((n) => n.id === active)?.label ?? ""}
          />
        );
    }
  }

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🌸</span>
          <span className="logo-text">Mamalog</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${(active === item.id || (active === "user-detail" && item.id === "crm")) ? "nav-item--active" : ""}`}
              onClick={() => { setActive(item.id); if (item.id !== "crm") setSelectedUser(null); }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="header">
          <span className="header-title">Mamalog Admin</span>
          <span className="header-user">Admin</span>
        </header>
        <div className="content">{renderContent()}</div>
      </div>

      {/* Toast container */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

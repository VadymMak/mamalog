import { useState, useCallback, useEffect } from "react";
import Dashboard from "./screens/Dashboard";
import SpecialistRequests from "./screens/SpecialistRequests";
import Users from "./screens/Users";
import ContentModeration from "./screens/ContentModeration";
import "./styles.css";

const NAV_ITEMS = [
  { id: "specialists", label: "Заявки специалистов" },
  { id: "users", label: "Пользователи" },
  { id: "content", label: "Контент" },
  { id: "analytics", label: "Аналитика" },
  { id: "settings", label: "Настройки" },
];

let toastId = 0;

function PlaceholderScreen({ title }) {
  return (
    <div className="screen">
      <h1 className="screen-title">{title}</h1>
      <div className="empty-state">
        <p>Раздел в разработке</p>
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("analytics");
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  function renderContent() {
    switch (active) {
      case "specialists":
        return <SpecialistRequests showToast={showToast} />;
      case "users":
        return <Users showToast={showToast} />;
      case "analytics":
        return <Dashboard showToast={showToast} />;
      case "content":
        return <ContentModeration />;
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
              className={`nav-item ${active === item.id ? "nav-item--active" : ""}`}
              onClick={() => setActive(item.id)}
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

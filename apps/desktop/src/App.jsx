import { useState } from "react";
import Dashboard from "./screens/Dashboard";
import SpecialistRequests from "./screens/SpecialistRequests";
import Users from "./screens/Users";
import "./styles.css";

const NAV_ITEMS = [
  { id: "specialists", label: "Заявки специалистов" },
  { id: "users", label: "Пользователи" },
  { id: "content", label: "Контент" },
  { id: "analytics", label: "Аналитика" },
  { id: "settings", label: "Настройки" },
];

function PlaceholderScreen({ title }) {
  return (
    <div className="screen">
      <h1 className="screen-title">{title}</h1>
      <p style={{ color: "#888" }}>Раздел в разработке</p>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("analytics");

  function renderContent() {
    switch (active) {
      case "specialists":
        return <SpecialistRequests />;
      case "users":
        return <Users />;
      case "analytics":
        return <Dashboard />;
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
    </div>
  );
}

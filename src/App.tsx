import { useState } from "react";
import { WarmupPage } from "./modules/warmup/pages/WarmupPage";
import { WarmupAdmin } from "./admin/warmup/WarmupAdmin";
import { useGameStore } from "./core/store/gameStore";

export default function App() {
  const [admin, setAdmin] = useState(false);
  const teams = useGameStore((s) => s.teams);

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div>
          <strong>ĐƯỜNG LÊN ĐỈNH OLYMPIA</strong>
          <span className="nav-subtitle">EVENT GAME • PART 1</span>
        </div>
        <button className="ghost-button" onClick={() => setAdmin((v) => !v)}>
          {admin ? "← Màn hình chơi" : "⚙ Quản trị Khởi động"}
        </button>
      </nav>

      {admin ? <WarmupAdmin /> : <WarmupPage teams={teams} />}
    </div>
  );
}
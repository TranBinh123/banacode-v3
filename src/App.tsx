import { useState } from "react";
import { WarmupPage } from "./modules/warmup/pages/WarmupPage";
import { WarmupAdmin } from "./admin/warmup/WarmupAdmin";
import { ObstaclePage } from "./modules/obstacle/pages/ObstaclePage";
import { ObstacleAdmin } from "./admin/obstacle/ObstacleAdmin";
import { AccelerationPage } from "./modules/acceleration/pages/AccelerationPage";
import { AccelerationAdmin } from "./admin/acceleration/AccelerationAdmin";
import { useGameStore } from "./core/store/gameStore";

type Module = "warmup" | "obstacle" | "acceleration";

export default function App() {
  const [module, setModule] = useState<Module>("warmup");
  const [admin, setAdmin] = useState(false);
  const teams = useGameStore((s) => s.teams);
  const isObstacle = module === "obstacle";
  const isAcceleration = module === "acceleration";

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div>
          <strong>ĐƯỜNG LÊN ĐỈNH OLYMPIA</strong>
          <span className="nav-subtitle">THE BANACODE • HÀNH TRÌNH 19 NĂM</span>
        </div>
        <div className="nav-module-tabs">
          <button className={module === "warmup" ? "nav-module active" : "nav-module"} onClick={() => { setModule("warmup"); setAdmin(false); }}>VÒNG 1</button>
          <button className={module === "obstacle" ? "nav-module active" : "nav-module"} onClick={() => { setModule("obstacle"); setAdmin(false); }}>VÒNG 2</button>
          <button className={module === "acceleration" ? "nav-module active" : "nav-module"} onClick={() => { setModule("acceleration"); setAdmin(false); }}>VÒNG 3</button>
          <button className="ghost-button" onClick={() => setAdmin((v) => !v)}>
            {admin ? "← Màn hình chơi" : `⚙ Quản trị ${isObstacle ? "Vượt chướng ngại vật" : isAcceleration ? "Tăng tốc" : "Khởi động"}`}
          </button>
        </div>
      </nav>

      {admin
        ? (isObstacle ? <ObstacleAdmin /> : isAcceleration ? <AccelerationAdmin /> : <WarmupAdmin />)
        : (isObstacle ? <ObstaclePage /> : isAcceleration ? <AccelerationPage /> : <WarmupPage teams={teams} />)}
    </div>
  );
}

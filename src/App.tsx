import { useState } from "react";
import { WarmupPage } from "./modules/warmup/pages/WarmupPage";
import { WarmupAdmin } from "./admin/warmup/WarmupAdmin";
import { ObstaclePage } from "./modules/obstacle/pages/ObstaclePage";
import { ObstacleAdmin } from "./admin/obstacle/ObstacleAdmin";
import { AccelerationPage } from "./modules/acceleration/pages/AccelerationPage";
import { AccelerationAdmin } from "./admin/acceleration/AccelerationAdmin";
import { FinishPage } from "./modules/finish/pages/FinishPage";
import { FinishAdmin } from "./admin/finish/FinishAdmin";
import { RankingAdmin } from "./admin/ranking/RankingAdmin";
import { useGameStore } from "./core/store/gameStore";

type Module =
  | "warmup"
  | "obstacle"
  | "acceleration"
  | "finish"
  | "ranking";

export default function App() {
  const [module, setModule] = useState<Module>("warmup");
  const [admin, setAdmin] = useState(false);

  const teams = useGameStore((state) => state.teams);

  const isObstacle = module === "obstacle";
  const isAcceleration = module === "acceleration";
  const isFinish = module === "finish";
  const isRanking = module === "ranking";

  const handleModuleChange = (nextModule: Module) => {
    setModule(nextModule);
    // QUAN TRỌNG: Khi chuyển module, luôn về màn hình chơi (admin = false)
    setAdmin(false);
  };

  const adminLabel = isFinish
    ? "Về đích"
    : isAcceleration
      ? "Tăng tốc"
      : isObstacle
        ? "Vượt chướng ngại vật"
        : isRanking
          ? "Xếp hạng"
          : "Khởi động";

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div>
          <strong>THE BANA CODE</strong>
          <span className="nav-subtitle">
            🌻HÀNH TRÌNH 19 NĂM
          </span>
        </div>

        <div className="nav-module-tabs">
          <button
            className={module === "warmup" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("warmup")}
          >
            KHỞI ĐỘNG
          </button>

          <button
            className={module === "obstacle" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("obstacle")}
          >
            VƯỢT CHƯỚNG NGẠI VẬT
          </button>

          <button
            className={module === "acceleration" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("acceleration")}
          >
            TĂNG TỐC
          </button>

          <button
            className={module === "finish" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("finish")}
          >
            VỀ ĐÍCH
          </button>

          <button
            className={module === "ranking" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("ranking")}
          >
            🏆 XẾP HẠNG
          </button>

          <button
            className="ghost-button"
            onClick={() => setAdmin((value) => !value)}
          >
            {admin
              ? "← Màn hình chơi"
              : `⚙ Quản trị ${adminLabel}`}
          </button>
        </div>
      </nav>

      {admin ? (
        isRanking ? (
          <RankingAdmin />
        ) : isFinish ? (
          <FinishAdmin />
        ) : isAcceleration ? (
          <AccelerationAdmin />
        ) : isObstacle ? (
          <ObstacleAdmin />
        ) : (
          <WarmupAdmin />
        )
      ) : isRanking ? (
        // Ranking không có màn hình chơi, chỉ có admin
        <RankingAdmin />
      ) : isFinish ? (
        <FinishPage />
      ) : isAcceleration ? (
        <AccelerationPage />
      ) : isObstacle ? (
        <ObstaclePage />
      ) : (
        <WarmupPage teams={teams} />
      )}
    </div>
  );
}

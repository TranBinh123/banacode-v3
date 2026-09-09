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
import logo from "./TheBanacode_Logo-Photoroom.png";

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
      {/* ===== SỬA LẠI NAV ===== */}
      <nav className="top-nav" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100px',              /* ← THÊM CHIỀU CAO CỐ ĐỊNH */
        padding: '0 24px',
        background: '#ffffff',
        borderBottom: '2px solid #e8e8e8',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div className="nav-brand" style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%'              /* Chiếm full chiều cao nav */
        }}>
          <img 
            src={logo}
            alt="THE BANA CODE" 
            style={{
              height: '100%',          /* Chiếm 100% chiều cao nav */
              width: 'auto',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        </div>

        <div className="nav-module-tabs" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <button
            className={module === "warmup" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("warmup")}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: module === "warmup" ? '#1a73e8' : 'transparent',
              color: module === "warmup" ? 'white' : '#666',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
          >
            KHỞI ĐỘNG
          </button>

          <button
            className={module === "obstacle" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("obstacle")}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: module === "obstacle" ? '#1a73e8' : 'transparent',
              color: module === "obstacle" ? 'white' : '#666',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
          >
            VƯỢT CHƯỚNG NGẠI VẬT
          </button>

          <button
            className={module === "acceleration" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("acceleration")}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: module === "acceleration" ? '#1a73e8' : 'transparent',
              color: module === "acceleration" ? 'white' : '#666',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
          >
            TĂNG TỐC
          </button>

          <button
            className={module === "finish" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("finish")}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: module === "finish" ? '#1a73e8' : 'transparent',
              color: module === "finish" ? 'white' : '#666',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
          >
            VỀ ĐÍCH
          </button>

          <button
            className={module === "ranking" ? "nav-module active" : "nav-module"}
            onClick={() => handleModuleChange("ranking")}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: module === "ranking" ? '#1a73e8' : 'transparent',
              color: module === "ranking" ? 'white' : '#666',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
          >
            🏆 XẾP HẠNG
          </button>

          <button
            className="ghost-button"
            onClick={() => setAdmin((value) => !value)}
            style={{
              padding: '8px 16px',
              border: '1px solid #ddd',
              background: 'transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#666',
              transition: 'all 0.2s'
            }}
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

import { useMemo, useState } from "react";
import { TEAM_NAMES, useGameStore } from "../../core/store/gameStore";
import type { QuestionSet, TeamQuestionSetMap } from "../../modules/warmup/types/warmup";
import { TEAM_IDS, useWarmupStore } from "../../modules/warmup/store/warmupStore";

export function WarmupAdmin() {
  const { questionSets, teamQuestionSetMap, saveMapping, addSet, updateSet, deleteSet } = useWarmupStore();
  const resetScores = useGameStore((s) => s.resetScores);
  const [selectedSetId, setSelectedSetId] = useState(questionSets[0]?.id ?? "");
  const selectedSet = questionSets.find((s) => s.id === selectedSetId);
  const [draftMapping, setDraftMapping] = useState<TeamQuestionSetMap>(teamQuestionSetMap);

  const duplicateIds = useMemo(() => {
    const ids = Object.values(draftMapping).filter(Boolean) as string[];
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  }, [draftMapping]);

  const mappingValid =
    TEAM_IDS.every((teamId) => Boolean(draftMapping[teamId])) &&
    duplicateIds.length === 0 &&
    TEAM_IDS.every((teamId) => {
      const set = questionSets.find((s) => s.id === draftMapping[teamId]);
      return Boolean(set && set.questions.length === 10);
    });

  const createSet = () => {
    const id = `set-${Date.now()}`;
    const newSet: QuestionSet = {
      id,
      name: `Bộ câu hỏi mới ${questionSets.length + 1}`,
      phase: "warmup",
      questions: Array.from({ length: 10 }, (_, index) => ({
        id: `${id}-q-${index + 1}`,
        setId: id,
        order: index + 1,
        question: "",
      })),
    };
    addSet(newSet);
    setSelectedSetId(id);
  };

  const saveSet = () => {
    if (!selectedSet) return;
    if (selectedSet.questions.length !== 10) {
      window.alert("Mỗi bộ câu hỏi phải có đúng 10 câu.");
      return;
    }
    updateSet(selectedSet);
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <div className="eyebrow">ADMIN • PART 1</div>
          <h1>Quản trị Khởi động</h1>
          <p>Quản lý bộ câu hỏi độc lập và phân công Đội ↔ Bộ câu hỏi.</p>
        </div>
        <div className="admin-header-actions">
          <button
            className="danger-button"
            onClick={() => {
              if (window.confirm("Reset toàn bộ điểm về 0 để test lại? Cấu hình bộ câu hỏi sẽ không bị xóa.")) {
                resetScores();
              }
            }}
          >
            ↻ RESET ĐIỂM TEST
          </button>
          <button className="primary-button" onClick={createSet}>+ TẠO BỘ CÂU HỎI</button>
        </div>
      </header>

      <section className="admin-card">
        <div className="section-label">1. QUẢN LÝ BỘ CÂU HỎI</div>
        <div className="set-tabs">
          {questionSets.map((set) => (
            <button
              key={set.id}
              className={set.id === selectedSetId ? "set-tab active" : "set-tab"}
              onClick={() => setSelectedSetId(set.id)}
            >
              {set.name} <span>{set.questions.length}/10</span>
            </button>
          ))}
        </div>

        {selectedSet && (
          <div className="editor">
            <div className="editor-toolbar">
              <input
                value={selectedSet.name}
                onChange={(e) => updateSet({ ...selectedSet, name: e.target.value })}
                aria-label="Tên bộ câu hỏi"
              />
              <button className="danger-button" onClick={() => {
                if (window.confirm("Xóa bộ câu hỏi này?")) {
                  deleteSet(selectedSet.id);
                  setSelectedSetId(questionSets.find((s) => s.id !== selectedSet.id)?.id ?? "");
                }
              }}>Xóa bộ</button>
            </div>

            <div className="question-editor-list">
              {selectedSet.questions.map((question, index) => (
                <label className="question-editor-row" key={question.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <textarea
                    value={question.question}
                    placeholder="Nhập nội dung câu hỏi..."
                    onChange={(e) => {
                      const questions = selectedSet.questions.map((q, i) =>
                        i === index ? { ...q, question: e.target.value } : q,
                      );
                      updateSet({ ...selectedSet, questions });
                    }}
                  />
                </label>
              ))}
            </div>

            <button className="primary-button" onClick={saveSet}>LƯU BỘ CÂU HỎI</button>
          </div>
        )}
      </section>

      <section className="admin-card">
        <div className="section-label">2. PHÂN CÔNG ĐỘI / BỘ CÂU HỎI</div>
        <p className="admin-help">Mỗi bộ chỉ được phân cho một đội. Bộ được phân phải đủ 10 câu.</p>

        <div className="mapping-table">
          {TEAM_IDS.map((teamId) => (
            <div className="mapping-row" key={teamId}>
              <strong>{TEAM_NAMES[teamId]}</strong>
              <select
                value={draftMapping[teamId] ?? ""}
                onChange={(e) => setDraftMapping((m) => ({ ...m, [teamId]: e.target.value || null }))}
              >
                <option value="">— Chưa phân công —</option>
                {questionSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name} ({set.questions.length}/10)
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {!mappingValid && (
          <div className="warning-box">
            Cấu hình chưa hợp lệ: cần đủ 4 đội, không trùng bộ và mỗi bộ được phân phải có đủ 10 câu.
          </div>
        )}
        {duplicateIds.length > 0 && (
          <div className="warning-box">Đang có bộ câu hỏi được phân cho nhiều đội.</div>
        )}

        <button className="primary-button" disabled={!mappingValid} onClick={() => saveMapping(draftMapping)}>
          LƯU PHÂN CÔNG
        </button>
      </section>
    </main>
  );
}

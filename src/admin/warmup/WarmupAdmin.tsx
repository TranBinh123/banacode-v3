import { useState } from "react";
import type { QuestionSet } from "../../modules/warmup/types/warmup";
import { useWarmupStore } from "../../modules/warmup/store/warmupStore";
import { useGameStore } from "../../core/store/gameStore";

export function WarmupAdmin() {
  const questionSets = useWarmupStore((state) => state.questionSets);
  const addSet = useWarmupStore((state) => state.addSet);
  const updateSet = useWarmupStore((state) => state.updateSet);
  const deleteSet = useWarmupStore((state) => state.deleteSet);
  const resetScores = useGameStore((state) => state.resetScores);

  const [selectedSetId, setSelectedSetId] = useState(questionSets[0]?.id ?? "");
  const selectedSet = questionSets.find((set) => set.id === selectedSetId);

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
    <main className="admin-page warmup-admin-page">
      <header className="admin-header">
        <div>
          <div className="eyebrow">ADMIN • VÒNG 1</div>

          <h1>Quản trị Khởi động</h1>

          <p>
            Quản lý các bộ câu hỏi. Khi thi, từng đội sẽ tự chọn một bộ câu hỏi
            còn trống trên màn hình chính; Admin không cần phân công Đội ↔ Bộ.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            className="danger-button"
            onClick={() => {
              if (
                window.confirm(
                  "Reset toàn bộ điểm về 0 để test lại? Cấu hình bộ câu hỏi sẽ không bị xóa.",
                )
              ) {
                resetScores();
              }
            }}
          >
            ↻ RESET ĐIỂM TEST
          </button>

          <button className="primary-button" onClick={createSet}>
            + TẠO BỘ CÂU HỎI
          </button>
        </div>
      </header>

      <section className="admin-card">
        <div className="section-label">QUẢN LÝ BỘ CÂU HỎI</div>

        <p className="admin-help">
          Có thể tạo nhiều bộ câu hỏi. Mỗi bộ dùng trong Vòng 1 phải có đúng
          10 câu.
        </p>

        <div className="set-tabs">
          {questionSets.map((set) => (
            <button
              key={set.id}
              className={
                set.id === selectedSetId
                  ? "set-tab active"
                  : "set-tab"
              }
              onClick={() => setSelectedSetId(set.id)}
            >
              {set.name}

              <span>{set.questions.length}/10</span>
            </button>
          ))}
        </div>

        {selectedSet && (
          <div className="editor">
            <div className="editor-toolbar">
              <input
                value={selectedSet.name}
                onChange={(event) =>
                  updateSet({
                    ...selectedSet,
                    name: event.target.value,
                  })
                }
                aria-label="Tên bộ câu hỏi"
              />

              <button
                className="danger-button"
                onClick={() => {
                  if (questionSets.length <= 1) {
                    window.alert(
                      "Phải giữ lại ít nhất một bộ câu hỏi.",
                    );
                    return;
                  }

                  if (window.confirm("Xóa bộ câu hỏi này?")) {
                    deleteSet(selectedSet.id);

                    const nextSet = questionSets.find(
                      (set) => set.id !== selectedSet.id,
                    );

                    setSelectedSetId(nextSet?.id ?? "");
                  }
                }}
              >
                XÓA BỘ
              </button>
            </div>

            <div className="question-editor-list">
              {selectedSet.questions.map((question, index) => (
                <label
                  className="question-editor-row"
                  key={question.id}
                >
                  <span>
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <textarea
                    value={question.question}
                    placeholder="Nhập nội dung câu hỏi..."
                    onChange={(event) => {
                      const questions =
                        selectedSet.questions.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  question:
                                    event.target.value,
                                }
                              : item,
                        );

                      updateSet({
                        ...selectedSet,
                        questions,
                      });
                    }}
                  />
                </label>
              ))}
            </div>

            <button
              className="primary-button"
              onClick={saveSet}
            >
              LƯU BỘ CÂU HỎI
            </button>
          </div>
        )}
      </section>

      <section className="admin-card warmup-admin-note-card">
        <div className="section-label">
          CÁCH VẬN HÀNH KHI THI
        </div>

        <div className="warmup-admin-flow">
          <div>
            <b>01</b>
            <span>Chọn đội</span>
          </div>

          <div>
            <b>02</b>
            <span>Đội chọn bộ câu hỏi</span>
          </div>

          <div>
            <b>03</b>
            <span>Thi 10 câu / 120 giây</span>
          </div>

          <div>
            <b>04</b>
            <span>Hoàn thành → đội tiếp theo</span>
          </div>
        </div>
      </section>
    </main>
  );
}

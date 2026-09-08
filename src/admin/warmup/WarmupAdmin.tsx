import { useState } from "react";
import { useGameStore } from "../../core/store/gameStore";
import type { QuestionSet } from "../../modules/warmup/types/warmup";
import { useWarmupStore } from "../../modules/warmup/store/warmupStore";

export function WarmupAdmin() {
  const {
    questionSets,
    addSet,
    updateSet,
    deleteSet,
  } = useWarmupStore();

  const resetScores =
    useGameStore(
      (state) => state.resetScores,
    );

  const [selectedSetId, setSelectedSetId] =
    useState(
      questionSets[0]?.id ?? "",
    );

  const selectedSet =
    questionSets.find(
      (set) =>
        set.id === selectedSetId,
    );

  const createSet = () => {
    const id = `set-${Date.now()}`;

    const newSet: QuestionSet = {
      id,
      name: `Bộ câu hỏi mới ${
        questionSets.length + 1
      }`,
      phase: "warmup",
      questions: Array.from(
        { length: 10 },
        (_, index) => ({
          id: `${id}-q-${index + 1}`,
          setId: id,
          order: index + 1,
          question: "",
        }),
      ),
    };

    addSet(newSet);
    setSelectedSetId(id);
  };

  const saveSet = () => {
    if (!selectedSet) return;

    if (
      selectedSet.questions.length !== 10
    ) {
      window.alert(
        "Mỗi bộ câu hỏi phải có đúng 10 câu.",
      );
      return;
    }

    updateSet(selectedSet);

    window.alert(
      "Đã lưu bộ câu hỏi.",
    );
  };

  const handleDeleteSet = () => {
    if (!selectedSet) return;

    if (
      questionSets.length <= 1
    ) {
      window.alert(
        "Phải giữ lại ít nhất một bộ câu hỏi.",
      );
      return;
    }

    if (
      !window.confirm(
        `Xóa "${selectedSet.name}"?`,
      )
    ) {
      return;
    }

    const remainingSets =
      questionSets.filter(
        (set) =>
          set.id !==
          selectedSet.id,
      );

    deleteSet(selectedSet.id);

    setSelectedSetId(
      remainingSets[0]?.id ?? "",
    );
  };

  return (
    <main className="admin-page warmup-admin-page">
      <header className="admin-header">
        <div>
          <div className="eyebrow">
            ADMIN • VÒNG 1
          </div>

          <h1>
            Quản trị Khởi động
          </h1>

          <p>
            Tạo và chỉnh sửa các bộ
            câu hỏi. Khi thi, đội sẽ
            tự chọn bộ câu hỏi còn
            trống trên màn hình chính.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            className="danger-button"
            onClick={() => {
              if (
                window.confirm(
                  "Reset toàn bộ điểm về 0 để test lại? Cấu hình câu hỏi sẽ không bị xóa.",
                )
              ) {
                resetScores();
              }
            }}
          >
            ↻ RESET ĐIỂM TEST
          </button>

          <button
            className="primary-button"
            onClick={createSet}
          >
            + TẠO BỘ CÂU HỎI
          </button>
        </div>
      </header>

      <section className="admin-card">
        <div className="section-label">
          NGÂN HÀNG CÂU HỎI
        </div>

        <p className="admin-help">
          Mỗi bộ sử dụng trong Vòng 1
          phải có đúng 10 câu. Không
          cần phân công đội tại đây.
        </p>

        <div className="set-tabs">
          {questionSets.map(
            (set) => (
              <button
                key={set.id}
                className={
                  set.id ===
                  selectedSetId
                    ? "set-tab active"
                    : "set-tab"
                }
                onClick={() =>
                  setSelectedSetId(
                    set.id,
                  )
                }
              >
                <span>
                  {set.name}
                </span>

                <small>
                  {set.questions.length}
                  /10
                </small>
              </button>
            ),
          )}
        </div>

        {selectedSet && (
          <div className="editor">
            <div className="editor-toolbar">
              <input
                value={
                  selectedSet.name
                }
                onChange={(event) =>
                  updateSet({
                    ...selectedSet,
                    name:
                      event.target.value,
                  })
                }
                aria-label="Tên bộ câu hỏi"
              />

              <button
                className="danger-button"
                onClick={
                  handleDeleteSet
                }
              >
                XÓA BỘ
              </button>
            </div>

            <div className="question-editor-list">
              {selectedSet.questions.map(
                (
                  question,
                  index,
                ) => (
                  <label
                    className="question-editor-row"
                    key={question.id}
                  >
                    <span>
                      {String(
                        index + 1,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </span>

                    <textarea
                      value={
                        question.question
                      }
                      placeholder="Nhập nội dung câu hỏi..."
                      onChange={(
                        event,
                      ) => {
                        const questions =
                          selectedSet.questions.map(
                            (
                              item,
                              itemIndex,
                            ) =>
                              itemIndex ===
                              index
                                ? {
                                    ...item,
                                    question:
                                      event
                                        .target
                                        .value,
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
                ),
              )}
            </div>

            <div className="warmup-admin-actions">
              <button
                className="primary-button"
                onClick={saveSet}
              >
                LƯU BỘ CÂU HỎI
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="admin-card warmup-admin-note-card">
        <div className="section-label">
          CÁCH VẬN HÀNH
        </div>

        <div className="warmup-admin-flow">
          <div>
            <b>01</b>
            <span>
              Chọn đội
            </span>
          </div>

          <div>
            <b>02</b>
            <span>
              Đội tự chọn bộ câu hỏi
            </span>
          </div>

          <div>
            <b>03</b>
            <span>
              Thi 10 câu / 120 giây
            </span>
          </div>

          <div>
            <b>04</b>
            <span>
              Đội tiếp theo
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

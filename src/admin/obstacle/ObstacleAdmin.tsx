import { useMemo, useState } from "react";
import { useObstacleStore } from "../../modules/obstacle/store/obstacleStore";
import type {
  ObstacleClue,
  ObstaclePuzzle,
} from "../../modules/obstacle/types/obstacle";

const sanitize = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const CELL_SIZE = 42;
const ROW_HEIGHT = 54;

export function ObstacleAdmin() {
  const {
    puzzles,
    addPuzzle,
    updatePuzzle,
    deletePuzzle,
  } = useObstacleStore();

  const [selectedId, setSelectedId] = useState(
    puzzles[0]?.id ?? "",
  );

  const puzzle = puzzles.find(
    (p) => p.id === selectedId,
  );

  const [dragId, setDragId] = useState<string | null>(
    null,
  );

  /*
   * Tính cột hàng dọc thực tế dựa trên tất cả
   * các hàng ngang.
   *
   * Mỗi hàng:
   *
   *   x + verticalIndex
   *
   * chính là vị trí ô giao với hàng dọc.
   *
   * Nếu tất cả các hàng được căn đúng,
   * các giá trị này sẽ bằng nhau.
   */
/*
 * Tất cả ô giao phải nằm trên cùng một cột.
 *
 * Mỗi hàng có:
 *
 *   x + verticalIndex = verticalColumn
 *
 * Vì vậy khi hiển thị, vị trí X của hàng
 * luôn được tính ngược từ cột giao chung.
 */
const verticalColumn = useMemo(() => {
  if (!puzzle?.clues.length) return 6;

  /*
   * Lấy vị trí giao hiện tại làm cơ sở.
   *
   * Đây chỉ là cột tham chiếu. Sau đó toàn bộ
   * hàng ngang sẽ được render theo:
   *
   *   verticalColumn - verticalIndex
   */
  const total = puzzle.clues.reduce(
    (sum, clue) =>
      sum + clue.x + clue.verticalIndex,
    0,
  );

  return Math.round(
    total / puzzle.clues.length,
  );
}, [puzzle]);

  const createPuzzle = () => {
    const id = `obstacle-${Date.now()}`;

    const next: ObstaclePuzzle = {
      id,
      name: `Bộ ô chữ ${puzzles.length + 1}`,
      phase: "obstacle",
      verticalAnswer: "",
      timeLimitSeconds: 60,
      horizontalPoints: 10,
      verticalPoints: 50,
      clues: [],
    };

    addPuzzle(next);
    setSelectedId(id);
  };

  const patch = (
    changes: Partial<ObstaclePuzzle>,
  ) => {
    if (!puzzle) return;

    updatePuzzle({
      ...puzzle,
      ...changes,
    });
  };

  const addClue = () => {
    if (!puzzle) return;

    const order = puzzle.clues.length + 1;

    /*
     * verticalIndex nội bộ vẫn là ZERO-BASED.
     *
     * Nhưng giao diện Admin hiển thị cho BTC
     * theo ONE-BASED:
     *
     * 1 = ô đầu tiên
     * 2 = ô thứ hai
     * 3 = ô thứ ba
     */
    const clue: ObstacleClue = {
      id: `${puzzle.id}-c-${Date.now()}`,
      order,
      question: "",
      answer: "",
      x: Math.max(
        0,
        verticalColumn,
      ),
      y: order,
      verticalIndex: 0,
    };

    updatePuzzle({
      ...puzzle,
      clues: [...puzzle.clues, clue],
    });
  };

  const updateClue = (
    id: string,
    changes: Partial<ObstacleClue>,
  ) => {
    if (!puzzle) return;

    updatePuzzle({
      ...puzzle,
      clues: puzzle.clues.map((clue) =>
        clue.id === id
          ? {
              ...clue,
              ...changes,
            }
          : clue,
      ),
    });
  };

  const removeClue = (id: string) => {
    if (!puzzle) return;

    updatePuzzle({
      ...puzzle,
      clues: puzzle.clues
        .filter((clue) => clue.id !== id)
        .map((clue, index) => ({
          ...clue,
          order: index + 1,
        })),
    });
  };
const moveClue = (
  id: string,
  dx: number,
  dy: number,
) => {
  if (!puzzle) return;

  const clue = puzzle.clues.find(
    (item) => item.id === id,
  );

  if (!clue) return;

  /*
   * ← / →:
   * Di chuyển TOÀN BỘ bảng theo chiều ngang.
   *
   * Như vậy trục dọc vẫn luôn thẳng hàng.
   */
  if (dx !== 0) {
    updatePuzzle({
      ...puzzle,
      clues: puzzle.clues.map((item) => ({
        ...item,
        x: Math.max(0, item.x + dx),
      })),
    });

    return;
  }

  /*
   * ↑ / ↓:
   * Chỉ di chuyển riêng hàng đang chọn theo Y.
   */
  if (dy !== 0) {
    updateClue(id, {
      y: Math.max(0, clue.y + dy),
    });
  }
};

  /*
   * Khi kéo một hàng lên hàng khác,
   * chỉ thay đổi Y để tránh vô tình phá
   * điểm giao.
   *
   * X vẫn được điều chỉnh bằng nút ← →
   * để BTC kiểm soát chính xác.
   */
  const handleDrop = (
    target: ObstacleClue,
  ) => {
    if (!dragId || dragId === target.id) return;

    const source = puzzle?.clues.find(
      (clue) => clue.id === dragId,
    );

    if (!source) return;

    updateClue(dragId, {
      y: target.y,
    });
  };

  if (!puzzle) {
    return (
      <main className="admin-page">
        <section className="admin-card">
          <button
            className="primary-button"
            onClick={createPuzzle}
          >
            + TẠO BỘ Ô CHỮ
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <div className="eyebrow">
            ADMIN • PART 2
          </div>

          <h1>Vượt chướng ngại vật</h1>

          <p>
            Thiết kế ô chữ bằng kéo thả. Bảng điểm
            dùng tổng điểm cộng dồn từ các phần trước.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            className="primary-button"
            onClick={createPuzzle}
          >
            + TẠO BỘ Ô CHỮ
          </button>
        </div>
      </header>

      {/* =========================
          1. BỘ Ô CHỮ
      ========================== */}

      <section className="admin-card">
        <div className="section-label">
          1. BỘ Ô CHỮ
        </div>

        <div className="set-tabs">
          {puzzles.map((item) => (
            <button
              key={item.id}
              className={
                item.id === selectedId
                  ? "set-tab active"
                  : "set-tab"
              }
              onClick={() =>
                setSelectedId(item.id)
              }
            >
              {item.name}

              <span>
                {item.clues.length} hàng ngang
              </span>
            </button>
          ))}
        </div>

        <div className="editor-toolbar">
          <input
            value={puzzle.name}
            onChange={(e) =>
              patch({
                name: e.target.value,
              })
            }
          />

          <button
            className="danger-button"
            onClick={() => {
              if (
                puzzles.length > 1 &&
                window.confirm(
                  "Xóa bộ ô chữ này?",
                )
              ) {
                deletePuzzle(puzzle.id);

                setSelectedId(
                  puzzles.find(
                    (p) =>
                      p.id !== puzzle.id,
                  )?.id ?? "",
                );
              }
            }}
          >
            Xóa bộ
          </button>
        </div>

        <div className="obstacle-settings-grid">
          <label>
            Ô chữ hàng dọc

            <input
              value={puzzle.verticalAnswer}
              onChange={(e) =>
                patch({
                  verticalAnswer:
                    e.target.value.toUpperCase(),
                })
              }
              placeholder="Ví dụ: BA NA HILLS"
            />
          </label>

          <label>
            Thời gian / câu (giây)

            <input
              type="number"
              min={5}
              max={600}
              value={
                puzzle.timeLimitSeconds
              }
              onChange={(e) =>
                patch({
                  timeLimitSeconds: Math.max(
                    5,
                    Number(e.target.value) ||
                      60,
                  ),
                })
              }
            />
          </label>

          <label>
            Điểm hàng ngang

            <input
              type="number"
              min={0}
              value={
                puzzle.horizontalPoints
              }
              onChange={(e) =>
                patch({
                  horizontalPoints: Math.max(
                    0,
                    Number(e.target.value) ||
                      0,
                  ),
                })
              }
            />
          </label>

          <label>
            Điểm hàng dọc

            <input
              type="number"
              min={0}
              value={
                puzzle.verticalPoints
              }
              onChange={(e) =>
                patch({
                  verticalPoints: Math.max(
                    0,
                    Number(e.target.value) ||
                      0,
                  ),
                })
              }
            />
          </label>
        </div>
      </section>

      {/* =========================
          2. THIẾT KẾ BẢNG Ô CHỮ
      ========================== */}

      <section className="admin-card">
        <div className="section-label">
          2. THIẾT KẾ BẢNG Ô CHỮ
        </div>

        <p className="admin-help">
        Kéo từng hàng ngang để thay đổi vị trí
theo chiều dọc. Dùng ↑ ↓ để thay đổi
vị trí từng hàng. Dùng ← → để di chuyển
toàn bộ bảng theo chiều ngang.
          <br />
          <strong>
            Vị trí giao được tính từ 1:
          </strong>{" "}
          số 1 là ô đầu tiên của đáp án, số 2
          là ô thứ hai...
        </p>

        <div className="obstacle-editor-canvas">
          {/* TRỤC HÀNG DỌC */}

          <div
            className="vertical-guide"
            style={{
              left: `${
                verticalColumn *
                  CELL_SIZE +
                10 +
                19
              }px`,
            }}
          />

          {puzzle.clues.map((clue) => {
            const letters = sanitize(
              clue.answer ||
                "NHẬP ĐÁP ÁN",
            )
              .replace(/ /g, "")
              .split("");

            return (
              <div
                key={clue.id}
                draggable
                className={`editor-clue ${
                  dragId === clue.id
                    ? "dragging"
                    : ""
                }`}
style={{
  /*
   * Căn hàng theo ô giao chung.
   *
   * Ví dụ:
   * verticalColumn = 10
   * verticalIndex = 3
   *
   * => hàng bắt đầu tại cột 7
   * => ô thứ 4 nằm đúng cột 10.
   */
  left:
    (verticalColumn -
      clue.verticalIndex) *
      CELL_SIZE +
    10,

  top:
    clue.y *
      ROW_HEIGHT +
    10,
}}
                onDragStart={() =>
                  setDragId(clue.id)
                }
                onDragEnd={() =>
                  setDragId(null)
                }
                onDragOver={(e) =>
                  e.preventDefault()
                }
                onDrop={() =>
                  handleDrop(clue)
                }
              >
                <span className="editor-clue-order">
                  {String(
                    clue.order,
                  ).padStart(2, "0")}
                </span>

                <div className="clue-cells">
                  {letters.map(
                    (char, index) => (
                      <span
                        key={`${clue.id}-${index}`}
                        className={
                          index ===
                          clue.verticalIndex
                            ? "cross-cell"
                            : ""
                        }
                      >
                        {char}
                      </span>
                    ),
                  )}
                </div>
              </div>
            );
          })}

          {puzzle.clues.length ===
            0 && (
            <div className="canvas-empty">
              Chưa có hàng ngang. Bấm
              “+ THÊM HÀNG NGANG”.
            </div>
          )}
        </div>

        {/* =========================
            DANH SÁCH CÂU
        ========================== */}

        <div className="obstacle-clue-list">
          {puzzle.clues.map((clue) => (
            <article
              className="obstacle-clue-editor"
              key={clue.id}
            >
              <div className="clue-number">
                {String(
                  clue.order,
                ).padStart(2, "0")}
              </div>

              <div className="clue-fields">
                <textarea
                  value={clue.question}
                  onChange={(e) =>
                    updateClue(
                      clue.id,
                      {
                        question:
                          e.target.value,
                      },
                    )
                  }
                  placeholder="Câu hỏi hàng ngang..."
                />

                <input
                  value={clue.answer}
                  onChange={(e) =>
                    updateClue(
                      clue.id,
                      {
                        answer:
                          e.target.value.toUpperCase(),
                      },
                    )
                  }
                  placeholder="ĐÁP ÁN"
                />
              </div>

              {/* =========================
                  VỊ TRÍ GIAO - HIỂN THỊ 1-BASED
              ========================== */}

              <label>
                Vị trí giao

                <input
                  type="number"
                  min={1}
                  max={Math.max(
                    1,
                    sanitize(
                      clue.answer,
                    ).replace(
                      / /g,
                      "",
                    ).length,
                  )}
                  value={
                    clue.verticalIndex + 1
                  }
                  onChange={(e) => {
                    const answerLength =
                      sanitize(
                        clue.answer,
                      )
                        .replace(
                          / /g,
                          "",
                        )
                        .length;

                    const position =
                      Math.max(
                        1,
                        Math.min(
                          answerLength ||
                            1,
                          Number(
                            e.target.value,
                          ) || 1,
                        ),
                      );

                    /*
                     * UI: 1-based
                     * CORE: 0-based
                     */
                    updateClue(
                      clue.id,
                      {
                        verticalIndex:
                          position - 1,
                      },
                    );
                  }}
                />

                <small className="cross-position-preview">
                  {clue.answer
                    ? `Ô ${clue.verticalIndex + 1}: ${
                        sanitize(
                          clue.answer,
                        )
                          .replace(
                            / /g,
                            "",
                          )
                          .charAt(
                            clue.verticalIndex,
                          ) || "?"
                      }`
                    : "Chưa có đáp án"}
                </small>
              </label>

              <div className="move-buttons">
                <button
                  onClick={() =>
                    moveClue(
                      clue.id,
                      -1,
                      0,
                    )
                  }
                >
                  ←
                </button>

                <button
                  onClick={() =>
                    moveClue(
                      clue.id,
                      0,
                      -1,
                    )
                  }
                >
                  ↑
                </button>

                <button
                  onClick={() =>
                    moveClue(
                      clue.id,
                      0,
                      1,
                    )
                  }
                >
                  ↓
                </button>

                <button
                  onClick={() =>
                    moveClue(
                      clue.id,
                      1,
                      0,
                    )
                  }
                >
                  →
                </button>
              </div>

              <button
                className="danger-button"
                onClick={() =>
                  removeClue(clue.id)
                }
              >
                Xóa
              </button>
            </article>
          ))}
        </div>

        <button
          className="primary-button"
          onClick={addClue}
        >
          + THÊM HÀNG NGANG
        </button>
      </section>
    </main>
  );
}

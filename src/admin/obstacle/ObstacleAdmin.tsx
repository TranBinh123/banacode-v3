import { useMemo, useState } from "react";
import { useObstacleStore } from "../../modules/obstacle/store/obstacleStore";
import type { ObstacleClue, ObstaclePuzzle } from "../../modules/obstacle/types/obstacle";

const sanitize = (value: string) => value.replace(/\s+/g, " ").trim();

export function ObstacleAdmin() {
  const { puzzles, addPuzzle, updatePuzzle, deletePuzzle } = useObstacleStore();
  const [selectedId, setSelectedId] = useState(puzzles[0]?.id ?? "");
  const puzzle = puzzles.find((p) => p.id === selectedId);
  const [dragId, setDragId] = useState<string | null>(null);

  const verticalCells = useMemo(() => {
    if (!puzzle) return [];
    return puzzle.clues.map((clue) => ({ clue, x: clue.x + clue.verticalIndex, y: clue.y }));
  }, [puzzle]);

  const createPuzzle = () => {
    const id = `obstacle-${Date.now()}`;
    const next: ObstaclePuzzle = { id, name: `Bộ ô chữ ${puzzles.length + 1}`, phase: "obstacle", verticalAnswer: "", timeLimitSeconds: 60, horizontalPoints: 10, verticalPoints: 50, clues: [] };
    addPuzzle(next);
    setSelectedId(id);
  };

  const patch = (changes: Partial<ObstaclePuzzle>) => puzzle && updatePuzzle({ ...puzzle, ...changes });

  const addClue = () => {
    if (!puzzle) return;
    const order = puzzle.clues.length + 1;
    const clue: ObstacleClue = { id: `${puzzle.id}-c-${Date.now()}`, order, question: "", answer: "", x: 4, y: order, verticalIndex: 0 };
    updatePuzzle({ ...puzzle, clues: [...puzzle.clues, clue] });
  };

  const updateClue = (id: string, changes: Partial<ObstacleClue>) => {
    if (!puzzle) return;
    updatePuzzle({ ...puzzle, clues: puzzle.clues.map((c) => c.id === id ? { ...c, ...changes } : c) });
  };

  const removeClue = (id: string) => {
    if (!puzzle) return;
    updatePuzzle({ ...puzzle, clues: puzzle.clues.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i + 1 })) });
  };

  const moveClue = (id: string, dx: number, dy: number) => {
    const clue = puzzle?.clues.find((c) => c.id === id);
    if (clue) updateClue(id, { x: Math.max(0, clue.x + dx), y: Math.max(0, clue.y + dy) });
  };

  if (!puzzle) {
    return <main className="admin-page"><section className="admin-card"><button className="primary-button" onClick={createPuzzle}>+ TẠO BỘ Ô CHỮ</button></section></main>;
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><div className="eyebrow">ADMIN • PART 2</div><h1>Vượt chướng ngại vật</h1><p>Thiết kế ô chữ bằng kéo thả. Bảng điểm dùng tổng điểm cộng dồn từ các phần trước.</p></div>
        <div className="admin-header-actions"><button className="primary-button" onClick={createPuzzle}>+ TẠO BỘ Ô CHỮ</button></div>
      </header>

      <section className="admin-card">
        <div className="section-label">1. BỘ Ô CHỮ</div>
        <div className="set-tabs">{puzzles.map((item) => <button key={item.id} className={item.id === selectedId ? "set-tab active" : "set-tab"} onClick={() => setSelectedId(item.id)}>{item.name}<span>{item.clues.length} hàng ngang</span></button>)}</div>
        <div className="editor-toolbar"><input value={puzzle.name} onChange={(e) => patch({ name: e.target.value })} /><button className="danger-button" onClick={() => { if (puzzles.length > 1 && window.confirm("Xóa bộ ô chữ này?")) { deletePuzzle(puzzle.id); setSelectedId(puzzles.find((p) => p.id !== puzzle.id)?.id ?? ""); } }}>Xóa bộ</button></div>
        <div className="obstacle-settings-grid">
          <label>Ô chữ hàng dọc<input value={puzzle.verticalAnswer} onChange={(e) => patch({ verticalAnswer: e.target.value.toUpperCase() })} placeholder="Ví dụ: BA NA HILLS" /></label>
          <label>Thời gian / câu (giây)<input type="number" min={5} max={600} value={puzzle.timeLimitSeconds} onChange={(e) => patch({ timeLimitSeconds: Math.max(5, Number(e.target.value) || 60) })} /></label>
          <label>Điểm hàng ngang<input type="number" min={0} value={puzzle.horizontalPoints} onChange={(e) => patch({ horizontalPoints: Math.max(0, Number(e.target.value) || 0) })} /></label>
          <label>Điểm hàng dọc<input type="number" min={0} value={puzzle.verticalPoints} onChange={(e) => patch({ verticalPoints: Math.max(0, Number(e.target.value) || 0) })} /></label>
        </div>
      </section>

      <section className="admin-card">
        <div className="section-label">2. THIẾT KẾ BẢNG Ô CHỮ</div>
        <p className="admin-help">Kéo trực tiếp từng hàng ngang trên canvas. Hoặc dùng các nút ← ↑ ↓ → để căn chỉnh chính xác. `Vị trí giao` là ô của hàng ngang giao với hàng dọc.</p>
        <div className="obstacle-editor-canvas">
          <div className="vertical-guide" style={{ left: `${Math.max(0, (verticalCells[0]?.x ?? 0) * 42 + 10)}px` }} />
          {puzzle.clues.map((clue) => (
            <div key={clue.id} draggable className={`editor-clue ${dragId === clue.id ? "dragging" : ""}`} style={{ left: clue.x * 42 + 10, top: clue.y * 54 + 10 }} onDragStart={() => setDragId(clue.id)} onDragEnd={() => setDragId(null)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) { const source = puzzle.clues.find((c) => c.id === dragId); if (source) updateClue(dragId, { x: Math.max(0, clue.x), y: Math.max(0, clue.y) }); } }}>
              <span className="editor-clue-order">{String(clue.order).padStart(2, "0")}</span>
              <div className="clue-cells">{sanitize(clue.answer || "NHẬP ĐÁP ÁN").replace(/ /g, "").split("").map((char, i) => <span key={`${clue.id}-${i}`} className={i === clue.verticalIndex ? "cross-cell" : ""}>{char}</span>)}</div>
            </div>
          ))}
          {puzzle.clues.length === 0 && <div className="canvas-empty">Chưa có hàng ngang. Bấm “+ THÊM HÀNG NGANG”.</div>}
        </div>

        <div className="obstacle-clue-list">
          {puzzle.clues.map((clue) => (
            <article className="obstacle-clue-editor" key={clue.id}>
              <div className="clue-number">{String(clue.order).padStart(2, "0")}</div>
              <div className="clue-fields">
                <textarea value={clue.question} onChange={(e) => updateClue(clue.id, { question: e.target.value })} placeholder="Câu hỏi hàng ngang..." />
                <input value={clue.answer} onChange={(e) => updateClue(clue.id, { answer: e.target.value.toUpperCase() })} placeholder="ĐÁP ÁN" />
              </div>
              <label>Vị trí giao<input type="number" min={0} value={clue.verticalIndex} onChange={(e) => updateClue(clue.id, { verticalIndex: Math.max(0, Number(e.target.value) || 0) })} /></label>
              <div className="move-buttons"><button onClick={() => moveClue(clue.id, -1, 0)}>←</button><button onClick={() => moveClue(clue.id, 0, -1)}>↑</button><button onClick={() => moveClue(clue.id, 0, 1)}>↓</button><button onClick={() => moveClue(clue.id, 1, 0)}>→</button></div>
              <button className="danger-button" onClick={() => removeClue(clue.id)}>Xóa</button>
            </article>
          ))}
        </div>
        <button className="primary-button" onClick={addClue}>+ THÊM HÀNG NGANG</button>
      </section>
    </main>
  );
}

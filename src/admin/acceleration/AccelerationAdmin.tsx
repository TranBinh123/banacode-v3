import { useAccelerationStore } from "../../modules/acceleration/store/accelerationStore";

export function AccelerationAdmin() {
  const { config, setConfig, addQuestion, updateQuestion, deleteQuestion } = useAccelerationStore();

  return (
    <main className="admin-page acceleration-admin">
      <header className="admin-header"><div><div className="eyebrow">QUẢN TRỊ • VÒNG 3</div><h1>TĂNG TỐC</h1><p>BTC chủ động thêm/bớt hình ảnh. Chỉ cần URL ảnh và đáp án.</p></div><button className="primary-button" onClick={addQuestion}>＋ THÊM CÂU</button></header>
      <section className="admin-card">
        <div className="acceleration-admin-settings">
          <label>Tên vòng<input value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} /></label>
          <label>Thời gian / câu (giây)<input type="number" min={5} max={600} value={config.timeLimitSeconds} onChange={(e) => setConfig({ ...config, timeLimitSeconds: Math.max(5, Number(e.target.value) || 5) })} /></label>
          <label>Điểm trả lời đúng<input type="number" min={1} value={config.points} onChange={(e) => setConfig({ ...config, points: Math.max(1, Number(e.target.value) || 1) })} /></label>
        </div>
      </section>

      <section className="acceleration-question-list">
        {config.questions.map((question) => (
          <article className="admin-card acceleration-question-editor" key={question.id}>
            <div className="question-editor-head"><div className="question-number">CÂU {String(question.order).padStart(2, "0")}</div><button className="danger-button" onClick={() => deleteQuestion(question.id)} disabled={config.questions.length <= 1}>XÓA CÂU</button></div>
            <label>Link hình ảnh<input value={question.imageUrl} placeholder="https://..." onChange={(e) => updateQuestion(question.id, { imageUrl: e.target.value })} /></label>
            {question.imageUrl && <div className="admin-image-preview"><img src={question.imageUrl} alt={`Preview câu ${question.order}`} /></div>}
            <label>Đáp án<input value={question.answer} placeholder="Nhập đáp án ngắn gọn" onChange={(e) => updateQuestion(question.id, { answer: e.target.value })} /></label>
          </article>
        ))}
      </section>
    </main>
  );
}

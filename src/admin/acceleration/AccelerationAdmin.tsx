import { useMemo, useState } from "react";
import { useAccelerationStore } from "../../modules/acceleration/store/accelerationStore";
import { IMAGE_LIBRARY } from "../../modules/acceleration/data/imageLibrary";

export function AccelerationAdmin() {
  const {
    config,
    setConfig,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  } = useAccelerationStore();

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const filteredImages = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return IMAGE_LIBRARY;
    }

    return IMAGE_LIBRARY.filter((image) =>
      image.toLowerCase().includes(keyword)
    );
  }, [searchText]);

  const openImageLibrary = (questionId: string) => {
    setActiveQuestionId(questionId);
    setSearchText("");
    setLibraryOpen(true);
  };

  const closeImageLibrary = () => {
    setLibraryOpen(false);
    setActiveQuestionId(null);
    setSearchText("");
  };

  const selectImage = (imageUrl: string) => {
    if (!activeQuestionId) return;

    updateQuestion(activeQuestionId, {
      imageUrl,
    });

    closeImageLibrary();
  };

  return (
    <main className="admin-page acceleration-admin">
      <header className="admin-header">
        <div>
          <div className="eyebrow">QUẢN TRỊ • VÒNG 3</div>

          <h1>TĂNG TỐC</h1>

          <p>
            BTC chủ động thêm/bớt câu hỏi và lựa chọn hình ảnh từ thư viện
            <code>public/</code>.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={addQuestion}
        >
          ＋ THÊM CÂU
        </button>
      </header>

      <section className="admin-card">
        <div className="acceleration-admin-settings">
          <label>
            Tên vòng
            <input
              value={config.name}
              onChange={(e) =>
                setConfig({
                  ...config,
                  name: e.target.value,
                })
              }
            />
          </label>

          <label>
            Thời gian / câu (giây)
            <input
              type="number"
              min={5}
              max={600}
              value={config.timeLimitSeconds}
              onChange={(e) =>
                setConfig({
                  ...config,
                  timeLimitSeconds: Math.max(
                    5,
                    Number(e.target.value) || 5
                  ),
                })
              }
            />
          </label>

          <label>
            Điểm trả lời đúng
            <input
              type="number"
              min={1}
              value={config.points}
              onChange={(e) =>
                setConfig({
                  ...config,
                  points: Math.max(
                    1,
                    Number(e.target.value) || 1
                  ),
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="acceleration-question-list">
        {config.questions.map((question) => (
          <article
            className="admin-card acceleration-question-editor"
            key={question.id}
          >
            <div className="question-editor-head">
              <div className="question-number">
                CÂU {String(question.order).padStart(2, "0")}
              </div>

              <button
                className="danger-button"
                onClick={() => deleteQuestion(question.id)}
                disabled={config.questions.length <= 1}
              >
                XÓA CÂU
              </button>
            </div>

            <div className="acceleration-image-selector">
              <div className="acceleration-field-title">
                HÌNH ẢNH CÂU HỎI
              </div>

              <button
                type="button"
                className="primary-button acceleration-library-button"
                onClick={() => openImageLibrary(question.id)}
              >
                📚 CHỌN ẢNH TỪ THƯ VIỆN
              </button>

              {question.imageUrl && (
                <div className="selected-image-info">
                  <span>Ảnh đang chọn:</span>
                  <strong>{question.imageUrl}</strong>
                </div>
              )}

              <label className="acceleration-url-field">
                Hoặc nhập đường dẫn ảnh
                <input
                  value={question.imageUrl}
                  placeholder="/ten-anh.png"
                  onChange={(e) =>
                    updateQuestion(question.id, {
                      imageUrl: e.target.value,
                    })
                  }
                />
              </label>

              {question.imageUrl && (
                <div className="admin-image-preview">
                  <img
                    src={question.imageUrl}
                    alt={`Preview câu ${question.order}`}
                  />
                </div>
              )}
            </div>

            <label>
              Đáp án
              <input
                value={question.answer}
                placeholder="Nhập đáp án ngắn gọn"
                onChange={(e) =>
                  updateQuestion(question.id, {
                    answer: e.target.value,
                  })
                }
              />
            </label>
          </article>
        ))}
      </section>

      {libraryOpen && (
        <div
          className="image-library-backdrop"
          onMouseDown={closeImageLibrary}
        >
          <div
            className="image-library-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="image-library-header">
              <div>
                <div className="eyebrow">
                  THƯ VIỆN • PUBLIC
                </div>

                <h2>CHỌN HÌNH ẢNH</h2>

                <p>
                  Chọn một hình ảnh có sẵn trong thư mục{" "}
                  <code>public/</code>.
                </p>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={closeImageLibrary}
                aria-label="Đóng thư viện"
              >
                ✕
              </button>
            </div>

            <div className="image-library-toolbar">
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="🔎 Tìm theo tên hình ảnh..."
                autoFocus
              />

              <span>
                {filteredImages.length} / {IMAGE_LIBRARY.length} ảnh
              </span>
            </div>

            {filteredImages.length > 0 ? (
              <div className="image-library-grid">
                {filteredImages.map((imageUrl) => {
                  const isSelected =
                    config.questions.find(
                      (question) =>
                        question.id === activeQuestionId
                    )?.imageUrl === imageUrl;

                  const fileName =
                    imageUrl.split("/").pop() || imageUrl;

                  return (
                    <button
                      type="button"
                      className={`image-library-item ${
                        isSelected ? "selected" : ""
                      }`}
                      key={imageUrl}
                      onClick={() => selectImage(imageUrl)}
                    >
                      <div className="image-library-thumbnail">
                        <img
                          src={imageUrl}
                          alt={fileName}
                        />
                      </div>

                      <div className="image-library-filename">
                        {fileName}
                      </div>

                      {isSelected && (
                        <div className="image-library-selected">
                          ✓ ĐANG CHỌN
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="image-library-empty">
                <div>🖼️</div>
                <strong>Không tìm thấy hình ảnh</strong>
                <span>
                  Hãy thử từ khóa khác.
                </span>
              </div>
            )}

            <div className="image-library-footer">
              <span>
                Hình ảnh được tự động lấy từ <code>public/</code>
              </span>

              <button
                type="button"
                className="secondary-button"
                onClick={closeImageLibrary}
              >
                ĐÓNG
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

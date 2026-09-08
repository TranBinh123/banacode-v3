import { useFinishStore } from "../../modules/finish/store/finishStore";

export function FinishAdmin() {
  const packages = useFinishStore(
    (state) => state.packages,
  );

  const updatePackage = useFinishStore(
    (state) => state.updatePackage,
  );

  const updateQuestion = useFinishStore(
    (state) => state.updateQuestion,
  );

  return (
    <section className="finish-admin">
      <div className="finish-admin-header">
        <div>
          <div className="finish-kicker">
            THIẾT LẬP VÒNG 4
          </div>

          <h1>VỀ ĐÍCH</h1>

          <p>
            Tạo và chỉnh sửa 4 kho câu hỏi cho Vòng 4.
            Sau khi thiết lập, toàn bộ phần điều khiển
            trận đấu sẽ thực hiện tại màn hình Về đích.
          </p>
        </div>
      </div>

      <div className="finish-question-bank">
        {packages.map((pkg, packageIndex) => (
          <article
            key={pkg.id}
            className="finish-question-bank-card"
          >
            <div className="finish-question-bank-header">
              <div>
                <span className="finish-kicker">
                  KHO {packageIndex + 1}
                </span>

                <h2>{pkg.label}</h2>
              </div>

              <span className="finish-question-count">
                5 CÂU HỎI
              </span>
            </div>

            <div className="finish-package-name-field">
              <label>
                TÊN BỘ CÂU HỎI
              </label>

              <input
                type="text"
                value={pkg.label}
                onChange={(event) =>
                  updatePackage(pkg.id, {
                    label: event.target.value,
                  })
                }
                placeholder={`GÓI ${packageIndex + 1}`}
              />
            </div>

            <div className="finish-admin-question-list">
              {pkg.questions.map(
                (question, questionIndex) => {
                  const isVideo =
                    question.isVideo;

                  return (
                    <div
                      key={question.id}
                      className="finish-admin-question"
                    >
                      <div className="finish-admin-question-header">
                        <div className="finish-admin-question-number">
                          CÂU {questionIndex + 1}
                        </div>

                        {questionIndex === 4 && (
                          <span className="finish-default-video">
                            VIDEO MẶC ĐỊNH
                          </span>
                        )}
                      </div>

                      <div className="finish-admin-field">
                        <label>
                          NỘI DUNG CÂU HỎI
                        </label>

                        <textarea
                          value={question.text}
                          onChange={(event) =>
                            updateQuestion(
                              pkg.id,
                              questionIndex,
                              {
                                text: event.target.value,
                              },
                            )
                          }
                          placeholder="Nhập nội dung câu hỏi..."
                          rows={3}
                        />
                      </div>

                      <div className="finish-admin-field">
                        <label>
                          ĐÁP ÁN THAM KHẢO
                        </label>

                        <textarea
                          value={question.answer}
                          onChange={(event) =>
                            updateQuestion(
                              pkg.id,
                              questionIndex,
                              {
                                answer:
                                  event.target.value,
                              },
                            )
                          }
                          placeholder="Nhập đáp án để MC/Kỹ thuật đối chiếu..."
                          rows={2}
                        />
                      </div>

                      <div className="finish-admin-video-toggle">
                        <label className="finish-switch">
                          <input
                            type="checkbox"
                            checked={isVideo}
                            onChange={(event) =>
                              updateQuestion(
                                pkg.id,
                                questionIndex,
                                {
                                  isVideo:
                                    event.target.checked,
                                },
                              )
                            }
                          />

                          <span className="finish-switch-slider" />
                        </label>

                        <div>
                          <strong>
                            Câu hỏi Video
                          </strong>

                          <small>
                            Bật nếu câu hỏi sử dụng
                            video YouTube.
                          </small>
                        </div>
                      </div>

                      {isVideo && (
                        <div className="finish-admin-field">
                          <label>
                            YOUTUBE URL
                          </label>

                          <input
                            type="url"
                            value={
                              question.youtubeUrl
                            }
                            onChange={(event) =>
                              updateQuestion(
                                pkg.id,
                                questionIndex,
                                {
                                  youtubeUrl:
                                    event.target.value,
                                },
                              )
                            }
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="finish-admin-footer">
        <span>
          Hệ thống tự động lưu nội dung câu hỏi.
        </span>

        <strong>
          4 KHO × 5 CÂU = 20 CÂU HỎI
        </strong>
      </div>
    </section>
  );
}

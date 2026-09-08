import { useState, useEffect } from "react";
import { useFinishStore } from "../store/finishStore";
import { useGameStore } from "../../../core/store/gameStore";
import type { TeamId } from "../../../core/types/game";

const youtubeEmbedUrl = (url: string) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
    }
  } catch {
    return "";
  }
  return "";
};

export function FinishPage() {
  const finish = useFinishStore();
  const teams = useGameStore((state) => state.teams);
  const addScore = useGameStore((state) => state.addScore);

  const [pendingTeamId, setPendingTeamId] = useState<TeamId>("team-1");
  const [pendingPackageId, setPendingPackageId] = useState<string>("package-1");

  // Xử lý bộ đếm thời gian
  useEffect(() => {
    if (!finish.isTimerRunning) return;
    const interval = setInterval(() => {
      finish.tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [finish.isTimerRunning, finish.tickTimer]);

  const currentPkg = finish.packages.find((p) => p.id === finish.currentPackageId);
  const currentQuestion = currentPkg?.questions[finish.currentQuestionIndex];

  // Xử lý Chọn gói
  const handleSelectPackage = () => {
    finish.selectPackage(pendingTeamId, pendingPackageId);
  };

  // Cập nhật điểm lên Bảng điểm tổng (Truyền đúng 3 tham số: teamId, points, reason)
  const handleMarkCorrect = () => {
    if (!finish.currentTeamId || !currentQuestion) return;
    const pts = finish.starActive ? currentQuestion.points * 2 : currentQuestion.points;
    addScore(finish.currentTeamId, pts, "Trả lời đúng câu hỏi Về đích");
    finish.markCorrect();
  };

  const handleMarkWrong = () => {
    if (!finish.currentTeamId || !currentQuestion) return;
    if (finish.starActive) {
      addScore(finish.currentTeamId, -currentQuestion.points, "Trừ điểm Ngôi sao hy vọng");
    }
    finish.markWrong();
  };

  const handleStealCorrect = () => {
    if (!finish.selectedStealTeamId || !currentQuestion) return;
    addScore(finish.selectedStealTeamId, currentQuestion.points, "Cướp điểm thành công");
    finish.markStealCorrect();
  };

  const handleStealWrong = () => {
    if (!finish.selectedStealTeamId || !currentQuestion) return;
    addScore(finish.selectedStealTeamId, -Math.floor(currentQuestion.points / 2), "Trừ điểm cướp sai");
    finish.markStealWrong();
  };

  if (finish.status === "selection") {
    return (
      <div className="p-6 max-w-4xl mx-auto text-white">
        <h1 className="text-3xl font-bold mb-6 text-center text-yellow-400">VỀ ĐÍCH - CHỌN GÓI CÂU HỎI</h1>
        
        <div className="bg-slate-800 p-6 rounded-lg mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div>
            <label className="block text-sm font-medium mb-1">Chọn Đội Thi:</label>
            <select 
              value={pendingTeamId} 
              onChange={(e) => setPendingTeamId(e.target.value as TeamId)}
              className="bg-slate-700 p-2 rounded text-white border border-slate-600"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Chọn Gói Câu Hỏi:</label>
            <select 
              value={pendingPackageId} 
              onChange={(e) => setPendingPackageId(e.target.value)}
              className="bg-slate-700 p-2 rounded text-white border border-slate-600"
            >
              {finish.packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id} disabled={pkg.selectedBy !== null}>
                  {pkg.label} {pkg.selectedBy ? `(Đã chọn)` : ''}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleSelectPackage}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded shadow transition"
          >
            Xác Nhận Chọn
          </button>
        </div>
      </div>
    );
  }

  if (finish.status === "finished") {
    return (
      <div className="p-6 text-center text-white">
        <h1 className="text-4xl font-bold text-green-400 mb-4">PHẦN THI VỀ ĐÍCH ĐÃ HOÀN THÀNH!</h1>
        <button 
          onClick={finish.resetRound} 
          className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded font-bold"
        >
          Reset Vòng Thi
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto text-white">
      <div className="flex justify-between items-center mb-6 bg-slate-800 p-4 rounded-lg">
        <div>
          <span className="text-gray-400">Đội đang thi: </span>
          <span className="text-xl font-bold text-yellow-300">
            {teams.find(t => t.id === finish.currentTeamId)?.name}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Câu hỏi: </span>
          <span className="text-xl font-bold">
            {(finish.currentQuestionIndex || 0) + 1} / {currentPkg?.questions.length || 5}
          </span>
        </div>
      </div>

      {finish.questionPhase === "intro" && (
        <div className="text-center bg-slate-800 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">
            Câu hỏi {finish.currentQuestionIndex + 1}: Mức độ{" "}
            <span className="uppercase text-yellow-400">{currentQuestion?.difficulty}</span> ({currentQuestion?.points} điểm)
          </h2>
          <button 
            onClick={finish.startQuestion}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 text-lg font-bold rounded"
          >
            Bắt Đầu Câu Hỏi
          </button>
        </div>
      )}

      {finish.questionPhase === "star_decision" && (
        <div className="text-center bg-slate-800 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-yellow-400">BẠN CÓ MUỐN CHỌN NGÔI SAO HY VỌNG?</h2>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => finish.decideStar(true)}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded"
            >
              CÓ (Dùng Ngôi Sao Hy Vọng)
            </button>
            <button 
              onClick={() => finish.decideStar(false)}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-500 font-bold rounded"
            >
              KHÔNG
            </button>
          </div>
        </div>
      )}

      {(finish.questionPhase === "playing" || finish.questionPhase === "steal" || finish.questionPhase === "resolved") && (
        <div className="bg-slate-800 p-6 rounded-lg space-y-6">
          <div className="flex justify-between items-center border-b border-slate-700 pb-4">
            <div className="text-lg font-semibold">
              Điểm: <span className="text-yellow-400">{currentQuestion?.points}</span> 
              {finish.starActive && <span className="ml-2 text-yellow-300 font-bold">🌟 [Ngôi Sao Hy Vọng]</span>}
            </div>
            <div className={`text-3xl font-mono font-bold ${finish.timerSeconds <= 5 ? "text-red-500" : "text-green-400"}`}>
              ⏱️ {finish.timerSeconds}s
            </div>
          </div>

          <div className="text-xl font-medium min-h-[100px] bg-slate-900 p-4 rounded">
            {currentQuestion?.text || "Chưa có nội dung câu hỏi"}
          </div>

          {currentQuestion?.isVideo && currentQuestion.youtubeUrl && (
            <div className="aspect-video w-full max-w-2xl mx-auto rounded overflow-hidden">
              <iframe 
                className="w-full h-full" 
                src={youtubeEmbedUrl(currentQuestion.youtubeUrl)} 
                title="Youtube video"
                allowFullScreen
              />
            </div>
          )}

          {finish.questionPhase === "playing" && (
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              {!finish.isTimerRunning && (
                <button 
                  onClick={finish.startTimer} 
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded"
                >
                  Bắt đầu đếm giờ
                </button>
              )}
              <button 
                onClick={handleMarkCorrect} 
                className="px-6 py-2 bg-green-600 hover:bg-green-500 font-bold rounded"
              >
                Trả Lời Đúng
              </button>
              <button 
                onClick={handleMarkWrong} 
                className="px-6 py-2 bg-red-600 hover:bg-red-500 font-bold rounded"
              >
                Trả Lời Sai
              </button>
            </div>
          )}

          {finish.questionPhase === "steal" && (
            <div className="border-t border-slate-700 pt-4 space-y-4 text-center">
              <h3 className="text-lg font-bold text-orange-400">CƠ HỘI CƯỚP ĐIỂM CHO CÁC ĐỘI KHÁC</h3>
              <div className="flex justify-center gap-2">
                {teams.filter(t => t.id !== finish.currentTeamId).map(team => (
                  <button
                    key={team.id}
                    onClick={() => finish.selectStealTeam(team.id)}
                    className={`px-4 py-2 rounded font-semibold ${
                      finish.selectedStealTeamId === team.id ? "bg-orange-500 text-white" : "bg-slate-700 text-gray-300"
                    }`}
                  >
                    {team.name}
                  </button>
                ))}
              </div>

              {finish.selectedStealTeamId && (
                <div className="flex justify-center gap-4 pt-2">
                  <button onClick={handleStealCorrect} className="px-4 py-2 bg-green-600 rounded font-bold">Cướp Đúng (+Điểm)</button>
                  <button onClick={handleStealWrong} className="px-4 py-2 bg-red-600 rounded font-bold">Cướp Sai (-Điểm)</button>
                </div>
              )}
            </div>
          )}

          {finish.questionPhase === "resolved" && (
            <div className="text-center pt-4 border-t border-slate-700">
              <p className="text-slate-300 mb-2">Đáp án: <span className="text-green-400 font-bold">{currentQuestion?.answer}</span></p>
              {currentPkg && finish.currentQuestionIndex + 1 < currentPkg.questions.length ? (
                <button 
                  onClick={finish.advanceQuestion} 
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 font-bold rounded"
                >
                  Câu Hỏi Tiếp Theo ➡️
                </button>
              ) : (
                <button 
                  onClick={finish.nextTeam} 
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-500 font-bold rounded"
                >
                  Hoàn Thành Gói Câu Hỏi 🏁
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

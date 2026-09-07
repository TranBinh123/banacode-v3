# Đường lên đỉnh Olympia – Event Game

Ứng dụng game show phục vụ sự kiện, được xây dựng theo kiến trúc **module độc lập**.

> Mục tiêu quan trọng: hoàn thiện và kiểm thử dứt điểm từng phần. Module mới không được tự ý sửa logic của module cũ; mọi dữ liệu dùng chung phải đi qua `CORE`.

## 1. Lộ trình

- [x] Part 1 – Khởi động: bộ câu hỏi độc lập + phân công Đội ↔ Bộ câu hỏi + 10 câu/đội + 120 giây + chấm Đúng/Sai/Chuyển tiếp.
- [ ] Part 2 – Vượt chướng ngại vật
- [ ] Part 3 – Tăng tốc
- [ ] Part 4 – Về đích

Các module tương lai sẽ nằm song song:

```text
src/modules/
├── warmup/
├── obstacle/
├── acceleration/
└── finish/
```

Không đặt logic của module sau vào `warmup`.

## 2. Kiến trúc CORE

`src/core/` là lớp dùng chung duy nhất giữa các phần:

```text
src/core/
├── store/gameStore.ts      # đội, tổng điểm, điểm theo phần, cấu hình chung
├── types/game.ts           # Team, GamePhase...
└── scoring/scoring.ts      # API tính điểm dùng chung
```

Module Khởi động chỉ gọi API nhỏ của CORE, ví dụ:

```ts
addScore(teamId, 10, "warmup");
```

Không cộng trực tiếp vào `totalScore` từ trong UI của module.

## 3. Luật Part 1 – Khởi động

### Đội chơi

Có 4 đội:

| Đội | Màu |
|---|---|
| Đội 1 | Xanh lá |
| Đội 2 | Đỏ |
| Đội 3 | Vàng |
| Đội 4 | Xanh dương |

### Bộ câu hỏi

Bộ câu hỏi là **thực thể độc lập với đội**.

Mỗi bộ có:

- `id`
- `name`
- `phase`
- đúng **10 câu hỏi**
- mỗi câu chỉ có `order` + `question`

Không lưu:

- đáp án
- ABCD
- gợi ý
- ghi chú MC

MC đã nắm đáp án và chỉ cần thao tác chấm kết quả.

### Phân công

Admin cấu hình:

```text
Đội 1 → Bộ câu hỏi A
Đội 2 → Bộ câu hỏi C
Đội 3 → Bộ câu hỏi D
Đội 4 → Bộ câu hỏi B
```

Lưu dưới dạng:

```ts
Record<TeamId, QuestionSetId>
```

Quy tắc:

1. Mỗi đội phải có đúng 1 bộ.
2. Một bộ không được phân cho 2 đội.
3. Bộ được phân phải có đủ 10 câu.
4. Nếu cấu hình chưa hợp lệ, không cho bắt đầu lượt chơi.

Khi MC chọn đội, hệ thống **tự động tìm bộ câu hỏi theo mapping**. MC không chọn bộ câu hỏi trong lúc chơi.

## 4. Luồng chơi

1. Trước lượt chơi, MC/Kỹ thuật chọn đội.
2. Hệ thống tự tải bộ câu hỏi đã được phân công.
3. Timer tự chạy từ `02:00`.
4. Hiển thị câu hỏi hiện tại.
5. MC chọn:
   - `Đúng` → +10 và sang câu tiếp theo.
   - `Sai` → 0 và sang câu tiếp theo.
   - `Chuyển tiếp` → 0 và sang câu tiếp theo.
6. Sau câu 10, các câu `Chuyển tiếp` được đưa vào hàng đợi để hỏi lại.
7. Câu đã `Đúng` hoặc `Sai` bị khóa, không hỏi lại.
8. Hết giờ:
   - khóa thao tác;
   - dừng timer;
   - chốt lượt;
   - cập nhật điểm bảng tổng;
   - hiển thị kết quả.

### Trạng thái câu

```ts
"unanswered" | "current" | "correct" | "wrong" | "skipped"
```

## 5. Điều khiển

Chuột/touch luôn hoạt động.

Phím tắt:

```text
1 / 2 / 3 / 4  → chọn Đội
D               → Đúng
S               → Sai
C               → Chuyển tiếp
P               → Tạm dừng / tiếp tục
```

Không xử lý phím tắt khi con trỏ đang nằm trong input/textarea/select.

Đội đang chơi bị khóa lựa chọn trong suốt lượt.

## 6. Persistence

Zustand `persist` được dùng để lưu state vào Local Storage.

Mục tiêu:

- refresh không mất cấu hình bộ câu hỏi;
- refresh không mất mapping;
- refresh không mất điểm;
- trạng thái lượt Khởi động được lưu.

Trong bản event thực tế, nên kiểm thử kỹ việc refresh trong lúc timer đang chạy.

## 7. Admin Part 1

Admin có 2 khu vực độc lập:

### A. Quản lý Bộ câu hỏi

- tạo bộ mới;
- sửa tên bộ;
- nhập/sửa 10 câu;
- xóa bộ;
- hiển thị `x/10 câu`.

### B. Phân công Đội / Bộ câu hỏi

Bảng 2 cột:

| Đội chơi | Bộ câu hỏi |
|---|---|
| Đội 1 | dropdown |
| Đội 2 | dropdown |
| Đội 3 | dropdown |
| Đội 4 | dropdown |

Nút lưu phải validate mapping trước khi lưu.

## 8. Nguyên tắc cho AI tiếp theo

Nếu một AI khác tiếp tục phát triển project này:

1. **Đọc README trước khi sửa code.**
2. Không đổi luật Part 1 nếu chưa có yêu cầu rõ ràng.
3. Không hard-code `Team 1 = Set 1`.
4. Không đưa đáp án/hint/note vào model câu hỏi.
5. Không cộng điểm trực tiếp ở component; dùng CORE scoring API.
6. Không sửa `warmup` để phục vụ Part 2/3/4.
7. Module mới phải tạo thư mục riêng.
8. Shared state mới chỉ được đưa vào CORE khi thực sự dùng chung.
9. Sau mỗi thay đổi lớn phải chạy:
   - `npm run build`
10. Ưu tiên tính ổn định khi vận hành sự kiện hơn hiệu ứng trang trí.

## 9. Cấu trúc hiện tại

```text
src/
├── admin/
│   └── warmup/
│       └── WarmupAdmin.tsx
├── components/
│   └── Scoreboard.tsx
├── core/
│   ├── scoring/
│   │   └── scoring.ts
│   ├── store/
│   │   └── gameStore.ts
│   └── types/
│       └── game.ts
├── modules/
│   └── warmup/
│       ├── components/
│       │   ├── QuestionStatusBar.tsx
│       │   ├── TeamSelector.tsx
│       │   └── WarmupControls.tsx
│       ├── data/
│       │   └── defaultQuestionSets.ts
│       ├── pages/
│       │   └── WarmupPage.tsx
│       ├── store/
│       │   └── warmupStore.ts
│       └── types/
│           └── warmup.ts
├── App.tsx
├── main.tsx
└── styles.css
```

## 10. Quyết định thiết kế chưa chốt

- Có cho phép `Chuyển tiếp` lần 2 và đưa lại cuối hàng đợi hay không: hiện tại cho phép, nhưng lượt kết thúc tuyệt đối khi timer về 0.
- Import/export JSON: để sau khi Part 1 core ổn định.
- Đồng hồ server/network: chưa cần; bản đầu chạy local.

## 11. Definition of Done – Part 1

Part 1 chỉ được coi là hoàn thành khi:

- [ ] Build không lỗi.
- [ ] Tạo/sửa/xóa bộ câu hỏi hoạt động.
- [ ] Mỗi bộ validate đủ 10 câu.
- [ ] Mapping Đội ↔ Bộ câu hỏi hoạt động.
- [ ] Không thể gán trùng bộ cho 2 đội.
- [ ] Chọn đội tự load đúng bộ đã phân công.
- [ ] Timer 120 giây tự chạy.
- [ ] Đúng +10.
- [ ] Sai +0.
- [ ] Chuyển tiếp +0.
- [ ] Câu đúng/sai không bị hỏi lại.
- [ ] Câu chuyển tiếp được hỏi lại sau câu 10.
- [ ] Hết giờ khóa điều khiển.
- [ ] Điểm cập nhật ngay.
- [ ] Refresh không làm mất state.
- [ ] Keyboard shortcuts hoạt động.
- [ ] Không phá kiến trúc CORE.

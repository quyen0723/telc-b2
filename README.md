# TELC B2 Prüfung — Mô phỏng giao diện đề thi

Web app **tĩnh** (HTML/CSS/JS thuần, không cần build) mô phỏng giao diện đề thi Telc B2 tiếng Đức:
Leseverstehen · Hörverstehen · Sprachbausteine · Schreiben.

🔗 **Bản chạy online (GitHub Pages):** https://quyen0723.github.io/telc-b2/
🖨️ Bản in: https://quyen0723.github.io/telc-b2/B2%20Pruefung-print.html

---

## 🚀 Bắt đầu (dev) — 30 giây

```bash
# 1. Lấy code (lần đầu)
git clone git@github.com:quyen0723/telc-b2.git
cd telc-b2

# 2. Chạy server local để xem (chọn 1 trong các cách — KHÔNG cần cài gì thêm)
python3 -m http.server 8000        # rồi mở http://localhost:8000
# hoặc trong VS Code: cài extension "Live Server" → bấm "Go Live"
# hoặc: npx serve .                 # nếu có Node
```

> Vì là site tĩnh nên **không có bước build, không có node_modules**. Sửa file → F5 là thấy.

## 🔄 Quy trình làm việc chung (mỗi lần sửa)

```bash
git pull                                  # LẤY BẢN MỚI NHẤT trước khi sửa (tránh đè nhau)
# ... sửa code ...
git add -A
git commit -m "mô tả thay đổi"
git push                                  # đẩy lên → GitHub Pages tự deploy sau ~30–60s
```

Nguyên tắc: **luôn `git pull` trước khi bắt đầu**, commit nhỏ + mô tả rõ. Việc lớn thì tạo nhánh:
`git checkout -b ten-tinh-nang` rồi mở Pull Request trên GitHub để review.

## 📁 Cấu trúc

| File | Vai trò |
|---|---|
| `index.html` / `B2 Pruefung.html` | Trang chính (entry point) |
| `B2 Pruefung-print.html` | Bản in |
| `data.js` | **Toàn bộ nội dung đề thi** (text tiếng Đức) — sửa nội dung ở đây |
| `app.js` | Logic render giao diện (tab, chọn đáp án; UI-only) |
| `styles.css` | Giao diện + responsive (mobile/tablet) |
| `screenshots/` | Ảnh tham khảo bố cục |
| `uploads/` | Ảnh thiết kế gốc (chỉ tham khảo, không cần để chạy) |

## 🧰 Loại dữ liệu nào để đâu

- **Code + nội dung đề (text):** ở repo này (Git) — có lịch sử, diff, merge.
- **Xem thử cho người không code:** gửi link GitHub Pages ở trên.
- **File nặng / nhị phân** (PDF đề gốc, video, ảnh thiết kế lớn): để 1 folder **Dropbox/Drive dùng chung**, rồi dán link vào đây:
  - 📎 Folder tài liệu chung: _(điền link Dropbox/Drive vào đây)_

## 👥 Cấp quyền cho thành viên

Chủ repo cấp quyền push cho dev bằng:
```bash
gh api -X PUT repos/quyen0723/telc-b2/collaborators/<github-username> -f permission=push
```
Hoặc trên web: **Settings → Collaborators → Add people**.

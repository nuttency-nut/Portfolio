# Portfolio — Nguyễn Quốc Anh Duy

Website HTML/CSS/JavaScript tĩnh. Không cần npm, React hay bước build để mở web.

## Mở website

Mở thư mục này bằng VS Code, nhấp phải `index.html` → **Open with Live Server**. Chạy server từ **thư mục gốc dự án** để các route hoạt động đúng.

Nếu muốn dùng terminal và máy có Python:

```powershell
cd D:\LearningSpace\Portfolio
python -m http.server 4173
```

Mở `http://localhost:4173/`. Python ở đây chỉ phục vụ file tĩnh, không phải ngôn ngữ chạy ứng dụng. Font Google, Three.js và nội dung nhúng ngoài vẫn cần mạng.

## Các trang

| Trang | URL | File sửa nội dung |
| --- | --- | --- |
| Home | `/` | `index.html` |
| Project | `/Project/` | `Project/index.html` |
| Chi tiết dự án | `/Project/project-01/` … `project-04/` | `Project/project-0N/index.html` |
| About | `/about/` | `about/index.html` |
| Hobby | `/about/hobby/` | `about/hobby/index.html` |

Contact trên topbar mở popup. Hobby mở tab mới và có bố cục riêng. Các URL được giữ nguyên sau khi dọn dự án.

## Thư mục chính

```text
assets/         Ảnh, icon, nhạc, font, tài liệu và thư viện dùng trên web
src/            CSS/JS: shared/ dùng chung; pages/ chia theo trang
source-assets/  PNG icon thiết kế gốc để chỉnh sửa/xuất lại
scripts/        Công cụ hỗ trợ xử lý tài nguyên và kiểm tra đường dẫn
tests/          Kiểm tra browser và unit; không tự lưu ảnh chụp vào dự án
docs/           Hướng dẫn điền nội dung và báo cáo tái cấu trúc
```

**Bắt đầu điền nội dung:** [docs/CONTENT.md](docs/CONTENT.md).

Ảnh dự án và hướng dẫn gallery không giới hạn: [docs/content/projects.md](docs/content/projects.md).

Kế hoạch, cấu trúc và kết quả dọn: [docs/RESTRUCTURE.md](docs/RESTRUCTURE.md).

## Khi thêm ảnh liên quan cho dự án

Bỏ ảnh vào `assets/images/projects/project-0N/related/`, rồi chạy:

```powershell
python scripts/assets/sync_project_images.py --watch
```

Hoặc nhấp đúp `scripts/assets/watch_project_images.cmd`. Trước khi đưa lên hosting, có thể đồng bộ một lần bằng `python scripts/assets/sync_project_images.py`.

## Kiểm tra và đưa lên hosting

```powershell
python scripts/check_paths.py
```

Kiểm tra browser và âm thanh: xem [tests/README.md](tests/README.md).

Hosting chỉ cần `index.html`, `Project/`, `about/`, `assets/` và `src/`. `source-assets/`, `docs/`, `scripts/`, `tests/` là file làm việc, không cần đưa lên hosting. Giữ đúng chữ hoa/thường của đường dẫn, đặc biệt `Project/`.

Form liên hệ hiện chưa kết nối dịch vụ gửi tin; khi Submit, web thông báo rõ thông tin chưa được gửi. Bật gửi thật cần tích hợp thêm dịch vụ phù hợp.

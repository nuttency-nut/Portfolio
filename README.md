# Portfolio — Nguyễn Quốc Anh Duy

Website HTML/CSS/JavaScript. HTML nguồn nằm trong `pages/`; bản xuất để đăng hosting nằm trong `dist/`. Dùng Node.js 22.x, không cần cài dependency hay React.

## Chạy để chỉnh sửa

```powershell
cd D:\LearningSpace\Portfolio
npm run dev
```

Mở `http://localhost:4173/`. Server ánh xạ các URL về file trong `pages/` và tự tải lại trình duyệt khi sửa HTML/CSS/JS hoặc tài nguyên. Font Google, Three.js và nội dung nhúng ngoài vẫn cần mạng.

## Các trang

| Trang | URL | File sửa nội dung |
| --- | --- | --- |
| Home | `/` | `pages/home.html` |
| Project | `/Project/` | `pages/projects/index.html` |
| Chi tiết dự án | `/Project/project-01/` … `project-04/` | `pages/projects/project-0N.html` |
| About | `/about/` | `pages/about.html` |
| Hobby | `/hobby/` | `pages/hobby.html` |

Contact mở popup. Hobby mở tab mới và có bố cục riêng. Định nghĩa các route ở `tools/routes.json`.

## Thư mục chính

```text
pages/           HTML nguồn, nơi sửa nội dung các trang
src/             CSS/JS: shared/ dùng chung; pages/ chia theo trang
assets/          Ảnh, icon, MP3, font, tài liệu và thư viện dùng trên web
design-sources/  PNG thiết kế gốc để chỉnh sửa/xuất lại
tools/           Xuất web, chạy server, xử lý ảnh và kiểm tra đường dẫn
tests/           Kiểm tra browser/unit; không lưu ảnh chụp vào dự án
docs/            Hướng dẫn điền nội dung và bàn giao
dist/            Bản xuất tự tạo; không sửa trực tiếp và không đưa vào Git
```

Bắt đầu điền nội dung ở [docs/CONTENT.md](docs/CONTENT.md). Xem [docs/RESTRUCTURE.md](docs/RESTRUCTURE.md) để biết cấu trúc và kết quả dọn.

## Xuất và xem thử bản đăng hosting

```powershell
npm run build
npm run preview
```

Preview tại `http://localhost:4174/`. Chạy lại build khi nội dung nguồn thay đổi. Đưa **nội dung bên trong `dist/`** lên thư mục gốc của hosting; `index.html` và các thư mục route ở đó được tạo tự động.

Đây vẫn là web tĩnh, hosting không cần Node.js hay Python. Không sửa file trong `dist/` vì lần build sau sẽ tạo lại thư mục này.

### Vercel

File `vercel.json` ở gốc dự án đã cấu hình Framework Preset là Other, Build Command là `npm run build` và Output Directory là `dist`. Root Directory trên Vercel để ở gốc repository, nơi có `package.json` và `vercel.json`.

Đẩy các file cấu hình này lên GitHub để Vercel dùng trong lần deploy tiếp theo. Không cần đưa `dist/` vào Git; Vercel tạo thư mục này trong quá trình build. Node.js được cố định ở dòng 22.x trong `package.json`.

## Khi thêm ảnh liên quan cho dự án

Bỏ ảnh vào `assets/images/projects/project-0N/related/`, rồi chạy công cụ đồng bộ nguồn:

```powershell
python tools/assets/sync_project_images.py --watch
```

Hoặc nhấp đúp `tools/assets/watch_project_images.cmd`. Script cập nhật gallery trong `pages/projects/project-0N.html`. Trước khi build có thể đồng bộ một lần bằng `python tools/assets/sync_project_images.py`. Python chỉ phục vụ công cụ xử lý ảnh tùy chọn, không cần để chạy `npm run dev` hay `npm run build`.

## Kiểm tra

```powershell
python tools/check_paths.py
```

Các bài kiểm tra browser và âm thanh: [tests/README.md](tests/README.md).

Form liên hệ hiện chưa kết nối dịch vụ gửi tin; khi Submit, web thông báo rõ thông tin chưa được gửi. Bật gửi thật cần tích hợp thêm dịch vụ phù hợp.

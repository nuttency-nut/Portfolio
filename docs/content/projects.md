# Ảnh dự án

Trang danh sách: `pages/projects/index.html`. Bốn trang chi tiết: `pages/projects/project-01.html` đến `pages/projects/project-04.html`. Mỗi dự án có thư mục ảnh riêng; Project 01 và 02 đã dùng ảnh thật.

Mỗi dự án có thư mục riêng ở đây, từ `project-01` đến `project-04`:

Bộ ảnh liên quan không giới hạn số lượng, hiển thị 4 cột ở desktop/tablet; mobile 2 cột. Project 01 và 02 giữ tỷ lệ gốc theo kiểu Pinterest; các dự án còn lại dùng khung 4:3.

```text
project-01/
  cover.svg     ảnh card mẫu, khung 16:10 (ảnh thật gợi ý 1280×800px)
  hero.svg      ảnh chính mẫu, khung 16:9 (ảnh thật gợi ý 1600×900px)
  related/      bỏ tất cả ảnh liên quan vào đây
    anh-01.svg
    anh-02.svg
    anh-03.svg
    anh-04.svg
    ... thêm bao nhiêu ảnh cũng được
```

Ảnh liên quan hỗ trợ JPG/JPEG, PNG, WebP, AVIF, GIF và SVG. Đặt tên tùy ý, hỗ trợ dấu và khoảng trắng. Ảnh được xếp theo tên với thứ tự số tự nhiên (`anh-2` trước `anh-10`); nên thêm tiền tố `01-`, `02-`… để chọn thứ tự. Chỉ lấy ảnh nằm trực tiếp trong `related/`, không lấy thư mục con, ảnh cover/hero hay file tài liệu. Xóa các SVG mẫu trong `related/` khi không dùng nữa.

Project 01 và 02 dùng gallery kiểu Pinterest: 4 cột trên desktop, 2 cột trên điện thoại, giữ nguyên tỷ lệ từng ảnh. Các ảnh HEIC đã có bản `*-heic.webp` để trình duyệt hiển thị; file HEIC gốc được giữ lại và không bị đưa vào gallery lần nữa. Nếu thêm HEIC mới, cần xuất thêm JPG/PNG/WebP để dùng trên web. Script dùng Pillow nếu có sẵn để đọc kích thước thật, kể cả ảnh có hướng xoay EXIF, và dành đúng chỗ cho ảnh trong lúc tải.

Project 02 có cả video MP4 (H.264/AAC), bấm để phát và không tải dữ liệu video trước. Mỗi video dùng ảnh xem trước cùng tên với hậu tố `-poster.webp`, ví dụ `0124.mp4` và `0124-poster.webp`. Ảnh xem trước không được tính thành ảnh riêng trong gallery. Nếu thêm MOV/HEVC mới, cần chuyển sang MP4 H.264/AAC trước. Các video gốc trước khi tối ưu được lưu tại `design-sources/media-originals/project-02/`; thư mục này chỉ lưu cục bộ, được bỏ qua bởi Git và không nằm trong bản build.

Mở một terminal ở thư mục gốc dự án và chạy lệnh dưới đây cùng dev server (`npm run dev`):

```powershell
python tools/assets/sync_project_images.py --watch
```

Hoặc nhấp đúp `tools/assets/watch_project_images.cmd` để chạy trên Windows. Giữ terminal/cửa sổ đó chạy khi thêm ảnh. Script kiểm tra mỗi giây và tự cập nhật HTML nguồn/số ảnh khi thêm, xóa, đổi tên hoặc thay ảnh trong `related/`. Dev server tự tải lại trang khi HTML thay đổi. URL ảnh có phiên bản theo file để tránh dùng ảnh cũ trong cache. Dừng bằng Ctrl+C.

Đồng bộ một lần (ví dụ trước khi đưa web lên hosting):

```powershell
python tools/assets/sync_project_images.py
```

Python chỉ là công cụ đồng bộ lúc chỉnh sửa. Sau khi đồng bộ, chạy `npm run build` và đưa nội dung `dist/` lên hosting; bản xuất vẫn là HTML/CSS/JS tĩnh, không cần backend/Python/Node.js trên hosting. Không phụ thuộc việc hosting cho phép liệt kê thư mục.

Ảnh card và ảnh chính vẫn chỉnh `src`/`alt` trong HTML: card tại `pages/projects/index.html`, ảnh chính tại trang chi tiết tương ứng. Ví dụ đổi `assets/images/projects/project-01/cover.svg` thành `assets/images/projects/project-01/cover.jpg` khi dùng JPG. Giữ ảnh cover/hero ngoài `related/` để tránh lặp lại trong bộ ảnh liên quan.

Sửa tên/mô tả ngắn của card tại `pages/projects/index.html`; sửa tiêu đề, vai trò, thời gian và phần “Về dự án” trong từng trang chi tiết. Không chỉnh thủ công vùng giữa `<!-- project-gallery:start -->` và `<!-- project-gallery:end -->`: script sẽ tạo lại vùng này từ thư mục ảnh. Các phần nội dung ngoài vùng này được giữ nguyên.

Style chung ở `src/styles/pages/projects/main.css`. Skeleton ở `src/scripts/pages/projects/images.js` chạy theo việc tải/giải mã ảnh thật, tự tắt sau khi ảnh sẵn sàng và có trạng thái lỗi. Ảnh tải từ cache sẽ hiện nhanh; không có thời gian chờ giả. Tắt JavaScript vẫn xem được nội dung và ảnh bình thường.

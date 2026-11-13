# Ảnh dự án

Trang danh sách: `Project/index.html`. Bốn trang chi tiết: `Project/project-01/index.html` đến `Project/project-04/index.html`. Các ảnh SVG mẫu đã được chép vào đúng thư mục của từng dự án, không tạo ảnh mới.

Mỗi dự án có thư mục riêng ở đây, từ `project-01` đến `project-04`:

Bộ ảnh liên quan không giới hạn số lượng, hiển thị 4 tấm trên một hàng ở desktop/tablet; mobile 2 tấm mỗi hàng. Tỷ lệ khung ảnh 4:3.

```text
project-01/
  cover.svg     ảnh card mẫu, khung 16:10 (ảnh thật gợi ý 1280×800px)
  hero.svg      ảnh chính mẫu, khung 16:9 (ảnh thật gợi ý 1600×900px)
  related/      bỏ tất cả ảnh liên quan vào đây, khung 4:3 (1200×900px)
    anh-01.svg
    anh-02.svg
    anh-03.svg
    anh-04.svg
    ... thêm bao nhiêu ảnh cũng được
```

Ảnh liên quan hỗ trợ JPG/JPEG, PNG, WebP, AVIF, GIF và SVG. Đặt tên tùy ý, hỗ trợ dấu và khoảng trắng. Ảnh được xếp theo tên với thứ tự số tự nhiên (`anh-2` trước `anh-10`); nên thêm tiền tố `01-`, `02-`… để chọn thứ tự. Chỉ lấy ảnh nằm trực tiếp trong `related/`, không lấy thư mục con, ảnh cover/hero hay file tài liệu. Xóa các SVG mẫu trong `related/` khi không dùng nữa.

Mở một terminal ở thư mục gốc dự án và chạy lệnh dưới đây cùng Live Server:

```powershell
python scripts/assets/sync_project_images.py --watch
```

Hoặc nhấp đúp `scripts/assets/watch_project_images.cmd` để chạy trên Windows. Giữ terminal/cửa sổ đó chạy khi thêm ảnh. Script kiểm tra mỗi giây và tự cập nhật HTML/số ảnh khi thêm, xóa, đổi tên hoặc thay ảnh trong `related/`. Live Server tự tải lại trang khi HTML thay đổi; với server tĩnh khác, tải lại trang để xem. URL ảnh có phiên bản theo file để tránh dùng ảnh cũ trong cache. Dừng bằng Ctrl+C.

Đồng bộ một lần (ví dụ trước khi đưa web lên hosting):

```powershell
python scripts/assets/sync_project_images.py
```

Python chỉ là công cụ đồng bộ lúc chỉnh sửa; trang xuất ra vẫn là HTML/CSS/JS tĩnh, không cần backend/Python trên hosting. Khi thêm ảnh vào bản nguồn sau này, chạy đồng bộ rồi đưa HTML và thư mục ảnh đã cập nhật lên hosting. Không cần và không phụ thuộc việc hosting cho phép liệt kê thư mục.

Ảnh card và ảnh chính vẫn chỉnh `src`/`alt` trong HTML: card tại `Project/index.html`, ảnh chính tại trang chi tiết tương ứng. Ví dụ đổi `assets/images/projects/project-01/cover.svg` thành `assets/images/projects/project-01/cover.jpg` khi dùng JPG. Giữ ảnh cover/hero ngoài `related/` để tránh lặp lại trong bộ ảnh liên quan.

Sửa tên/mô tả ngắn của card tại `Project/index.html`; sửa tiêu đề, vai trò, thời gian và phần “Về dự án” trong từng trang chi tiết. Không chỉnh thủ công vùng giữa `<!-- project-gallery:start -->` và `<!-- project-gallery:end -->`: script sẽ tạo lại vùng này từ thư mục ảnh. Các phần nội dung ngoài vùng này được giữ nguyên.

Style chung ở `src/styles/pages/projects/main.css`. Skeleton ở `src/scripts/pages/projects/images.js` chạy theo việc tải/giải mã ảnh thật, tự tắt sau khi ảnh sẵn sàng và có trạng thái lỗi. Ảnh tải từ cache sẽ hiện nhanh; không có thời gian chờ giả. Tắt JavaScript vẫn xem được nội dung và ảnh bình thường.

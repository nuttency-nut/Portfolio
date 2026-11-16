# Ảnh khi chia sẻ link

- Tên miền chính thức: `https://anhduy.info`.
- Ảnh dùng chung: `assets/images/shared/social-preview-v1.jpg`, JPEG 1280 × 720 px (16:9), khoảng 101 KB.
- Cắt trực tiếp từ `assets/images/shared/contact.jpg`, vùng `(x=5, y=600, width=1696, height=954)` rồi thu về 1280 × 720. Ảnh gốc không bị thay đổi; không dùng bản tạo lại bằng AI làm ảnh preview.
- Cả 8 trang có Open Graph/Twitter Card ngay trong HTML nguồn và URL canonical riêng theo `tools/routes.json`; tiêu đề chia sẻ giữ theo page title của từng trang. Không cần chạy JavaScript để lấy metadata.

Khi đổi ảnh, tạo tên mới như `social-preview-v2.jpg` rồi cập nhật `og:image`, `twitter:image`, kích thước và mô tả ảnh trong các file HTML ở `pages/`. Đổi tên miền thì cập nhật các URL `https://anhduy.info` trong metadata.

Chạy `npm run build`, đẩy code/ảnh lên GitHub và redeploy Vercel để ảnh preview được truy cập công khai. Các ứng dụng có thể lưu cache bản preview cũ; có thể cần làm mới bản xem trước hoặc chờ ứng dụng đọc lại metadata. Bố cục preview cuối cùng do ứng dụng nhận link quyết định.

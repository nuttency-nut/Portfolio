# Đánh giá đồng nghiệp — tầng 4

Đang dùng đúng **8 card**. Thay lời nhận xét, tên/chức danh trong 8 `.testimonial-card` ở `index.html`. Chỉ sửa nhóm gốc; JavaScript tự tạo bản sao để chạy vòng vô hạn. Card mới thứ 8 đang dùng nội dung và avatar mẫu.

Thư mục ảnh: **`assets/images/home/testimonials/avatars/`**.

Card dùng bố cục gọn: nhận xét hiển thị tối đa 3 dòng, dài hơn sẽ rút gọn bằng dấu ba chấm; avatar cách phần nhận xét 16px. Chừa cùng vùng 3 dòng để các avatar thẳng hàng.

Đặt ảnh vuông **1:1**, gợi ý **512×512px**, theo tên:

1. `dong-nghiep-01.jpg`
2. `dong-nghiep-02.jpg`
3. `dong-nghiep-03.jpg`
4. `dong-nghiep-04.jpg`
5. `dong-nghiep-05.jpg`
6. `dong-nghiep-06.jpg`
7. `dong-nghiep-07.jpg`
8. `dong-nghiep-08.jpg`

PNG/WebP cũng dùng được. Sau khi thêm ảnh thật, đổi đuôi `.svg` của `src` tương ứng trong HTML sang đúng `.jpg`, `.png` hoặc `.webp`. Ví dụ: `src="assets/images/home/testimonials/avatars/dong-nghiep-01.jpg"`. Không đổi đuôi file ảnh mà chưa chuyển định dạng. Ảnh được cắt tròn bằng CSS; giữ khuôn mặt ở giữa. Các file SVG trong thư mục là avatar mẫu, dùng trong lúc chờ ảnh thật.

Style: `src/styles/pages/home/testimonials.css`. Logic: `src/scripts/pages/home/testimonials.js`. Tốc độ hiện tại 42px/giây, từ phải sang trái, nối vòng liền mạch. Giữ chuột/chạm để kéo hai chiều; thả tay tự chạy tiếp ngay từ vị trí vừa kéo, không có nút tạm dừng. Điện thoại vẫn cuộn trang dọc bình thường. Hỗ trợ phím mũi tên trái/phải khi vùng nhận xét được focus. Tự tạm dừng khi ra khỏi màn hình hoặc đổi tab; chế độ giảm chuyển động và khi tắt JavaScript dùng cuộn ngang thủ công.

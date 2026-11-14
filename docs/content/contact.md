# Ảnh tầng 5

Hiệu ứng theo `hover-card_1.html`: ảnh 3:4 đứng yên, rê chuột trên từng vùng để hiện nhãn chữ bật lên. Có 14 nhãn, xáo trộn vị trí mỗi lần tải trang; không đổi vị trí liên tục khi rê chuột. Mobile chạm ảnh để xem lần lượt; bàn phím dùng Tab rồi Enter/Space hoặc các phím mũi tên, Escape để ẩn. Giảm chuyển động sẽ hiện nhãn ngay, không nhảy hoặc pulse. Sửa danh sách `labels` trong `src/scripts/shared/contact.js`; style tại `src/styles/shared/contact.css`.

Khung ảnh bên trái có tỷ lệ **3:4**. Gợi ý ảnh thật 900 × 1200 px hoặc 1200 × 1600 px.

Ảnh hiện trỏ tới `assets/images/shared/contact.jpg`; thay đúng file này thì không cần sửa code. Nếu dùng `cover.png`/`cover.webp`, đổi `src` trong `pages/home.html` sang đúng tên file. Cập nhật `alt` theo nội dung ảnh thật. Ảnh được căn giữa và crop vừa khung bằng `object-fit: cover`.

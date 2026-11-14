# Ảnh cho phần hành trình cuộn dọc

Lời nhắc “click to expand all” nằm ở đầu đường tím trên desktop/tablet, dùng font Caveat và mũi tên SVG trỏ vào nút chấm tím. Khi chấm rời điểm đầu, mask xóa dần chữ rồi nét mũi tên trong 0,95 giây; cuộn về đầu sẽ vẽ lại nếu các mốc vẫn thu gọn. Lời nhắc ẩn sau khi mở mốc, và không hiện khi nút chấm tím bị ẩn (mobile, giảm chuyển động hoặc tắt JavaScript). Sửa chữ và nét trong `.scroll-story-hint` ở `pages/home.html`, style tại `scroll-story.css`.

Các mô tả mặc định thu gọn trong `<details class="scroll-story-details">`. Sửa các thẻ `<p>` bên trong `.scroll-story-details-copy` như bình thường. Logo/tên công ty/chức danh/thời gian luôn hiện. Chấm tím mở tất cả 5 mốc; khi tất cả đã mở, bấm lần nữa sẽ thu gọn tất cả. Nếu chỉ vài mốc đang mở, chấm tím mở các mốc còn lại. Nút “Xem chi tiết”/“Thu gọn” riêng vẫn điều khiển từng mốc. Phần mô tả giãn/thu chiều cao, mờ và dịch nhẹ ở cả hai chiều; có thể bấm đảo chiều khi đang chạy. Đường SVG cập nhật theo chiều cao đang thay đổi. Mobile dùng nút tại từng mốc; chế độ giảm chuyển động mở/đóng ngay. Khi tắt JavaScript, nút native vẫn dùng được.

Mỗi chặng có chức danh và thời gian ngay dưới tên công ty. Sửa nội dung trong `<p class="scroll-story-position">...</p>` và `<p class="scroll-story-period">...</p>` ở `pages/home.html`. Thời gian nằm ngay sau chức danh, cách 12px; thiếu chỗ thì xuống dòng và cùng căn trái. Hai dòng nằm trong `.scroll-story-meta`, cùng cụm logo/tên công ty.

Logo công ty đặt phía trên tiêu đề mỗi chặng. Thay ảnh mẫu `logo.png` trong thư mục tương ứng:

- Chặng 1: `assets/images/home/journey/moc-01/logo.png`
- Chặng 2: `assets/images/home/journey/moc-02/logo.png`
- Chặng 3: `assets/images/home/journey/moc-03/logo.png`
- Chặng 4: `assets/images/home/journey/moc-04/logo.png`
- Chặng 5: `assets/images/home/journey/moc-05/logo.png`

Dùng PNG vuông tỷ lệ **1:1**, gợi ý **512 × 512px**, nền trong suốt và cắt bớt khoảng trống thừa quanh logo. Khung hiển thị **40 × 40px** trên desktop và **32 × 32px** trên điện thoại; hình được giữ trọn, không méo hoặc cắt. Giữ đúng tên `logo.png` thì không cần sửa đường dẫn; cập nhật `alt` của `.scroll-story-company-logo` trong `pages/home.html` thành tên công ty thật. Nếu trình duyệt còn giữ ảnh cũ, nhấn Ctrl + F5.

Mỗi chặng trong `.scroll-story` ở `pages/home.html` có **4 ảnh**, xếp thành chồng. Desktop hover để bung lần lượt ra bốn phía. Mobile tự bung khi cuộn cụm ảnh tới giữa màn hình, ra khỏi vùng giữa thì thu lại; vẫn chạm để mở/đóng được. Bàn phím dùng Tab rồi Enter/Space; Escape thu lại.

Mỗi chặng có thư mục riêng `moc-01` đến `moc-05`. Đặt 4 ảnh thật trong thư mục của chặng đó theo tên `anh-01.jpg`, `anh-02.jpg`, `anh-03.jpg`, `anh-04.jpg`, rồi đổi đuôi `.svg` thành `.jpg` tại `src` của ảnh tương ứng trong HTML. PNG/WebP cũng dùng được nếu sửa đúng tên và đuôi file. Ví dụ ảnh thứ hai của chặng 3: `assets/images/home/journey/moc-03/anh-02.jpg`.

Khung dọc tỷ lệ **2:3**, gợi ý ảnh 720 × 1080 px. Ảnh được crop giữa khung bằng `object-fit: cover`. Sửa `alt` thành mô tả ảnh thật khi thay.

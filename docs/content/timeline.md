# Ảnh cho timeline

Đã tạo 5 thư mục và gắn sẵn đường dẫn trong `index.html`:

| Mốc | Thư mục | Tên ảnh trong thư mục |
| --- | --- | --- |
| 1 | `moc-01/` | `anh-01.jpg`, `anh-02.jpg`, `anh-03.jpg` |
| 2 | `moc-02/` | `anh-01.jpg`, `anh-02.jpg`, `anh-03.jpg` |
| 3 | `moc-03/` | `anh-01.jpg`, `anh-02.jpg`, `anh-03.jpg` |
| 4 | `moc-04/` | `anh-01.jpg`, `anh-02.jpg`, `anh-03.jpg` |
| 5 | `moc-05/` | `anh-01.jpg`, `anh-02.jpg`, `anh-03.jpg` |

Ví dụ ảnh thứ hai của mốc 3: `assets/images/home/timeline/moc-03/anh-02.jpg`.

Trong mỗi thư mục đã có 3 ảnh JPG mẫu. Chép ảnh JPG thật đè lên đúng tên rồi tải lại trang, không cần sửa code. Ba file SVG bên ngoài là bản gốc để tạo ảnh mẫu.

Nếu dùng PNG/WebP, giữ đúng định dạng và sửa đuôi file trong `src` của template `.work-timeline-photo-sources` thuộc mốc tương ứng ở `index.html`. Có thể sửa `alt` để mô tả ảnh thật.

- Mỗi mốc hiển thị tối đa 3 ảnh; nếu chỉ dùng 1 hoặc 2 ảnh, xóa các thẻ `img` thừa trong template để không hiện ảnh mẫu còn lại.
- Khung nhỏ và khung xem lớn đều là 1:1. Ảnh vuông từ 600×600 px là phù hợp; ảnh tỷ lệ khác sẽ được crop giữa.
- Ảnh hiện lần lượt sau khi avatar tới mốc. Desktop hover để xem lớn; mobile chạm để mở, chạm lại/chạm ngoài hoặc nút đóng để thu lại.
- Mốc cuối đặt cụm ảnh bên phải; các mốc khác đặt phía trên.

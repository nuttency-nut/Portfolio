# Form liên hệ và ảnh tầng 5

## Gửi Let's Work Together qua Zalo Bot

Form cuối Home/About và popup Contact đều gửi JSON đến `/api/contact`. API phía máy chủ gọi [sendMessage của Zalo Bot](https://bot.zaloplatforms.com/docs/apis/sendMessage/) bằng `ZALO_BOT_TOKEN` và `ZALO_CHAT_ID`. Token chỉ nằm trong biến môi trường, không nằm trong HTML/JS trình duyệt hay bản xuất tĩnh.

Điền hai giá trị trong `.env.local` ở thư mục gốc dự án:

```dotenv
ZALO_BOT_TOKEN=
ZALO_CHAT_ID=
```

`.env.local` đã được Git bỏ qua; `.env.example` chỉ là mẫu trống. Chạy `npm run dev` hoặc `npm run preview` sẽ đọc `.env.local` lúc khởi động. Sau khi sửa file cần dừng và chạy lại server. Không đặt token vào `assets/`, `src/`, HTML hoặc `vercel.json`.

### Lấy Chat ID

1. Điền Bot Token do Zalo Bot Manager cấp vào `.env.local`.
2. Nhắn một tin từ Zalo của em đến bot.
3. Chạy `npm run zalo:chat-id`. Công cụ chỉ in tên người gửi và `message.chat.id`, không in token/nội dung tin nhắn.
4. Kiểm tra đúng cuộc trò chuyện của em, điền ID vào `ZALO_CHAT_ID`, rồi khởi động lại server.

Nếu bot đang dùng webhook, công cụ sẽ không xóa hay thay đổi nó; lấy `message.chat.id` từ sự kiện webhook hiện có. `getUpdates` và webhook loại trừ nhau, theo [tài liệu getUpdates](https://bot.zaloplatforms.com/docs/apis/getUpdates/).

`secret_token` của [setWebhook](https://bot.zaloplatforms.com/docs/apis/setWebhook/) dùng để xác thực request Zalo gọi vào website, khác Bot Token dùng gửi tin. Tích hợp này chỉ gửi thông báo từ form ra Zalo nên không đăng ký webhook mới.

### Cấu hình Vercel

Trong Project → Settings → Environment Variables, thêm `ZALO_BOT_TOKEN` và `ZALO_CHAT_ID` cho môi trường muốn dùng, sau đó Redeploy. Thư mục `api/` ở gốc được Vercel triển khai thành function; `dist/` vẫn chỉ chứa giao diện tĩnh. Chỉ upload `dist/` sang hosting tĩnh thông thường sẽ không chạy được API gửi tin.

Nhấn Submit chỉ báo thành công khi Zalo trả `ok: true`; nếu lỗi/mất kết nối thì giữ lại nội dung để người dùng thử lại. API giới hạn kích thước dữ liệu, gửi văn bản thuần tối đa dưới 2000 ký tự, kiểm tra Origin và có trường chống bot ẩn. Giới hạn gửi nhanh là 3 lần/phút theo IP trên từng instance; nếu cần giới hạn dùng chung giữa mọi instance, cấu hình thêm Firewall trên Vercel. Không có hàng đợi gửi lại hoặc lưu lời nhắn vào cơ sở dữ liệu.

Kiểm tra không gửi tin thật: `node tests/unit/contact-api.mjs` và `node tests/browser/contact-delivery-browser.mjs` (xem `tests/README.md`). Kiểm tra thực tế cần token/chat ID hợp lệ và submit một lời nhắn thử từ form.

## Ảnh tầng 5

Hiệu ứng theo `hover-card_1.html`: ảnh 3:4 đứng yên, rê chuột trên từng vùng để hiện nhãn chữ bật lên. Có 14 nhãn, xáo trộn vị trí mỗi lần tải trang; không đổi vị trí liên tục khi rê chuột. Mobile chạm ảnh để xem lần lượt; bàn phím dùng Tab rồi Enter/Space hoặc các phím mũi tên, Escape để ẩn. Giảm chuyển động sẽ hiện nhãn ngay, không nhảy hoặc pulse. Sửa danh sách `labels` trong `src/scripts/shared/contact.js`; style tại `src/styles/shared/contact.css`.

Khung ảnh bên trái có tỷ lệ **3:4**. Gợi ý ảnh thật 900 × 1200 px hoặc 1200 × 1600 px.

Ảnh hiện trỏ tới `assets/images/shared/contact.jpg`; thay đúng file này thì không cần sửa code. Nếu dùng `cover.png`/`cover.webp`, đổi `src` trong `pages/home.html` sang đúng tên file. Cập nhật `alt` theo nội dung ảnh thật. Ảnh được căn giữa và crop vừa khung bằng `object-fit: cover`.

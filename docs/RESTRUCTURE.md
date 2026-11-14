# Kế hoạch tái cấu trúc dự án

Giữ nguyên nội dung và giao diện. HTML nguồn đã gom vào `pages/`, bản xuất tĩnh sinh trong `dist/`. Các route là `/`, `/Project/`, `/Project/project-01/` đến `project-04/`, `/about/` và Hobby mới tại `/hobby/`. Công cụ build/dev dùng Node.js có sẵn, không thêm thư viện hay framework.

## Các bước thực hiện

- [x] Kiểm kê mã nguồn, tài nguyên, script hỗ trợ và file kiểm tra.
- [x] Lưu bản khôi phục bên ngoài dự án; dọn ảnh chụp QA, cache và mock cũ không còn dùng.
- [x] Gom CSS/JS thành `shared/` và `pages/{home,about,hobby,projects}/`.
- [x] Gom tài nguyên vào `assets/`, tách ảnh, icon, audio, font, tài liệu và thư viện.
- [x] Chuyển PNG gốc của bộ icon vào `design-sources/`; giữ nguyên ảnh, logo, PDF và nhạc người dùng cung cấp.
- [x] Cập nhật toàn bộ đường dẫn, script xử lý ảnh và bài kiểm tra.
- [x] Viết hướng dẫn mới về chạy web, điền nội dung và thay tài nguyên.
- [x] Kiểm tra liên kết/tệp, các trang desktop/mobile, nhạc và những tương tác chính; dọn file phát sinh sau kiểm tra.
- [x] Gom HTML nguồn vào `pages/`, thêm công cụ build/dev không dependency, chuyển Hobby sang `/hobby/`.

## Cấu trúc đích

```text
pages/
  home.html                Home
  about.html               About
  hobby.html               Hobby tại /hobby/
  projects/                Danh sách và 4 trang chi tiết
assets/
  images/
    background/            Nền SVG, texture, icon trang trí
    shared/                Ảnh Contact dùng chung
    home/                  Thẻ nhân viên, timeline, hành trình, đồng nghiệp
    about/                 Chân dung và ảnh cạnh radar
    hobby/                 Avatar, sách, phim, bìa nhạc, thể thao
    projects/              cover, hero và related/ của từng dự án
  icons/                   Favicon và logo ứng dụng
  audio/                   Nhạc nền và playlist Hobby
  fonts/                   Font đang sử dụng và giấy phép
  documents/               CV/PDF giữ lại
  vendor/                  Thư viện và giấy phép bên thứ ba
src/
  scripts/{shared,pages}/   JavaScript dùng chung và theo trang
  styles/{shared,pages}/    CSS dùng chung và theo trang
design-sources/             PNG icon gốc, không cần đưa lên hosting
tools/assets/            Chuẩn bị icon và đồng bộ gallery
tools/routes.json        Ánh xạ file HTML nguồn sang URL và file xuất
tools/build.mjs          Xuất 8 trang và tài nguyên sang dist/
tools/serve.mjs          Dev server/preview, tự reload khi sửa nguồn
tests/{browser,unit}/      Các bài kiểm tra còn hữu ích
docs/                      Hướng dẫn và kế hoạch này
README.md                  Cách mở/chạy dự án
PRODUCT.md                 Ngữ cảnh và yêu cầu sản phẩm
dist/                      Bản xuất được sinh tự động, đã bỏ qua trong Git
```

## Nguyên tắc dọn

Xóa ảnh chụp/biên bản thử của công cụ, cache Python, placeholder `.gitkeep` trong thư mục đã có nội dung và các SVG/font thử cũ đã xác minh không còn dùng. Giữ các ảnh thật, nhạc, logo, file PDF và PNG thiết kế gốc. Các file mock trong thư mục dự án vẫn được giữ để người dùng thay riêng từng ảnh sau này.

Kết quả kiểm tra và ảnh chụp thử phải nằm ngoài thư mục dự án, không tái tạo lại `.impeccable/review/`.

Các file trong `dist/` được tạo lại bởi `npm run build`, không sửa trực tiếp. Khi phát triển dùng `npm run dev` và sửa HTML trong `pages/`. Hobby chỉ có route nội dung `/hobby/`; link trên About tiếp tục mở tab mới. Root `scripts/` đổi thành `tools/`, `source-assets/` đổi thành `design-sources/` để phân biệt rõ với JavaScript và tài nguyên chạy trên web.

## Kết quả

- Chuyển 225 file về cấu trúc mới; các thư mục trung gian cũ trống đã được gỡ.
- Xóa 269 ảnh chụp/biên bản QA, 1 cache Python và 18 file không còn cần: placeholder `.gitkeep`, font thử Allura/Patrick Hand và SVG mock đơn cũ không còn tham chiếu.
- Thu gọn dự án khoảng 65 MB. Không tối ưu lại hoặc nén lại ảnh/âm thanh của người dùng trong đợt này.
- Đối chiếu SHA-256: 143 file media/font/SVG được giữ nguyên byte sau khi chuyển; gồm đủ 6 MP3, 2 PDF và 7 PNG icon thiết kế gốc.
- Nội dung chữ trong cả 8 trang HTML được đối chiếu với bản khôi phục và không đổi. Thư mục ảnh liên quan vẫn riêng cho từng dự án để thay nội dung độc lập.
- CSS khung trang chung tách ra `src/styles/shared/page-layout.css`; About không còn phải tải stylesheet card Project chỉ để lấy khung trang.
- Năm MP3 Hobby đổi tên gọn thành `if-only.mp3`, `golden-night.mp3`, `just-being-friendly.mp3`, `golden-hour.mp3`, `guess-who.mp3`; tên bài/ca sĩ và âm thanh không đổi.

## Đường dẫn thường dùng sau khi chuyển

| Hạng mục | Đường dẫn mới |
| --- | --- |
| JS card nhân viên | `src/scripts/pages/home/lanyard.js` |
| JS chung topbar/form/nhạc | `src/scripts/shared/` |
| CSS/JS About | `src/styles/pages/about/`, `src/scripts/pages/about/` |
| CSS/JS Hobby | `src/styles/pages/hobby/`, `src/scripts/pages/hobby/` |
| Ảnh timeline / hành trình Home | `assets/images/home/timeline/`, `assets/images/home/journey/` |
| Ảnh Project và gallery | `assets/images/projects/project-0N/` |
| Ảnh About / Hobby | `assets/images/about/`, `assets/images/hobby/` |
| Ảnh Contact | `assets/images/shared/contact.jpg` |
| MP3 nền / playlist | `assets/audio/background/`, `assets/audio/hobby/` |
| Logo app / favicon | `assets/icons/apps/`, `assets/icons/favicon/` |
| CV | `assets/documents/cv/` |
| Script gallery | `tools/assets/sync_project_images.py` |
| Hướng dẫn thay nội dung | `docs/CONTENT.md` |

## Đã xác nhận

- `python tools/check_paths.py`: 166 đường dẫn nội bộ hợp lệ, gồm URL trong CSS và JS.
- Unit: gallery thêm/xóa/thay ảnh và tên file có dấu; lanyard khởi động có/không cache và vật lý ở 30/60/120 fps.
- Browser: cả 8 route ở 1440px và 390px; ảnh nội bộ giải mã được, không có 404 hay lỗi JavaScript; phát được cả 5 MP3 Hobby.
- Gallery: 4 trang chi tiết, skeleton/lỗi ảnh, thêm ảnh vượt giới hạn cũ, đồng bộ xong không còn ảnh QA.
- Điều hướng: Home/Project/About, tải trực tiếp, reload, menu mobile và popup Contact.
- Nhạc topbar: mức 40%, autoplay bị chặn/được phép, play/pause, phát tiếp khi chuyển trang, reload và Back/Forward.
- Form: kiểm tra ô nhập, phản hồi Submit, popup và chế độ không JavaScript.
- About: bố cục laptop/mobile, bốn chỉ số, các tab radar, nhãn không bị cắt, bàn phím, giảm chuyển động và dữ liệu dự phòng.
- So sánh bản trước/sau tại 1440×900, 390×844 và 1024×600: vị trí/kích thước các tầng chính Home/Project/About/Hobby khớp dưới sai số 1px.

Các bài kiểm tra cũ đã được cập nhật theo popup Contact hiện tại và đợi đúng sự kiện media, thay vì giả định trạng thái đổi đồng bộ ngay khi click. Test viewport 600px kiểm tra các chỉ số nằm trọn màn hình, không ép thêm khoảng trống 12px mà bản gốc không có.

Bản khôi phục và manifest chuyển file được giữ ngoài thư mục dự án trong `%TEMP%/portfolio-restructure-b5nsg1jh/`. Ảnh chụp QA cũ không được đưa vào bản khôi phục này.

## Xác nhận sau khi gom HTML nguồn

- Build thành công đủ 8 trang. 178 file trong `assets/` và `src/` được sao chép nguyên byte vào `dist/`.
- Cả dev và preview đều qua kiểm tra 8 route trên desktop/mobile, ảnh nội bộ, nhạc và khởi tạo các widget. Link Hobby từ About mở tab mới tại `/hobby/`.
- `/hobby` chuyển về URL chuẩn `/hobby/`. Route Hobby cũ không còn được xuất hoặc phục vụ.
- Dev server hỗ trợ tự reload khi sửa nguồn; preview phục vụ riêng bản `dist/`. Đã kiểm tra byte-range/HEAD để phát và tua MP3.
- Gallery vẫn thêm/xóa/thay ảnh không giới hạn, cập nhật HTML nguồn trong `pages/projects/`; nội dung chữ của cả 8 trang và 7 PNG thiết kế gốc được đối chiếu với Git và giữ nguyên.
- `dist/` đã được bỏ qua trong Git. Khi bàn giao, sửa trong `pages/`, `src/`, `assets/` và chạy build để xuất bản.

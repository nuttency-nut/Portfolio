# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

Nền portfolio light gồm SVG vector và bộ icon do người dùng thiết kế, cùng topbar và thẻ đeo 3D.

## Capabilities and Constraints

- HTML nguồn tập trung trong `pages/home.html`, `pages/about.html`, `pages/hobby.html` và `pages/projects/`. `tools/routes.json` ánh xạ sang URL; Hobby hiện là `/hobby/`, mở tab mới từ About. `npm run dev` chạy server nguồn tại localhost:4173; `npm run build` xuất web tĩnh vào `dist/`; `npm run preview` xem bản xuất tại localhost:4174. Công cụ Node.js không có dependency ngoài, không thêm React. Không sửa trực tiếp `dist/`. Công cụ hỗ trợ nằm ở `tools/`, PNG thiết kế gốc ở `design-sources/`.

- About có khối ảnh/radar sau tầng “Trợ thủ không thể thiếu…” và trước Q&A. Desktop đặt ảnh mock SVG 4:3 bên trái (`assets/images/about/radar-photo.jpg`) và radar ApexCharts 8.8.2 bên phải, hai khung bằng chiều cao; dưới 1100px xếp ảnh trên/chart dưới. Khoảng cách với dãy app 40px và tiêu đề Q&A 56px (mobile 28px/36px). Bốn tab YoE / Soft / Hard / Tools dùng dữ liệu minh họa, chuyển nhóm bằng animation; YoE tính theo năm, các nhóm còn lại dùng thang điểm 10. Chỉnh object `groups` trong `src/scripts/pages/about/radar.js`. Bundle và license giữ tại `assets/vendor/apexcharts/`, không thêm React. Có điều khiển bàn phím, giảm chuyển động và danh sách điểm thay thế khi thư viện/JavaScript không sẵn sàng. Các chỉ số và avatar cũ vẫn vừa màn hình đầu trên laptop.

- Route `/about` tại `pages/about.html`, dùng chung nền pastel, topbar/mini player/footer với Project. Tầng đầu theo template about-hero.html, đồng bộ Oswald/Be Vietnam Pro và màu navy/pastel. Desktop >=1024px chia main thành hai hàng: cột trái gồm lời chào/nghề nghiệp, mô tả, CTA và 4 chỉ số; ảnh 4:5 bên phải trải qua cả hai hàng, tối đa 440px và co theo chiều cao viewport. Main cao tối thiểu 100svh, footer theo sau. Lời chào 38–56px, nghề nghiệp 22–32px; laptop cao <=740px dùng 36–44px/22px, mô tả 16px, khoảng cách và chỉ số gọn hơn. Đã kiểm tra toàn bộ chữ/nút/ảnh/thẻ tên/4 chỉ số trong màn hình đầu từ 1024×600 đến 1920×900. Tablet/mobile giữ layout xếp dọc. Nội dung và ảnh người dùng chỉnh được giữ nguyên; ảnh tại assets/images/about/portrait.jpg. Chỉ số: 2022 cố định, 3+ năm kinh nghiệm, 4+ dự án hoàn thành, 99+ tinh thần đồng đội; src/scripts/pages/about/stats.js cuộn tăng 1,8 giây một lần mỗi reload khi vào vùng nhìn, cuộn quay lại không chạy lại; giảm chuyển động/tắt JS hiện số cuối. CTA: Project. Liên kết About trên mọi trang dẫn /about và đánh dấu mục hiện tại. Hướng dẫn ở docs/content/about.md; style src/styles/pages/about/main.css.
- Nền được vẽ lại bằng SVG, giữ tông pastel và đường cong của bản tham chiếu; không nhúng ảnh nền raster cũ.
- Dùng đủ 7 icon clean do người dùng cung cấp; giữ PNG gốc và dùng WebP tối ưu trên web.
- Icon được bố trí lại trên điện thoại để không bị cắt do crop nền ngang.
- Thêm topbar theo `top-bar_2.html` do người dùng cung cấp; dùng màu light và menu responsive.
- Topbar: Home/Project/About/Contact căn trái trên desktop; Project thay Work và dẫn đến trang riêng `/Project` (`pages/projects/index.html`). Đánh dấu mục hiện tại theo trang; Home/Contact từ Project quay về Home đúng vị trí, không có hash. Bỏ ngôi sao, thay bằng mini player bên trái LinkedIn, có play/pause, tên bài hát chạy khi dài và tên ca sĩ. File `assets/audio/background/cho-anh-chut-thoi-khong-loi.mp3` đã có; thử autoplay với gain 40%, bị chặn thì chờ click/chạm đầu tiên. Nút pause chủ động sẽ không bị các click sau tự bật lại. Mobile giữ 3 social icon và menu; màn hình rất hẹp đưa metadata xuống dòng cho đủ chỗ.
- Project có 4 card dự án mẫu, nền pastel/topbar/footer cùng Home, Oswald cho tiêu đề và Be Vietnam Pro cho nội dung. Desktop 2 cột, mobile 1 cột; card có hover. Click mở 4 trang HTML riêng `/Project/project-01` đến `project-04`, mỗi trang gồm ảnh chính, mô tả và ảnh liên quan không giới hạn số lượng. Ảnh SVG mock được chép vào thư mục từng dự án, không tạo/gen ảnh mới. Skeleton theo trạng thái tải/giải mã ảnh thật, dừng khi hoàn tất/lỗi và tôn trọng giảm chuyển động. Thư mục ảnh `assets/images/projects/project-01` đến `project-04`; ảnh liên quan trong `related/`. Chạy `python tools/assets/sync_project_images.py --watch` hoặc `tools/assets/watch_project_images.cmd` cùng Live Server để tự cập nhật HTML khi thêm/xóa/đổi tên/thay ảnh, giữ nguyên nội dung ngoài vùng gallery. Hosting vẫn chỉ cần HTML tĩnh; chạy đồng bộ một lần trước khi đăng. Hướng dẫn tại README trong thư mục projects.
- Thêm riêng dây và card từ `lanyard_2.html`, thả từ mép trên, nằm sau topbar, mép phải card cách mép màn hình khoảng 15% khi đứng yên.
- Canvas dây/card phủ toàn viewport để không cắt thẻ khi kéo sang trái; topbar vẫn nằm trên canvas.
- Animation thả thẻ chỉ bắt đầu sau khi trang và font tải xong, ảnh được giải mã, texture và shader 3D được chuẩn bị.
- Tiêu đề bên trái dùng animation từ `hero-title_1.html`: tên “NGUYỄN QUỐC ANH DUY”; “Kinh Doanh” và “E-COMMERCE” ở hai dòng, hiện cùng lúc rồi trượt tới vị trí cuối: Kinh Doanh căn trái theo tên, E-COMMERCE nghiêng với chữ E nằm dưới chữ i trong Kinh. Không cắt dấu tiếng Việt. Trên màn hình hẹp, chữ xếp dưới card.
- Không tự thêm nội dung giới thiệu, dự án, thông tin liên hệ hay section demo.
- Timeline Home theo `work-timeline_1.html` được người dùng yêu cầu: 5 mốc lorem chờ điền, chạy đều liên tục 1000ms/mốc, tới cuối thì đứng lại, hỗ trợ mobile.
- Mỗi mốc tối đa 3 ảnh mẫu, khung 1:1 xếp chồng nghiêng, bật lên lần lượt sau khi tới mốc; hover để phóng lớn trên desktop, chạm trên mobile. Cụm ảnh mốc cuối nằm bên phải.
- File gốc có viewport responsive và hỗ trợ prefers-reduced-motion.
- Phần cuộn dọc sau timeline theo `scroll-track.html`: 5 chặng ảnh/chữ xen kẽ, cùng khung căn giữa `min(90%, 1223px)` với tầng 1–2; desktop chiếm 70% bên trái trong khung nội dung, ảnh và khoảng cách khoảng 70% demo; chấm chạy theo cuộn, mobile xếp dọc vừa màn hình.
- Mỗi chặng tầng 3 có 4 ảnh dọc xếp chồng, desktop hover bung lần lượt ra xung quanh; mobile tự bung khi cụm ảnh/tiêu đề tới giữa màn hình, ra khỏi vùng giữa thì thu lại. Vẫn hỗ trợ chạm, bàn phím và giảm chuyển động.
- Logo công ty PNG 1:1 phía trên tiêu đề mỗi chặng tầng 3, cùng lề trái; khung desktop 40×40px, mobile 32×32px, giữ trọn hình. Thay file `logo.png` trong từng thư mục `assets/images/home/journey/moc-01` đến `moc-05`.
- Mỗi mốc tầng 3 có chức danh 14px (`.scroll-story-position`) và thời gian 13px (`.scroll-story-period`) ngay sau, cách 12px dưới tên công ty. Thiếu chỗ thì thời gian xuống dòng, cùng căn trái để giữ thành một cụm gọn.
- Mô tả và bài học trong mỗi mốc tầng 3 mặc định thu gọn bằng native details. Ảnh/logo/tên/vị trí/thời gian luôn hiển thị. Chấm tím là nút 44px mở/thu gọn tất cả 5 mốc; trạng thái mở một phần sẽ mở nốt các mốc còn lại. Nút Xem chi tiết/Thu gọn riêng vẫn điều khiển từng mốc. Chiều cao và chữ chuyển động mượt ở cả hai chiều, hỗ trợ đảo chiều giữa animation; đường SVG cập nhật theo bố cục. Mobile dùng nút từng mốc; giảm chuyển động mở/đóng ngay; tắt JS dùng native details.
- Home tầng 3 và phần giới thiệu About không có nút tải CV/PDF. About giữ nút “Xem dự án”.
- Cột 30% bên phải tầng 3 là “Điều mình học được”, sticky và chuyển bài học theo chặng đang đọc; có 5 nội dung mẫu để thay sau. Tablet/mobile hiển thị bài học dưới từng chặng.
- Tầng 4 gồm card đánh giá đồng nghiệp theo ảnh tham chiếu, đổi sang nền sáng: 5 sao, nhận xét, avatar và tên/chức danh. Có 8 card; chạy liên tục từ mép phải sang trái toàn màn hình, vòng lặp liền mạch 42px/giây. Không có nút tạm dừng; giữ chuột/chạm kéo hai chiều, thả tay tự chạy tiếp từ vị trí vừa kéo. Hỗ trợ bàn phím và cuộn trang dọc mobile; dừng khi ngoài màn hình/ẩn tab và chuyển sang cuộn tay khi giảm chuyển động hoặc không có JavaScript. Ảnh tại `assets/images/home/testimonials/avatars/`.
- Tầng 5 là form theo `contact-form.html`, đổi sang màu light xanh và font hiện tại; ảnh dọc 3:4 bên trái, form lớn bên phải. Cả khối rộng bằng khung `min(90%, 1223px)` của các tầng trên. Mobile ảnh cạnh tiêu đề, form bên dưới với chữ dễ đọc. Ảnh mẫu và hướng dẫn thay ảnh nằm trong `assets/images/shared/`. Form đang xem trước, chưa nối gửi tin. Contact trên topbar cuộn đến form mà không thêm hash.
- Footer có email và số điện thoại đang dùng, 3 icon LinkedIn/Zalo/Website giống topbar; bản quyền NUT liên kết tới Zalo `https://zalo.me/0866214216`. Responsive theo khung nội dung chung.
- Ảnh 3:4 tầng 5 giữ nguyên vị trí/kích thước; hiệu ứng `hover-card_1.html` chỉ áp lên 14 nhãn, rải và xáo trộn ngẫu nhiên mỗi lần tải. Desktop rê qua vùng ảnh để bật từng nhãn; mobile chạm để xem lần lượt; có bàn phím và giảm chuyển động. Giữ nguyên nội dung nhãn người dùng cung cấp.
- Mobile từ tầng 2 trở xuống dùng layout riêng, không thu nhỏ toàn bộ desktop: chữ nội dung 14–16px; tầng 2 đường chạy dọc bên trái, 5 mốc và nội dung/ảnh xếp dọc, không cuộn ngang hay ẩn mốc cũ; tầng 3 album cạnh tiêu đề, mô tả/bài học toàn hàng; form/footer xếp dọc. Tầng đầu giữ nguyên.

## Evidence on Hand

- `C:\Users\Kittyumbs\Downloads\portfolio-background-animated.html` — nguồn gốc của `pages/home.html`.
- `C:\Users\Kittyumbs\Downloads\top-bar_2.html` — nguồn gốc của topbar.
- `C:\Users\Kittyumbs\Downloads\lanyard_2.html` — nguồn gốc dây và card 3D, gồm hình vẽ mẫu và tương tác kéo/lật.
- `assets/images/background/hero.svg` — nền vector được vẽ lại.
- `design-sources/background-icons/*-clean.png` — 7 icon PNG gốc do người dùng thiết kế.
- `C:\Users\Kittyumbs\Downloads\hero-title_1.html` — nguồn animation tiêu đề.

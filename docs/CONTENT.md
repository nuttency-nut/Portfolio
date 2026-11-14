# Điền nội dung và thay tài nguyên

Các đường dẫn dưới đây tính từ thư mục gốc dự án. Chỉnh HTML trong `pages/`, xem trực tiếp bằng `npm run dev`; chạy `npm run build` để xuất sang `dist/`. Không sửa trực tiếp file HTML trong `dist/`. Tên file không chứa dấu/khoảng trắng sẽ tiện quản lý hơn. Nếu đổi tên hoặc đuôi ảnh, sửa `src` tương ứng trong HTML/JS; gallery `related/` có script riêng tự đồng bộ.

## Home

Sửa chữ trực tiếp trong `pages/home.html`:

| Phần | Vị trí nội dung | Thư mục ảnh |
| --- | --- | --- |
| Tên/nghề nghiệp và mô tả đánh máy | `.hero-title`, `.hero-description-source` | — |
| Card nhân viên 3D | `src/scripts/pages/home/lanyard.js`, hàm `CONFIG` và nội dung vẽ card | `assets/images/home/lanyard/` |
| Timeline 5 mốc | `.work-timeline-item` | `assets/images/home/timeline/moc-01/` … `moc-05/` |
| Khám phá bước ngoặc | `.scroll-story-row`, đoạn mô tả `.scroll-story-description-source` | `assets/images/home/journey/moc-01/` … `moc-05/` |
| Đồng nghiệp nhận xét | Các card gốc trong `.testimonials` | `assets/images/home/testimonials/avatars/` |

Card dùng `portrait.jpg` cho ảnh chân dung và `back-logo.png` cho logo mặt sau. Thay file cùng tên giữ nguyên đường dẫn; logo nên là PNG vuông trong suốt.

Timeline dùng tối đa 3 ảnh vuông mỗi mốc. Journey dùng 4 ảnh dọc mỗi mốc và `logo.png` vuông cho công ty; nhớ sửa cả chức danh và thời gian trong `.scroll-story-heading-group`.

Chi tiết: [timeline](content/timeline.md), [journey](content/journey.md), [đồng nghiệp](content/testimonials.md).

## About

Sửa phần giới thiệu, bốn chỉ số, các ý kỹ năng, Q&A và liên kết Hobby trong `pages/about.html`.

- Ảnh chân dung chính: `assets/images/about/portrait.jpg`, khung 4:5.
- Ảnh cạnh radar hiện tại: `assets/images/about/radar-photo.jpg`, khung 4:3. Nếu đổi tên file, sửa `.about-radar-photo img`.
- Điểm/nhãn của 4 tab radar: object `groups` trong `src/scripts/pages/about/radar.js`. Đây vẫn là dữ liệu minh họa.
- Logo ứng dụng: `assets/icons/apps/`; các link ứng dụng nằm trong `pages/about.html`.
- Logo công ty trên thẻ tên đang lấy từ các thư mục `assets/images/home/journey/moc-0N/`.

CSS/JS riêng ở `src/styles/pages/about/` và `src/scripts/pages/about/`.

## Project

Mỗi dự án có một thư mục riêng:

```text
assets/images/projects/project-01/
  cover.svg        Ảnh card, khung 16:10
  hero.svg         Ảnh chính, khung 16:9
  related/         Mọi ảnh liên quan, không giới hạn số lượng
```

Đổi `cover.svg`/`hero.svg` sang JPG/PNG/WebP thì cập nhật `src` trong trang danh sách/chi tiết. Thêm ảnh vào `related/` rồi chạy `python tools/assets/sync_project_images.py --watch` để cập nhật gallery. Không sửa tay vùng `project-gallery:start` đến `project-gallery:end` vì script quản lý vùng này.

Xem [hướng dẫn dự án](content/projects.md).

## Hobby

Nội dung Bento nằm trong `pages/hobby.html`; logic riêng ở `src/scripts/pages/hobby/`.

| Loại | Thư mục |
| --- | --- |
| Avatar gấu và ảnh thể thao | `assets/images/hobby/` |
| Sách | `assets/images/hobby/books/` |
| Poster phim | `assets/images/hobby/movies/` |
| Bìa nhạc | `assets/images/hobby/music-covers/` |
| MP3 playlist | `assets/audio/hobby/` |

Năm tên MP3 đã được chuẩn hóa; nội dung âm thanh không đổi:

| Bài | File |
| --- | --- |
| If Only | `if-only.mp3` |
| Golden Night | `golden-night.mp3` |
| Just Being Friendly | `just-being-friendly.mp3` |
| Golden Hour | `golden-hour.mp3` |
| Guess Who? | `guess-who.mp3` |

Đổi bài, tên ca sĩ, tên file hoặc bìa tại mảng `tracks` ở đầu `src/scripts/pages/hobby/music.js`. Giấy phép/nguồn của ảnh được giữ cạnh tài nguyên tương ứng.

## Form, topbar, footer và nhạc nền

- Ảnh Contact dùng chung: `assets/images/shared/contact.jpg`, khung 3:4.
- Nội dung form cuối Home/About: `pages/home.html` và `pages/about.html`.
- Form popup: template trong `src/scripts/shared/contact.js`.
- Footer dùng chung: sửa nội dung tại `src/scripts/shared/footer.js`, giao diện tại `src/styles/shared/footer.css`. Home, About, Project và các trang chi tiết gọi cùng component qua `<footer data-site-footer>` và script này; Hobby không có footer.
- Topbar: HTML của từng trang; logic chung và CSS nằm trong các thư mục `src/scripts/shared/`, `src/styles/shared/`.
- MP3 nền: `assets/audio/background/cho-anh-chut-thoi-khong-loi.mp3`. Đổi bài thì sửa tên bài/ca sĩ/`src` trong topbar các trang. Logic phát tiếp khi chuyển trang ở `src/scripts/shared/topbar-music.js`.
- Favicon: `assets/icons/favicon/favicon.svg`, dùng chung cho mọi trang.
- CV giữ tại `assets/documents/cv/`; hiện không có nút tải CV trên Home/About.

## Nền và icon thiết kế gốc

Nền SVG ở `assets/images/background/`. WebP trang trí ở `assets/images/background/icons/`; PNG gốc giữ tại `design-sources/background-icons/`.

Khi chỉnh PNG gốc, chạy `python tools/assets/prepare_icons.py` để xuất lại WebP 320×320 (cần Pillow). Không cần chạy lại nếu chỉ sửa chữ hoặc ảnh khác.

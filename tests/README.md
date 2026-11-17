# Kiểm tra dự án

Chạy lệnh từ thư mục gốc. Mở dev bằng `npm run dev` tại `http://127.0.0.1:4173/`; đặt `PORTFOLIO_URL` nếu dùng cổng khác. Để chạy test không bị tự reload khi gallery thay đổi, mở server bằng `node tools/serve.mjs --no-reload`.

## Không cần browser

```powershell
python tools/check_paths.py
python tests/unit/project-image-folders.py
node tests/unit/build.mjs
node tests/unit/contact-api.mjs
node tests/unit/zalo-chat-id.mjs
node tests/unit/lanyard-startup.mjs
node tests/unit/lanyard-physics.mjs
```

Hai bài kiểm tra lanyard tải đúng phiên bản Three.js đang dùng trên web, nên cần mạng.

## Browser

Cần Node.js và Playwright. `tests/helpers/browser.mjs` dùng `PLAYWRIGHT_MODULE` nếu chỉ định đường dẫn tới `playwright/index.mjs`, hoặc import package `playwright` đã cài trong môi trường dev. Không cần Playwright để chạy website.

Có thể dùng Playwright cài ngoài dự án để tránh tạo `node_modules` ở đây:

```powershell
npm install --prefix "$env:TEMP/portfolio-qa" playwright
$env:PLAYWRIGHT_MODULE = "$env:TEMP/portfolio-qa/node_modules/playwright/index.mjs"
```

Windows có Brave tại vị trí mặc định thì test dùng Brave. Đặt `PORTFOLIO_BROWSER` để chọn executable khác; nếu không có Brave và không chỉ định executable, Playwright dùng Chromium đã cài trong môi trường của nó.

```powershell
node tests/browser/site-assets-browser.mjs
node tests/browser/server-http.mjs
node tests/browser/project-gallery-browser.mjs
node tests/browser/project-masonry-browser.mjs
node tests/browser/project-navigation-browser.mjs
node tests/browser/topbar-music-browser.mjs
node tests/browser/topbar-music-navigation-browser.mjs
node tests/browser/contact-browser.mjs
node tests/browser/contact-delivery-browser.mjs
node tests/browser/sharing-browser.mjs
node tests/browser/about-radar-browser.mjs
node tests/browser/lanyard-render-browser.mjs
node tests/browser/home-background-browser.mjs
node tests/browser/testimonials-links-browser.mjs
node tests/browser/scroll-story-video-browser.mjs
```

`site-assets-browser` mở cả 8 route trên desktop/mobile, giải mã ảnh nội bộ, kiểm tra lỗi JavaScript/404 và phát thật đủ 5 MP3 Hobby.

`lanyard-render-browser` kiểm tra hai mặt thẻ ở nhiều góc, mô phỏng depth buffer 16-bit để bắt lỗi nhấp nháy và kiểm tra canvas không bị reset khi kích thước vẽ giữ nguyên.

`home-background-browser` kiểm tra nền bám đủ chiều cao tầng đầu khi viewport mobile giãn ra hoặc nội dung xuống nhiều dòng; tầng 2 vẫn nằm ngoài màn hình đầu.

Các test gallery có thao tác thêm/xóa ảnh mẫu tạm thời và đồng bộ HTML nguồn trong `pages/projects/`, nên chạy trên dev server và chạy riêng trước khi chạy các test khác truy cập trang Project. Test `site-assets-browser` cũng chạy được trên bản xuất: `npm run build`, mở `npm run preview`, rồi đặt `PORTFOLIO_URL=http://127.0.0.1:4174/`.

## Kết quả và ảnh chụp

Mặc định **không chụp màn hình**. Muốn chụp trong một lượt kiểm tra:

```powershell
$env:PORTFOLIO_SCREENSHOTS = '1'
node tests/browser/site-assets-browser.mjs
Remove-Item Env:PORTFOLIO_SCREENSHOTS
```

Ảnh nằm trong thư mục tạm của hệ điều hành: `%TEMP%/portfolio-test-artifacts/`, tách theo tên bài kiểm tra. Báo cáo tọa độ của test hero cũng nằm ở đó. Không tạo lại thư mục ảnh chụp trong mã nguồn.

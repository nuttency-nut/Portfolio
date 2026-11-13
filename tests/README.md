# Kiểm tra dự án

Chạy lệnh từ thư mục gốc. Web cần một server tĩnh, mặc định `http://127.0.0.1:4173/`; đặt `PORTFOLIO_URL` nếu dùng cổng khác.

## Không cần browser

```powershell
python scripts/check_paths.py
python tests/unit/project-image-folders.py
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
node tests/browser/project-gallery-browser.mjs
node tests/browser/project-navigation-browser.mjs
node tests/browser/topbar-music-browser.mjs
node tests/browser/topbar-music-navigation-browser.mjs
node tests/browser/contact-browser.mjs
node tests/browser/about-radar-browser.mjs
```

`site-assets-browser` mở cả 8 route trên desktop/mobile, giải mã ảnh nội bộ, kiểm tra lỗi JavaScript/404 và phát thật đủ 5 MP3 Hobby.

Các test gallery có thao tác thêm/xóa ảnh mẫu tạm thời và đồng bộ HTML, nên chạy riêng test này trước khi chạy các test khác truy cập trang Project.

## Kết quả và ảnh chụp

Mặc định **không chụp màn hình**. Muốn chụp trong một lượt kiểm tra:

```powershell
$env:PORTFOLIO_SCREENSHOTS = '1'
node tests/browser/site-assets-browser.mjs
Remove-Item Env:PORTFOLIO_SCREENSHOTS
```

Ảnh nằm trong thư mục tạm của hệ điều hành: `%TEMP%/portfolio-test-artifacts/`, tách theo tên bài kiểm tra. Báo cáo tọa độ của test hero cũng nằm ở đó. Không tạo lại thư mục ảnh chụp trong mã nguồn.

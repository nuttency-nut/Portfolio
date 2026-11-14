# Ảnh tầng đầu About

## Radar năng lực

Khối ảnh/radar nằm ngay sau tầng “Trợ thủ không thể thiếu…” và trước Q&A. Desktop đặt ảnh 4:3 bên trái và radar bên phải, hai khung bằng chiều cao. Dưới 1100px xếp ảnh trên, chart dưới để giữ nhãn dễ đọc. Ảnh người dùng đang dùng được giữ nguyên tại `assets/images/about/radar-photo.jpg`. Khi đổi tên/đuôi ảnh, sửa `src` của `.about-radar-photo img` trong `pages/about.html`; khung vẫn giữ 4:3. Khoảng cách với dãy app là 40px (mobile 28px), với tiêu đề Q&A là 56px (mobile 36px).

Radar dùng ApexCharts 8.8.2 từ mẫu Basic Radar. Bốn tab YoE / Soft / Hard / Tools chuyển nhóm dữ liệu với animation. Các giá trị hiện tại đều là **dữ liệu minh họa**. YoE dùng đơn vị năm (0–5), ba nhóm còn lại dùng thang điểm 10.

Sửa nhãn, điểm, tiêu đề và mô tả trong object `groups` ở `src/scripts/pages/about/radar.js`. Style tại `src/styles/pages/about/radar.css`, HTML tại `.about-radar` trong `pages/about.html`. Thư viện và license gốc được lưu tại `assets/vendor/apexcharts/`, không cần cài React hay npm. Khi thư viện không tải hoặc JavaScript bị tắt, danh sách điểm mẫu vẫn đọc được.

## Ảnh chân dung

`assets/images/about/portrait.jpg` là ảnh chân dung người dùng đang dùng, được giữ nguyên. Thay file này hoặc sửa `src` trong `.about-photo img` của `pages/about.html` nếu muốn dùng tên/đuôi file khác.

Khung hiển thị tỷ lệ **4:5**, gợi ý ảnh 880×1100px hoặc lớn hơn. Ảnh giữ tỷ lệ, crop vừa khung; chỉnh `object-position` trong `src/styles/pages/about/main.css` nếu muốn đổi vùng crop.

Tầng đầu trên desktop (từ 1024px) được chia thành hai cột: bên trái là lời chào/nghề nghiệp, mô tả, hai nút và 4 chỉ số; ảnh bên phải trải qua cả hai hàng. Main cao tối thiểu một viewport, footer bắt đầu phía sau tầng đầu. Lời chào 38–56px, nghề nghiệp 22–32px; laptop cao tối đa 740px dùng lời chào 36–44px, nghề nghiệp 22px và mô tả 16px. Ảnh giữ 4:5, rộng tối đa 440px và tự co theo chiều cao còn lại. Đã kiểm tra đủ nút/ảnh/thẻ tên/**toàn bộ 4 chỉ số** ở 1024×600, 1280×620, 1366×650, 1440×720, 1536×780 và 1920×900. Tablet/mobile giữ bố cục xếp dọc và hàng chỉ số bên dưới. Nội dung người dùng đang chỉnh được giữ nguyên.

Bản mô tả đầy đủ trước khi rút gọn, giữ lại để tiện tham khảo:

> Mình luôn làm việc với tinh thần trách nhiệm, biết lắng nghe, chọn lọc và đưa ra giải pháp phù hợp, không ngại khó khăn và sẵn sàng vượt qua thử thách.
>
> Định hướng của mình là trở thành một phần có ích trong doanh nghiệp, đồng thời nuôi dưỡng ước mơ kinh doanh riêng trong ngành bán lẻ.

Chữ trong `.about-name-tag`, tiêu đề và mô tả đều sửa trực tiếp trong `pages/about.html`. Bốn ô `.about-stat` hiện là **2022** bắt đầu hành trình, **3+** năm kinh nghiệm, **4+** dự án hoàn thành và **99+** tinh thần đồng đội theo yêu cầu của người dùng. Sửa `<dt>` và `.about-stat-description` để đổi nhãn/mô tả.

Ba số 3+/4+/99+ cuộn tăng trong 1,8 giây khi ít nhất một nửa số nằm trong vùng nhìn. Mỗi số chỉ chạy **một lần mỗi lượt tải trang**; cuộn đi rồi quay lại không chạy lại. Reload trang sẽ cho phép đếm lại. Mốc 2022 giữ nguyên. Logic nằm trong `src/scripts/pages/about/stats.js`, không cần thư viện. Giảm chuyển động hoặc tắt JavaScript sẽ hiện ngay số cuối; trình đọc màn hình luôn nhận giá trị cuối, không đọc từng số trung gian.

Đổi số trong cả `data-count` và text của `.about-stat-value`, ví dụ `data-count="3" data-suffix="+">3+</dd>`. Sửa `data-suffix` nếu muốn đổi dấu phía sau. `.about-actions` hiện chỉ giữ nút “Xem dự án”; nút CV đã được gỡ.

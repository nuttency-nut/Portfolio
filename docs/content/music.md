# Nhạc trên topbar

Player dùng bài **Chờ anh chút thôi (Không lời)** — **CONGB**. File MP3 đã được thêm.

Đặt file MP3 bản không lời vào đúng đường dẫn:

```text
assets/audio/background/cho-anh-chut-thoi-khong-loi.mp3
```

Giữ đúng tên thì không cần sửa code. Tải trang sẽ thử tự phát; nếu trình duyệt chặn, nhạc chờ lần click/chạm đầu tiên hoặc nút play. Nếu trước đó trình duyệt lưu lỗi tải nhạc, dùng Ctrl + F5.

Bấm liên kết nội bộ giữa Home, Project, chi tiết dự án và About sẽ tiếp tục từ vị trí đang nghe, cùng trạng thái phát hoặc tạm dừng. Nút Back/Forward cũng khôi phục vị trí nghe. Mở trang trực tiếp hoặc tải lại sẽ bắt đầu bài từ đầu và thử tự phát.

Trạng thái được chuyển qua `sessionStorage` trong cùng tab. Mỗi trang HTML tải một audio riêng, nên có thể có khoảng ngắt ngắn trong lúc chuyển trang.

Muốn đổi bài khác, trong `pages/home.html`:

1. Sửa chữ trong `.music-title` thành tên bài hát.
2. Sửa chữ trong `.music-artist` thành tên ca sĩ.
3. Đổi `src` của `.music-audio` sang đúng tên file mới.

Nút play/pause dùng audio thật của trình duyệt. Nhạc lặp lại, đặt mức **40%** trước khi phát bằng Web Audio GainNode (kể cả khi iOS không cho chỉnh `audio.volume`). Trình duyệt không hỗ trợ Web Audio dùng `audio.volume = 0.4`. Đổi `MUSIC_VOLUME` trong `src/scripts/shared/topbar-music.js` để chỉnh mức nhạc.

Đây là hệ số âm lượng của nhạc trên website, không đọc hoặc thay đổi âm lượng hệ thống. Độ to thực tế còn phụ thuộc loa/tai nghe và mức âm lượng của máy. Trang không thể đảm bảo tự phát có tiếng trên mọi trình duyệt; luôn giữ nút play/pause. Sau khi người xem chủ động pause, các lần click khác không tự phát lại.

Tên bài hát dài tự chạy ngang khi không đủ chỗ; chế độ giảm chuyển động giữ chữ đứng yên. File audio tải khi thử autoplay, được chuẩn bị thành Blob để tua đúng vị trí kể cả trên server HTML không hỗ trợ byte-range.

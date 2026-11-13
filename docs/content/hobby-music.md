# Nhạc trong Bento Hobby

Các file MP3 được giữ nguyên âm thanh và chuẩn hóa tên trong `assets/audio/hobby/`.

| Bài hát | Ca sĩ | File trong `assets/audio/hobby/` |
| --- | --- | --- |
| ขอโทษได้ไหม (If Only) | NONT TANONT & BILLKIN | `if-only.mp3` |
| ของขวัญปีใหม่ (Golden Night) | Jeff Satur | `golden-night.mp3` |
| เพื่อนเล่น ไม่เล่นเพื่อน (Just Being Friendly) | Tilly Birds feat. MILLI | `just-being-friendly.mp3` |
| Golden Hour | BILLKIN | `golden-hour.mp3` |
| เธอ ๆ เพื่อนเราชอบ (Guess Who?) | SERIOUS BACON | `guess-who.mp3` |

Mở `/about/hobby`, bấm thẻ nhạc để nghe. Bấm lại thẻ đang phát để tạm dừng hoặc phát tiếp. Chọn bài khác để đổi bài. Bấm ra ngoài để thu các thẻ lại và tạm dừng.

Player dùng âm lượng 40%, thanh tiến trình theo thời gian thật của file. Khi chưa có MP3, player hiện thông báo. Sau khi thêm file, có thể bấm lại thẻ để thử tải lại.

Ảnh bìa vuông cùng bản phát hành với các ảnh tham chiếu nằm trong `assets/images/hobby/music-covers/`, tải từ Apple Music. Nguồn ảnh nằm trong file `SOURCES.json` ở cùng thư mục bìa.

Tên tiếng Anh hiển thị trên thẻ. Tên tiếng Thái và ca sĩ đầy đủ có trong tooltip và nhãn hỗ trợ đọc màn hình. Cấu hình từng bài nằm ở đầu file `src/scripts/pages/hobby/music.js`. Khi đổi tên MP3, sửa thuộc tính `file` tương ứng thành tên đầy đủ, gồm cả `.mp3`. Thuộc tính `cover` dùng cho tên ảnh bìa riêng.

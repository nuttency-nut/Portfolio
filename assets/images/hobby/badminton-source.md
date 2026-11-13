# Ảnh nền cầu lông

`badminton.png` là bản xử lý bằng công cụ imagegen tích hợp từ ảnh cầu lông người dùng đính kèm trong chat. File nguồn đính kèm không có đường dẫn trong workspace. Bản xử lý có thể có khác biệt về chi tiết so với ảnh gốc.

Overlay tối và vị trí hiển thị được áp dụng bằng CSS trong `src/styles/pages/hobby/main.css`, lớp `.h-tile--badminton`.

Prompt đã dùng

> Edit target: the USER'S BADMINTON PHOTO in this conversation. Identify the correct target by the green badminton court, the player seen from behind wearing a cream/brown/light gray color-block shirt and black shorts, holding a badminton racket, with a blue ROYAL HELMET wall advertisement behind him. Ignore the other photo of a man in a bridal jewelry shop. Produce a clean photographic background asset cropped from the badminton photo, focusing on the back-view player, racket, and surrounding court. Use the existing photo as the actual source and retain the original person's appearance, exact clothing, pose, racket, lighting and venue. Preserve photographic detail and colors. Keep the image in portrait orientation approximately 9:16. Do not redesign, stylize, add subjects or objects, or add text. Do not add a frame, watermark, gradient, or overlay. The website will apply its own dark overlay in CSS. This is a photo crop/export task, with the provided photograph as the sole visual source.

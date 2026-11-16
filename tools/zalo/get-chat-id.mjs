// Prints only chat identity. Tokens and message contents are never printed.
const token = process.env.ZALO_BOT_TOKEN?.trim();
if (!token) {
  console.error('Điền ZALO_BOT_TOKEN trong .env.local trước, sau đó chạy lại npm run zalo:chat-id.');
  process.exitCode = 1;
} else {
  try {
    const call = async (method, body = {}) => {
      const response = await fetch(`https://bot-api.zaloplatforms.com/bot${encodeURIComponent(token).replace(/%3A/gi, ':')}/${method}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(25_000)
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true) {
        const error = new Error('API_FAILED');
        error.apiCode = Number(data.error_code);
        throw error;
      }
      return data.result;
    };
    let webhook;
    try { webhook = await call('getWebhookInfo'); }
    catch (error) {
      // Missing webhook info can return 404. Polling itself still rejects an active webhook.
      if (error.apiCode !== 404) throw error;
    }
    if (webhook?.url) {
      console.log('Bot đang dùng webhook. Lấy message.chat.id trong sự kiện webhook hiện tại; công cụ này không xóa hay thay đổi webhook.');
    } else {
      console.log('Mở Zalo và nhắn một tin đến bot của em. Đang chờ tối đa 20 giây…');
      const update = await call('getUpdates', { timeout: '20' });
      const chat = update?.message?.chat;
      if (!chat?.id) console.log('Chưa nhận được chat ID. Nhắn tin cho bot rồi chạy lại lệnh.');
      else {
        console.log('Người gửi:', update.message.from?.display_name || '(không có tên)');
        console.log('Loại chat:', chat.chat_type || '(không xác định)');
        console.log('ZALO_CHAT_ID=' + chat.id);
        console.log('Kiểm tra đây là cuộc trò chuyện của em rồi điền ID này vào .env.local.');
      }
    }
  } catch (error) {
    if (error.apiCode === 408) console.log('Chưa có tin mới trong lượt chờ này. Nhắn thêm một tin cho bot rồi chạy lại npm run zalo:chat-id.');
    else {
      console.error('Chưa lấy được chat ID. Kiểm tra Bot Token/kết nối, nhắn tin cho bot rồi thử lại. Token không được in ra màn hình.');
      process.exitCode = 1;
    }
  }
}

const MAX_BODY_BYTES = 8192;
const services = new Set(['', 'Leader thực hiện dự án', 'Leader vận hành thương mại điện tử', 'Nhân viên xây dựng quy trình hệ thống', 'Nhân viên phân tích dữ liệu']);
const attempts = new Map();

function readBody(request) {
  if (request.body !== undefined) {
    if (Buffer.byteLength(typeof request.body === 'string' ? request.body : JSON.stringify(request.body)) > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
    return Promise.resolve(typeof request.body === 'string' ? JSON.parse(request.body) : request.body);
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { reject(new Error('BODY_TOO_LARGE')); return; }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (size > MAX_BODY_BYTES) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('INVALID_JSON')); }
    });
    request.on('error', reject);
  });
}

export default async function contact(request, response) {
  const reply = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(JSON.stringify(body));
  };
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return reply(405, { ok: false, message: 'Phương thức không được hỗ trợ.' });
  }
  try {
    const origin = new URL(request.headers.origin);
    if (origin.host !== request.headers.host || !['https:', 'http:'].includes(origin.protocol)) throw new Error();
  } catch {
    return reply(403, { ok: false, message: 'Vui lòng gửi lời nhắn từ form trên website.' });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) return reply(415, { ok: false, message: 'Định dạng lời nhắn không hợp lệ.' });
  let body;
  try { body = await readBody(request); }
  catch (error) { return reply(error.message === 'BODY_TOO_LARGE' ? 413 : 400, { ok: false, message: 'Nội dung không hợp lệ hoặc quá dài.' }); }
  if (!body || Array.isArray(body) || typeof body !== 'object') return reply(400, { ok: false, message: 'Thông tin không hợp lệ.' });
  const fields = { name: 100, email: 254, service: 100, message: 1200 };
  for (const [field, limit] of Object.entries(fields)) {
    if (typeof body[field] !== 'string' || body[field].length > limit) return reply(400, { ok: false, message: 'Vui lòng kiểm tra độ dài và nội dung các trường.' });
  }
  const name = body.name.trim().replace(/[\r\n]+/g, ' ');
  const email = body.email.trim();
  const service = body.service.trim();
  const message = body.message.trim();
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !services.has(service) || body.company_website) return reply(400, { ok: false, message: 'Vui lòng kiểm tra tên, email và lựa chọn của bạn.' });
  const token = process.env.ZALO_BOT_TOKEN?.trim();
  const chatId = process.env.ZALO_CHAT_ID?.trim();
  if (!token || !chatId) return reply(503, { ok: false, message: 'Hiện chưa thể gửi lời nhắn. Bạn có thể liên hệ qua email ở cuối trang.' });

  // A per-instance burst guard; use platform firewall rules for a shared, global limit.
  const now = Date.now();
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
  const ip = String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const recent = attempts.get(ip) || { count: 0, until: now + 60_000 };
  if (recent.count >= 3) {
    response.setHeader('Retry-After', String(Math.ceil((recent.until - now) / 1000)));
    return reply(429, { ok: false, message: 'Bạn đã gửi nhiều lần. Vui lòng chờ một phút rồi thử lại.' });
  }
  recent.count++;
  attempts.set(ip, recent);
  const text = ["Liên hệ mới · Let's Work Together", `Tên: ${name}`, `Email: ${email}`, `Nhu cầu: ${service || 'Chưa chọn'}`, '', 'Lời nhắn:', message || '(Không có nội dung)'].join('\n');
  try {
    const sent = await fetch(`https://bot-api.zaloplatforms.com/bot${encodeURIComponent(token).replace(/%3A/gi, ':')}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(10_000)
    });
    const result = await sent.json();
    if (!sent.ok || result.ok !== true) throw new Error('DELIVERY_FAILED');
    return reply(200, { ok: true });
  } catch {
    // Never return or log upstream errors: their URL can contain the bot token.
    return reply(502, { ok: false, message: 'Chưa nhận được xác nhận gửi lời nhắn. Vui lòng kiểm tra lại sau hoặc liên hệ qua email ở cuối trang.' });
  }
}

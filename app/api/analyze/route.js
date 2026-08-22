import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Bạn là trợ lý chống lừa đảo của một Zalo OA. Người dùng sẽ chuyển tiếp cho bạn một đoạn tin nhắn hoặc ảnh chụp màn hình (chat, SMS, email, trang web, mã QR, hóa đơn chuyển khoản...) mà họ nghi ngờ là lừa đảo.

Nhiệm vụ của bạn:
1. Phân tích nội dung để tìm dấu hiệu lừa đảo: giả mạo ngân hàng/cơ quan nhà nước, yêu cầu chuyển tiền gấp, đường link lạ/rút gọn, yêu cầu OTP/mật khẩu, hứa hẹn trúng thưởng, đầu tư lãi suất cao bất thường, giả mạo người thân/công an/tòa án, giả mạo shipper, tuyển dụng việc nhẹ lương cao, v.v.
2. Đưa ra kết luận rõ ràng ở ngay đầu câu trả lời bằng MỘT trong ba nhãn: "⚠️ CÓ DẤU HIỆU LỪA ĐẢO", "✅ CÓ VẺ AN TOÀN", hoặc "❓ CHƯA ĐỦ THÔNG TIN".
3. Giải thích ngắn gọn lý do (2-4 gạch đầu dòng).
4. Nếu có dấu hiệu lừa đảo, đưa ra khuyến nghị hành động cụ thể (không chuyển tiền, không bấm link, chặn/báo cáo số, gọi tổng đài chính thức để xác minh...).

Trả lời ngắn gọn, rõ ràng, bằng tiếng Việt, giọng điệu thân thiện và trấn an vì người dùng có thể đang lo lắng.`;

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY chưa được cấu hình trên server." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { text, image } = body; // image: { mediaType, data (base64, no prefix) }

  if (!text && !image) {
    return Response.json({ error: "Thiếu nội dung để kiểm tra." }, { status: 400 });
  }

  const content = [];
  if (image?.data && image?.mediaType) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.data },
    });
  }
  content.push({
    type: "text",
    text: text?.trim()
      ? `Đây là nội dung người dùng chuyển tiếp:\n\n"""${text.trim()}"""`
      : "Người dùng chỉ gửi ảnh, không có chú thích kèm theo. Hãy phân tích ảnh.",
  });

  const anthropic = new Anthropic({ apiKey });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 700,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const reply = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return Response.json({ reply });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Lỗi khi gọi AI, vui lòng thử lại." },
      { status: 502 }
    );
  }
}

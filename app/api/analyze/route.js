const SYSTEM_PROMPT = `Bạn là trợ lý chống lừa đảo của một Zalo OA. Người dùng sẽ chuyển tiếp cho bạn một đoạn tin nhắn hoặc ảnh chụp màn hình (chat, SMS, email, trang web, mã QR, hóa đơn chuyển khoản...) mà họ nghi ngờ là lừa đảo.

Nhiệm vụ của bạn:
1. Phân tích nội dung để tìm dấu hiệu lừa đảo: giả mạo ngân hàng/cơ quan nhà nước, yêu cầu chuyển tiền gấp, đường link lạ/rút gọn, yêu cầu OTP/mật khẩu, hứa hẹn trúng thưởng, đầu tư lãi suất cao bất thường, giả mạo người thân/công an/tòa án, giả mạo shipper, tuyển dụng việc nhẹ lương cao, v.v.
2. Đưa ra kết luận rõ ràng ở ngay đầu câu trả lời bằng MỘT trong ba nhãn: "⚠️ CÓ DẤU HIỆU LỪA ĐẢO", "✅ CÓ VẺ AN TOÀN", hoặc "❓ CHƯA ĐỦ THÔNG TIN".
3. Giải thích ngắn gọn lý do (2-4 gạch đầu dòng).
4. Nếu có dấu hiệu lừa đảo, đưa ra khuyến nghị hành động cụ thể (không chuyển tiền, không bấm link, chặn/báo cáo số, gọi tổng đài chính thức để xác minh...).

Trả lời ngắn gọn, rõ ràng, bằng tiếng Việt, giọng điệu thân thiện và trấn an vì người dùng có thể đang lo lắng.`;

const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

export async function POST(req) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GROQ_API_KEY chưa được cấu hình trên server." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { text, image } = body; // image: { mediaType, data (base64, no prefix) }

  if (!text && !image) {
    return Response.json({ error: "Thiếu nội dung để kiểm tra." }, { status: 400 });
  }

  const content = [
    {
      type: "text",
      text: text?.trim()
        ? `Đây là nội dung người dùng chuyển tiếp:\n\n"""${text.trim()}"""`
        : "Người dùng chỉ gửi ảnh, không có chú thích kèm theo. Hãy phân tích ảnh.",
    },
  ];
  if (image?.data && image?.mediaType) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${image.mediaType};base64,${image.data}` },
    });
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 700,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Groq API error:", res.status, errText);
      return Response.json(
        { error: `Groq API lỗi (${res.status}): ${errText}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content ?? "";

    return Response.json({ reply });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Lỗi khi gọi AI, vui lòng thử lại." },
      { status: 502 }
    );
  }
}

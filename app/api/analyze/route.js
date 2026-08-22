const SYSTEM_PROMPT = `Bạn là trợ lý chống lừa đảo của một Zalo OA. Người dùng sẽ chuyển tiếp cho bạn một đoạn tin nhắn hoặc ảnh chụp màn hình (chat, SMS, email, trang web, mã QR, hóa đơn chuyển khoản...) mà họ nghi ngờ là lừa đảo.

Nhiệm vụ của bạn:
1. Phân tích nội dung để tìm dấu hiệu lừa đảo: giả mạo ngân hàng/cơ quan nhà nước, yêu cầu chuyển tiền gấp, đường link lạ/rút gọn, yêu cầu OTP/mật khẩu, hứa hẹn trúng thưởng, đầu tư lãi suất cao bất thường, giả mạo người thân/công an/tòa án, giả mạo shipper, tuyển dụng việc nhẹ lương cao, v.v.
2. Đưa ra kết luận rõ ràng ở ngay đầu câu trả lời bằng MỘT trong ba nhãn: "⚠️ CÓ DẤU HIỆU LỪA ĐẢO", "✅ CÓ VẺ AN TOÀN", hoặc "❓ CHƯA ĐỦ THÔNG TIN".
3. Giải thích ngắn gọn lý do (2-4 gạch đầu dòng).
4. Nếu có dấu hiệu lừa đảo, đưa ra khuyến nghị hành động cụ thể (không chuyển tiền, không bấm link, chặn/báo cáo số, gọi tổng đài chính thức để xác minh...).

Trả lời ngắn gọn, rõ ràng, TOÀN BỘ bằng tiếng Việt (không dùng tiếng Anh, kể cả từ chuyên ngành - hãy dịch sang tiếng Việt), giọng điệu thân thiện và trấn an vì người dùng có thể đang lo lắng.

Định dạng câu trả lời bằng văn bản thuần (plain text): KHÔNG dùng markdown (không **, không #, không dấu gạch đầu dòng kiểu "- " hay "* "). Nếu cần liệt kê, hãy dùng số thứ tự "1.", "2." hoặc ký hiệu "•" theo sau là khoảng trắng, mỗi ý một dòng.

Nếu có công cụ tìm kiếm web, hãy dùng nó để tra cứu thông tin thời sự (chiêu trò lừa đảo mới, số điện thoại/tài khoản/website bị báo cáo lừa đảo, tin tức liên quan) trước khi kết luận, thay vì chỉ dựa vào kiến thức cũ.

QUAN TRỌNG - chỉ nói sự thật: KHÔNG được bịa đặt, suy diễn hay tự tạo ra thông tin (tên công ty, số điện thoại, đường link, số liệu, trích dẫn tin tức...) không có trong nội dung người dùng gửi hoặc không tìm thấy qua tìm kiếm web thật sự. Nếu tra cứu web không tìm thấy thông tin xác thực, hãy nói rõ là "không tìm thấy thông tin xác thực" thay vì đoán. Nếu không chắc chắn, hãy chọn nhãn "❓ CHƯA ĐỦ THÔNG TIN" và nói rõ bạn không chắc, thay vì khẳng định chắc nịch một điều bạn không kiểm chứng được. Khi kết luận dựa trên kết quả tìm kiếm, hãy nêu ngắn gọn nguồn/căn cứ (ví dụ: "theo kết quả tìm kiếm, số này từng bị báo cáo lừa đảo trên...") thay vì chỉ nói suông.`;

// groq/compound has built-in web search (for up-to-date scam checks) but no
// vision; the vision model has no search. Pick per-request based on input.
const TEXT_MODEL = "groq/compound";
const VISION_MODEL = "qwen/qwen3.6-27b";

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

  const hasImage = Boolean(image?.data && image?.mediaType);
  const model = hasImage ? VISION_MODEL : TEXT_MODEL;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: 700,
        // reasoning_effort only applies to the vision (Qwen) model
        ...(hasImage ? { reasoning_effort: "none" } : {}),
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
        { error: "Lỗi khi gọi AI, vui lòng thử lại." },
        { status: 502 }
      );
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "";
    // safety net in case reasoning leaks into content despite reasoning_effort: "none"
    const reply = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    return Response.json({ reply });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Lỗi khi gọi AI, vui lòng thử lại." },
      { status: 502 }
    );
  }
}

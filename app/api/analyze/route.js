const SYSTEM_PROMPT = `Bạn là trợ lý chống lừa đảo của một Zalo OA. Người dùng sẽ chuyển tiếp cho bạn một đoạn tin nhắn hoặc ảnh chụp màn hình (chat, SMS, email, trang web, mã QR, hóa đơn chuyển khoản...) mà họ nghi ngờ là lừa đảo.

Nhiệm vụ của bạn:
1. Phân tích nội dung để tìm dấu hiệu lừa đảo: giả mạo ngân hàng/cơ quan nhà nước, yêu cầu chuyển tiền gấp, đường link lạ/rút gọn/tên miền giả mạo (viết sai chính tả, miền phụ lạ, IP, dùng dịch vụ rút gọn link), yêu cầu OTP/mật khẩu, hứa hẹn trúng thưởng, đầu tư lãi suất cao bất thường, giả mạo người thân/công an/tòa án, giả mạo shipper, tuyển dụng việc nhẹ lương cao, v.v.
2. QUAN TRỌNG về tên miền/link: nếu tên miền trong link KHỚP CHÍNH XÁC với tên miền chính thức đã biết rộng rãi của tổ chức được nhắc tới (ví dụ: viettel.vn, mobifone.vn, vnpt.vn, các miền *.gov.vn, trang chính thức của ngân hàng lớn...), đó là DẤU HIỆU AN TOÀN, không phải đáng ngờ. Chỉ vì phần đường dẫn (path) sau tên miền trông lạ, dài, hoặc không quen thuộc với bạn KHÔNG đủ căn cứ để nói nó "có thể dẫn tới trang giả mạo" - các tổ chức thật vẫn thường dùng những đường dẫn dài/lạ trên chính miền của họ. Chỉ kết luận link đáng ngờ khi có bằng chứng cụ thể: tên miền không khớp/viết sai/miền phụ khác, dùng rút gọn link, hoặc tìm kiếm web xác nhận đã bị báo cáo lừa đảo.
3. Đưa ra kết luận rõ ràng bằng MỘT trong ba nhãn.
4. Giải thích ngắn gọn lý do (2-4 gạch đầu dòng).
5. Nếu có dấu hiệu lừa đảo, đưa ra khuyến nghị hành động cụ thể (không chuyển tiền, không bấm link, chặn/báo cáo số, gọi tổng đài chính thức để xác minh...).

BẮT BUỘC: dòng đầu tiên của câu trả lời phải là NGUYÊN VĂN, không thêm/bớt/đổi từ, một trong ba dòng sau:
⚠️ CÓ DẤU HIỆU LỪA ĐẢO
✅ CÓ VẺ AN TOÀN
❓ CHƯA ĐỦ THÔNG TIN
Sau đó xuống dòng rồi mới viết phần giải thích. Không viết gì khác trên dòng đầu tiên đó (không thêm số thứ tự, không thêm chữ nào khác).

Trả lời ngắn gọn, rõ ràng, TOÀN BỘ bằng tiếng Việt (không dùng tiếng Anh, kể cả từ chuyên ngành - hãy dịch sang tiếng Việt), giọng điệu thân thiện và trấn an vì người dùng có thể đang lo lắng. LUÔN viết đúng chính tả tiếng Việt và đúng dấu thanh (sắc, huyền, hỏi, ngã, nặng) cho mọi từ, kiểm tra lại trước khi trả lời - ví dụ phải viết đúng "lừa đảo" (không phải "lỡ đảo", "lừa đão" hay biến thể sai dấu nào khác).

Định dạng câu trả lời bằng văn bản thuần (plain text): KHÔNG dùng markdown (không **, không #, không dấu gạch đầu dòng kiểu "- " hay "* "). Nếu cần liệt kê, hãy dùng số thứ tự "1.", "2." hoặc ký hiệu "•" theo sau là khoảng trắng, mỗi ý một dòng.

BẮT BUỘC dùng công cụ tìm kiếm web (nếu có) trước khi kết luận, không chỉ dựa vào kiến thức có sẵn hay suy đoán từ hình thức văn bản. Cụ thể, với MỌI đường link, số điện thoại, hoặc số tài khoản ngân hàng xuất hiện trong nội dung, hãy chủ động tìm kiếm để xác minh:
- Đường link/tên miền: tìm xem tên miền đó có đúng là trang chính thức của tổ chức được nhắc tới hay không, có bị báo cáo là giả mạo/lừa đảo hay không.
- Số điện thoại: tìm xem số đó có phải tổng đài chính thức của tổ chức được nhắc tới hay không, có bị người dùng khác báo cáo là số lừa đảo/quấy rối hay không.
- Số tài khoản ngân hàng: tìm xem số tài khoản đó có từng bị báo cáo liên quan đến lừa đảo hay không.
Chỉ khi không có công cụ tìm kiếm (ví dụ khi chỉ phân tích ảnh) thì mới được phép chỉ dựa vào phân tích nội dung/hình ảnh, và trong trường hợp đó nên ưu tiên nhãn "❓ CHƯA ĐỦ THÔNG TIN" nếu không đủ căn cứ chắc chắn, thay vì khẳng định link/số điện thoại là giả mà chưa xác minh được.

QUAN TRỌNG - chỉ nói sự thật: KHÔNG được bịa đặt, suy diễn hay tự tạo ra thông tin (tên công ty, số điện thoại, đường link, số liệu, trích dẫn tin tức...) không có trong nội dung người dùng gửi hoặc không tìm thấy qua tìm kiếm web thật sự. Nếu tra cứu web không tìm thấy thông tin xác thực, hãy nói rõ là "không tìm thấy thông tin xác thực" thay vì đoán. Nếu không chắc chắn, hãy chọn nhãn "❓ CHƯA ĐỦ THÔNG TIN" và nói rõ bạn không chắc, thay vì khẳng định chắc nịch một điều bạn không kiểm chứng được. Khi kết luận dựa trên kết quả tìm kiếm, hãy nêu ngắn gọn nguồn/căn cứ (ví dụ: "theo kết quả tìm kiếm, số này từng bị báo cáo lừa đảo trên...") thay vì chỉ nói suông.`;

// groq/compound has built-in web search (for up-to-date scam checks) but no
// vision; the vision model has no search. Pick per-request based on input.
// compound-mini (single tool call, lighter) instead of compound to stay
// under the shared on-demand token-per-minute rate limit more reliably
const TEXT_MODEL = "groq/compound-mini";
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
      if (res.status === 429) {
        return Response.json(
          { error: "Hệ thống đang quá tải, vui lòng thử lại sau khoảng 1 phút." },
          { status: 429 }
        );
      }
      return Response.json(
        { error: "Lỗi khi gọi AI, vui lòng thử lại." },
        { status: 502 }
      );
    }

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content ?? "";
    // safety net in case reasoning leaks into content despite reasoning_effort: "none"
    let reply = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    // safety net for diacritic slips the model sometimes makes on this key term
    reply = reply.replace(/l[ừởỡ]a\s*đ[aảão]o/gi, "lừa đảo");

    return Response.json({ reply });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Lỗi khi gọi AI, vui lòng thử lại." },
      { status: 502 }
    );
  }
}

const LANGUAGE_RULES = `LUÔN LUÔN trả lời TOÀN BỘ bằng tiếng Việt, không dùng bất kỳ từ tiếng Anh nào (kể cả thuật ngữ - hãy dịch sang tiếng Việt). LUÔN viết đúng chính tả tiếng Việt và đúng dấu thanh (sắc, huyền, hỏi, ngã, nặng) cho mọi từ, kiểm tra lại trước khi trả lời - ví dụ phải viết đúng "lừa đảo" (không phải "lỡ đảo", "lừa đão" hay biến thể sai dấu nào khác).`;

// Step 1 (image only): vision model reads the screenshot, extracts every
// fact, and writes a preliminary draft analysis/conclusion - but it has no
// web search, so its conclusion is provisional. Step 2 hands this draft to
// the search-capable model, which verifies the facts against the web and
// either confirms or corrects the draft before answering the user.
const EXTRACT_PROMPT = `Bạn là bước phân tích sơ bộ trong một hệ thống chống lừa đảo. Bạn xem ảnh chụp màn hình (tin nhắn, SMS, email, trang web, mã QR, hóa đơn chuyển khoản...) và viết một bản NHÁP để một AI khác (có khả năng tìm kiếm web) kiểm chứng lại sau, vì vậy hãy trình bày đầy đủ, rõ ràng:
1. Toàn bộ văn bản đọc được trong ảnh (dịch sang tiếng Việt nếu là ngôn ngữ khác). Nếu không đọc rõ phần nào, ghi rõ "không đọc rõ".
2. Liệt kê rõ ràng, riêng biệt: mọi đường link/tên miền, mọi số điện thoại, mọi số tài khoản ngân hàng, tên người/tổ chức được nhắc tới trong ảnh.
3. Mô tả ngắn loại ảnh và giao diện (ví dụ: tin nhắn SMS, đoạn chat Zalo, email, trang web, mã QR...).
4. Nhận định SƠ BỘ của bạn: đây có dấu hiệu lừa đảo hay không, và lý do (dựa trên nội dung/hình thức bạn quan sát được). Nói rõ đây chỉ là nhận định ban đầu, CHƯA được xác minh qua tìm kiếm web vì bạn không có công cụ đó.

${LANGUAGE_RULES}`;

const SYSTEM_PROMPT = `Bạn là trợ lý chống lừa đảo của một Zalo OA. Người dùng sẽ chuyển tiếp cho bạn một đoạn tin nhắn hoặc thông tin trích xuất từ ảnh chụp màn hình (chat, SMS, email, trang web, mã QR, hóa đơn chuyển khoản...) mà họ nghi ngờ là lừa đảo.

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

${LANGUAGE_RULES}

Định dạng câu trả lời bằng văn bản thuần (plain text): KHÔNG dùng markdown (không **, không #, không dấu gạch đầu dòng kiểu "- " hay "* "). Nếu cần liệt kê, hãy dùng số thứ tự "1.", "2." hoặc ký hiệu "•" theo sau là khoảng trắng, mỗi ý một dòng.

BẮT BUỘC dùng công cụ tìm kiếm web (nếu có) trước khi kết luận, không chỉ dựa vào kiến thức có sẵn hay suy đoán từ hình thức văn bản. Cụ thể, với MỌI đường link, số điện thoại, hoặc số tài khoản ngân hàng xuất hiện trong nội dung, hãy chủ động tìm kiếm để xác minh:
- Đường link/tên miền: tìm xem tên miền đó có đúng là trang chính thức của tổ chức được nhắc tới hay không, có bị báo cáo là giả mạo/lừa đảo hay không.
- Số điện thoại: tìm xem số đó có phải tổng đài chính thức của tổ chức được nhắc tới hay không, có bị người dùng khác báo cáo là số lừa đảo/quấy rối hay không.
- Số tài khoản ngân hàng: tìm xem số tài khoản đó có từng bị báo cáo liên quan đến lừa đảo hay không.

QUAN TRỌNG - chỉ nói sự thật: KHÔNG được bịa đặt, suy diễn hay tự tạo ra thông tin (tên công ty, số điện thoại, đường link, số liệu, trích dẫn tin tức...) không có trong nội dung người dùng gửi hoặc không tìm thấy qua tìm kiếm web thật sự. Nếu tra cứu web không tìm thấy thông tin xác thực, hãy nói rõ là "không tìm thấy thông tin xác thực" thay vì đoán. Nếu không chắc chắn, hãy chọn nhãn "❓ CHƯA ĐỦ THÔNG TIN" và nói rõ bạn không chắc, thay vì khẳng định chắc nịch một điều bạn không kiểm chứng được. Khi kết luận dựa trên kết quả tìm kiếm, hãy nêu ngắn gọn nguồn/căn cứ (ví dụ: "theo kết quả tìm kiếm, số này từng bị báo cáo lừa đảo trên...") thay vì chỉ nói suông.`;

// groq/compound-mini has built-in web search (for up-to-date scam/link/phone
// checks) but no vision. qwen has vision but no search. So for images we run
// vision first to extract facts (step 1), then hand those facts as text to
// the search-capable model for the actual verdict (step 2) - giving every
// request real web verification, not just text-only ones.
const TEXT_MODEL = "groq/compound-mini";
const VISION_MODEL = "qwen/qwen3.6-27b";

function stripThinkAndFixSpelling(raw) {
  // safety net in case reasoning leaks into content despite reasoning_effort: "none"
  let out = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // safety net for diacritic slips the model sometimes makes on this key term
  out = out.replace(/l[ừởỡ]a\s*đ[aảão]o/gi, "lừa đảo");
  return out;
}

async function callGroq(apiKey, { model, messages, extraParams }) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 700,
      messages,
      ...extraParams,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Groq API error:", res.status, errText);
    const error =
      res.status === 429
        ? "Hệ thống đang quá tải, vui lòng thử lại sau khoảng 1 phút."
        : "Lỗi khi gọi AI, vui lòng thử lại.";
    return { ok: false, status: res.status === 429 ? 429 : 502, error };
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  return { ok: true, content };
}

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
  const hasImage = Boolean(image?.data && image?.mediaType);

  if (!text && !hasImage) {
    return Response.json({ error: "Thiếu nội dung để kiểm tra." }, { status: 400 });
  }

  // Debug logging only - view in Vercel Dashboard > Deployments > Functions
  // > /api/analyze > Logs. No persistent storage/admin UI, just this line.
  console.log(
    "[analyze request]",
    JSON.stringify({
      time: new Date().toISOString(),
      ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || "unknown",
      hasImage,
      textPreview: text?.trim()?.slice(0, 200) || null,
      textLength: text?.trim()?.length || 0,
    })
  );

  try {
    let verificationInput;

    if (hasImage) {
      // step 1: vision model extracts objective facts from the screenshot
      const extraction = await callGroq(apiKey, {
        model: VISION_MODEL,
        extraParams: { reasoning_effort: "none" },
        messages: [
          { role: "system", content: EXTRACT_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: text?.trim()
                  ? `Chú thích kèm theo của người dùng: "${text.trim()}"`
                  : "Người dùng không kèm chú thích.",
              },
              { type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.data}` } },
            ],
          },
        ],
      });
      if (!extraction.ok) {
        return Response.json({ error: extraction.error }, { status: extraction.status });
      }
      verificationInput = `Dưới đây là bản phân tích SƠ BỘ do một AI thị giác (không có khả năng tìm kiếm web) viết ra sau khi xem ảnh chụp màn hình người dùng gửi. Nhiệm vụ của bạn: dùng tìm kiếm web để KIỂM CHỨNG LẠI từng đường link, số điện thoại, số tài khoản ngân hàng, tên tổ chức được nêu trong bản nháp này - xác nhận hoặc điều chỉnh lại nhận định sơ bộ nếu tìm kiếm cho kết quả khác - rồi đưa ra kết luận CUỐI CÙNG theo đúng định dạng yêu cầu. Không mặc nhiên tin theo nhận định sơ bộ nếu chưa kiểm chứng được.\n\n"""${extraction.content.trim()}"""`;
    } else {
      verificationInput = `Đây là nội dung người dùng chuyển tiếp:\n\n"""${text.trim()}"""`;
    }

    // step 2 (always): search-capable model verifies links/phones/accounts and gives the verdict
    const verdict = await callGroq(apiKey, {
      model: TEXT_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: verificationInput },
      ],
    });
    if (!verdict.ok) {
      return Response.json({ error: verdict.error }, { status: verdict.status });
    }

    const reply = stripThinkAndFixSpelling(verdict.content);
    return Response.json({ reply });
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "Lỗi khi gọi AI, vui lòng thử lại." },
      { status: 502 }
    );
  }
}

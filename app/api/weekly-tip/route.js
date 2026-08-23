const FIXED_TIP_URL =
  "https://congan.ninhbinh.gov.vn/dau-hieu-nhan-biet-va-bien-phap-phong-ngua-doi-voi-21-phuong-thuc-thu-doan-lua-dao-truc-tuyen-pho-bien-hien-nay";

export async function GET() {
  try {
    const title = "Dấu hiệu nhận biết và biện pháp phòng ngừa đối với 21 phương thức thủ đoạn lừa đảo trực tuyến phổ biến hiện nay";
    const description =
      "Bài viết này tổng hợp các dấu hiệu nhận biết và cách phòng ngừa cho 21 phương thức lừa đảo trực tuyến phổ biến hiện nay.";

    const tip = [
      `📚 Mẹo Mỗi Tuần: ${title}`,
      "",
      description,
      "",
      `Đọc toàn bộ tại: ${FIXED_TIP_URL}`,
      "Nguồn: Công an tỉnh Ninh Bình",
    ].join("\n");

    return Response.json({ tip });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Lỗi khi tải Mẹo Mỗi Tuần, vui lòng thử lại." }, { status: 502 });
  }
}

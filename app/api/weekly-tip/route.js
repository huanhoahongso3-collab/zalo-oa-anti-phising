// "Mẹo Mỗi Tuần" - pulls a real recent fraud-tactic writeup from chongluadao.vn
// (the actual Vietnamese anti-scam org) instead of having the AI invent a
// scenario, per the requirement that this content be grounded in real,
// reported tactics, not fabricated.
//
// chongluadao.vn itself is a client-rendered SPA with no documented public
// API, but its frontend bundle (_bundles/assets/PostsListPage-*.js) calls
// this feeds endpoint directly, so we call the same one.
const FEEDS_BASE = "https://feeds.chongluadao.vn";

// Their "posts" list mixes real fraud-tactic reports (deepfake tools, scam
// compounds, malware, phishing kits...) with project self-promotion (team
// members speaking at events, awards, partnerships). There's no separate
// category for these, so titles that reference the org or its known members
// are filtered out as a heuristic - it's the best signal available without
// deeper classification, and matches the "not info of this project" requirement.
const SELF_PROMO_RE = /Chống Lừa Đảo|Ngô Minh Hiếu|Hiếu PC|Philip Hùng Cao/i;

export async function GET() {
  try {
    const listRes = await fetch(
      `${FEEDS_BASE}/posts?filter=categories.slug||ne||tai-nguyen&join=thumbnail||id,url&limit=15&page=1&sort=id,DESC`,
      { cache: "no-store" } // always pull the true latest, no server-side caching
    );
    if (!listRes.ok) {
      console.error("chongluadao posts list error:", listRes.status);
      return Response.json({ error: "Không lấy được dữ liệu từ chongluadao.vn." }, { status: 502 });
    }
    const list = await listRes.json();
    const posts = list?.data ?? [];

    const pick = posts.find((p) => {
      const vi = p.translations?.find((t) => t.language === "VI");
      return vi?.title && !SELF_PROMO_RE.test(vi.title) && !SELF_PROMO_RE.test(vi.description || "");
    });

    if (!pick) {
      return Response.json({ error: "Không tìm thấy bài viết phù hợp." }, { status: 404 });
    }

    const vi = pick.translations.find((t) => t.language === "VI");
    const url = `https://chongluadao.vn/posts/${encodeURIComponent(pick.slug)}`;

    // Keep this to a real "under 1 minute" read: the org's own description
    // (already a tight human-written summary) plus the opening of the body
    // for a bit of scenario detail, then a link to the full article - no AI
    // rewriting, so nothing here is invented.
    const bodyOpening = (vi.content || "")
      .replace(/\*\*/g, "")
      .split(/\n{2,}/)[0]
      ?.trim()
      .slice(0, 400);

    const tip = [
      `📚 Mẹo Mỗi Tuần: ${vi.title}`,
      "",
      vi.description?.trim(),
      bodyOpening ? `\n${bodyOpening}${bodyOpening.length >= 400 ? "..." : ""}` : "",
      `\nĐọc toàn bộ tại: ${url}`,
      "Nguồn: Chống Lừa Đảo (chongluadao.vn)",
    ]
      .filter(Boolean)
      .join("\n");

    return Response.json({ tip });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Lỗi khi lấy Mẹo Mỗi Tuần, vui lòng thử lại." }, { status: 502 });
  }
}

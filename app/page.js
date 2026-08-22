"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "anti-phishing-oa-chat";

const WELCOME_MESSAGES = [
  {
    role: "bot",
    text: "Xin chào 👋 Mình là trợ lý chống lừa đảo. Hãy chuyển tiếp cho mình đoạn tin nhắn hoặc ảnh chụp màn hình bạn đang nghi ngờ, mình sẽ kiểm tra giúp bạn.",
    time: null,
  },
  {
    role: "bot",
    text: "📌 Hướng dẫn sử dụng:\n1. Gửi đoạn văn bản tin nhắn nghi ngờ (không kèm ảnh) → mình sẽ phân tích và tìm kiếm trên web để xác minh.\n2. Gửi ảnh chụp màn hình (tin nhắn, SMS, email, trang web, mã QR, hóa đơn...) → mình sẽ đọc ảnh rồi xác minh qua tìm kiếm web.\n3. Gửi CHỈ một đường link, không kèm chữ nào khác → mình sẽ kiểm tra tức thời qua Google Safe Browsing để trả lời nhanh hơn.",
    time: null,
  },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const [, data] = reader.result.split(",");
      resolve(data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const VERDICTS = [
  { kind: "fraud", label: "⚠️ CÓ DẤU HIỆU LỪA ĐẢO", short: "Lừa đảo" },
  { kind: "safe", label: "✅ CÓ VẺ AN TOÀN", short: "An toàn" },
  { kind: "unsure", label: "❓ CHƯA ĐỦ THÔNG TIN", short: "Chưa chắc chắn" },
];

const FUZZY_VERDICTS = [
  { kind: "fraud", short: "Lừa đảo", re: /lừa\s*đảo/i },
  { kind: "safe", short: "An toàn", re: /an\s*toàn/i },
  { kind: "unsure", short: "Chưa chắc chắn", re: /(chưa\s*đủ\s*thông\s*tin|không\s*chắc\s*chắn)/i },
];

// Pulls the leading verdict label out of the reply so it can be shown as a
// status badge pinned to the top of the bubble instead of buried inline in
// the text. Tries the exact instructed label first; falls back to a fuzzy
// keyword match near the start in case the model didn't follow the format.
function extractVerdict(text) {
  const trimmed = text.trim();
  for (const v of VERDICTS) {
    if (trimmed.startsWith(v.label)) {
      const rest = trimmed.slice(v.label.length).replace(/^[\s:.\-–]+/, "");
      return { ...v, rest };
    }
  }
  const head = trimmed.slice(0, 40);
  for (const f of FUZZY_VERDICTS) {
    const m = head.match(f.re);
    if (m) {
      const rest = trimmed.slice(m.index + m[0].length).trimStart();
      return { ...f, rest };
    }
  }
  return { kind: null, rest: text };
}

// The model is instructed to avoid markdown, but strip it defensively
// (and drop any stray <think> block) so raw ** or - never leak to the user.
function renderReply(text) {
  let t = escapeHtml(text);
  t = t.replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, "");
  t = t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  t = t.replace(/(^|[^*])\*(?!\*)([^*\n]+)\*(?!\*)/g, "$1<i>$2</i>");
  t = t.replace(/^[ \t]*[-*]\s+/gm, "• ");
  t = t.replace(/^#{1,6}\s*/gm, "");
  return t.replace(/\n/g, "<br>");
}

function timeNow() {
  return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const Icon = {
  Shield: (props) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3zm0 2.2 6 2.25V11c0 4-2.8 7.6-6 8.9C8.8 18.6 6 15 6 11V6.45l6-2.25z" />
      <path d="M11 14.4 8.3 11.7l1.4-1.4 1.3 1.3 3.3-3.3 1.4 1.4z" />
    </svg>
  ),
  Search: (props) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  ),
  Trash: (props) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  ),
  Image: (props) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="m4 17 5-5 3.5 3.5L16 12l4 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Send: (props) => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" {...props}>
      <path d="M3 11.5 21 3l-6.5 18-3.2-7.3z" />
    </svg>
  ),
  Close: (props) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  ),
};

export default function Home() {
  const [messages, setMessages] = useState(WELCOME_MESSAGES);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState([]); // {previewUrl (data URL), mediaType, data}
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const searchRef = useRef(null);
  const [appHeight, setAppHeight] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // keep the app pinned to the real visible viewport, since mobile
  // browsers don't shrink 100dvh reliably when the keyboard opens
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setAppHeight(vv.height);
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // load chat history once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
      }
    } catch (e) {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, []);

  // persist on every change (skip the very first render before load finishes)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      // storage full/unavailable - chat just won't persist
    }
  }, [messages, loaded]);

  useEffect(() => {
    scrollToBottom();
  }, [loaded]);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  async function handleFiles(files) {
    const file = Array.from(files).find((f) => f.type.startsWith("image/"));
    if (!file) return;
    const data = await fileToBase64(file);
    setPendingImages([{ previewUrl: `data:${file.type};base64,${data}`, mediaType: file.type, data }]);
  }

  function removePending(idx) {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearHistory() {
    if (!window.confirm("Xoá toàn bộ lịch sử trò chuyện?")) return;
    setMessages(WELCOME_MESSAGES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function toggleSearch() {
    setSearchOpen((prev) => {
      const next = !prev;
      if (next) setTimeout(() => searchRef.current?.focus(), 50);
      else setSearchQuery("");
      return next;
    });
  }

  const visibleMessages = searchOpen && searchQuery.trim()
    ? messages.filter((m) => m.text?.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : messages;

  async function handleSend() {
    if (sending) return;
    const text = input.trim();
    const images = pendingImages;
    if (!text && images.length === 0) return;

    const userMsg = {
      role: "user",
      text,
      images: images.map((i) => i.previewUrl),
      time: timeNow(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingImages([]);
    setSending(true);
    scrollToBottom();

    try {
      // only first image is sent to the model (one fraud-check per message)
      const image = images[0]
        ? { mediaType: images[0].mediaType, data: images[0].data }
        : undefined;

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, image }),
      });
      const json = await res.json();
      const replyText = res.ok ? json.reply : `Lỗi: ${json.error}`;
      setMessages((prev) => [...prev, { role: "bot", text: replyText, time: timeNow() }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Lỗi kết nối, vui lòng thử lại.", time: timeNow() },
      ]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="app" style={appHeight ? { height: appHeight } : undefined}>
      <div className="header">
        {searchOpen ? (
          <>
            <span className="header-icon" title="Đóng tìm kiếm" onClick={toggleSearch}>
              <Icon.Close />
            </span>
            <input
              ref={searchRef}
              className="header-search-input"
              placeholder="Tìm trong hội thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </>
        ) : (
          <>
            <div className="avatar">
              <Icon.Shield />
            </div>
            <div className="header-info">
              <div className="header-name">
                Anti-Phishing OA <span className="verified" title="Official Account">✓</span>
              </div>
              <div className="header-sub">Official Account</div>
            </div>
            <div className="header-actions">
              <span className="header-icon" title="Tìm kiếm" onClick={toggleSearch}>
                <Icon.Search />
              </span>
              <span className="header-icon" title="Xoá lịch sử chat" onClick={clearHistory}>
                <Icon.Trash />
              </span>
            </div>
          </>
        )}
      </div>

      {searchOpen && searchQuery.trim() && (
        <div className="search-result-count">
          {visibleMessages.length} kết quả cho "{searchQuery.trim()}"
        </div>
      )}

      <div className="messages" ref={scrollRef}>
        {visibleMessages.map((m, i) => (
          <div key={i} className={`row ${m.role}`}>
            {m.role === "bot" && (
              <div className="bubble-avatar">
                <Icon.Shield />
              </div>
            )}
            <div className="bubble-col">
              <div className="bubble">
                {m.images?.map((src, j) => (
                  <img key={j} src={src} alt="forwarded" style={{ marginBottom: m.text ? 6 : 0 }} />
                ))}
                {m.role === "bot" ? (
                  (() => {
                    const { kind, short, rest } = extractVerdict(m.text);
                    return (
                      <>
                        {kind && (
                          <div className={`verdict-badge verdict-badge-${kind}`}>{short}</div>
                        )}
                        <span dangerouslySetInnerHTML={{ __html: renderReply(rest) }} />
                      </>
                    );
                  })()
                ) : (
                  m.text
                )}
              </div>
              {m.time && <div className="msg-time">{m.time}</div>}
            </div>
          </div>
        ))}
        {sending && (
          <div className="row bot">
            <div className="bubble-avatar">
              <Icon.Shield />
            </div>
            <div className="bubble-col">
              <div className="bubble">
                <div className="typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="composer">
        {pendingImages.length > 0 && (
          <div className="preview-row">
            {pendingImages.map((img, i) => (
              <div className="preview-thumb" key={i}>
                <img src={img.previewUrl} alt="preview" />
                <button onClick={() => removePending(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div className="input-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={pendingImages.length > 0}
            title={pendingImages.length > 0 ? "Chỉ được gửi 1 ảnh mỗi lần" : "Gửi ảnh"}
          >
            <Icon.Image />
          </button>
          <textarea
            ref={textareaRef}
            className="msg-input"
            rows={1}
            placeholder="Nhập tin nhắn nghi ngờ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setTimeout(scrollToBottom, 300)}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={sending || (!input.trim() && pendingImages.length === 0)}
            title="Gửi"
          >
            <Icon.Send />
          </button>
        </div>
      </div>
    </div>
  );
}

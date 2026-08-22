"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "anti-phishing-oa-chat";

const WELCOME = {
  role: "bot",
  text: "Xin chào 👋 Mình là trợ lý chống lừa đảo. Hãy chuyển tiếp cho mình đoạn tin nhắn hoặc ảnh chụp màn hình bạn đang nghi ngờ, mình sẽ kiểm tra giúp bạn.",
  time: null,
};

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

function renderReply(text) {
  return text
    .replace(/⚠️ CÓ DẤU HIỆU LỪA ĐẢO/g, '<span class="verdict-fraud">⚠️ CÓ DẤU HIỆU LỪA ĐẢO</span>')
    .replace(/✅ CÓ VẺ AN TOÀN/g, '<span class="verdict-safe">✅ CÓ VẺ AN TOÀN</span>')
    .replace(/❓ CHƯA ĐỦ THÔNG TIN/g, '<span class="verdict-unsure">❓ CHƯA ĐỦ THÔNG TIN</span>');
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
  More: (props) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  ),
  Image: (props) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="m4 17 5-5 3.5 3.5L16 12l4 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Smile: (props) => (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M8 14c1 1.5 2.5 2.3 4 2.3s3-.8 4-2.3" strokeLinecap="round" />
    </svg>
  ),
  Send: (props) => (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" {...props}>
      <path d="M3 11.5 21 3l-6.5 18-3.2-7.3z" />
    </svg>
  ),
};

export default function Home() {
  const [messages, setMessages] = useState([WELCOME]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState([]); // {previewUrl (data URL), mediaType, data}
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const [appHeight, setAppHeight] = useState(null);

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
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    for (const file of arr) {
      const data = await fileToBase64(file);
      setPendingImages((prev) => [
        ...prev,
        { previewUrl: `data:${file.type};base64,${data}`, mediaType: file.type, data },
      ]);
    }
  }

  function removePending(idx) {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function clearHistory() {
    setMessages([WELCOME]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

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
          <span className="header-icon" title="Tìm kiếm">
            <Icon.Search />
          </span>
          <span className="header-icon" title="Xoá lịch sử" onClick={clearHistory}>
            <Icon.More />
          </span>
        </div>
      </div>

      <div className="messages" ref={scrollRef}>
        {messages.map((m, i) => (
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
                  <span dangerouslySetInnerHTML={{ __html: renderReply(m.text) }} />
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
            multiple
            hidden
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Gửi ảnh">
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
          {input.trim() || pendingImages.length > 0 ? (
            <button className="send-btn" onClick={handleSend} disabled={sending} title="Gửi">
              <Icon.Send />
            </button>
          ) : (
            <button className="icon-btn" title="Sticker">
              <Icon.Smile />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";

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

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Xin chào 👋 Mình là trợ lý chống lừa đảo. Hãy chuyển tiếp cho mình đoạn tin nhắn hoặc ảnh chụp màn hình bạn đang nghi ngờ, mình sẽ kiểm tra giúp bạn.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState([]); // {previewUrl, mediaType, data}
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

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
        { previewUrl: URL.createObjectURL(file), mediaType: file.type, data },
      ]);
    }
  }

  function removePending(idx) {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    if (sending) return;
    const text = input.trim();
    const images = pendingImages;
    if (!text && images.length === 0) return;

    const userMsg = { role: "user", text, images: images.map((i) => i.previewUrl) };
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
      setMessages((prev) => [...prev, { role: "bot", text: replyText }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Lỗi kết nối, vui lòng thử lại." },
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
    <div className="app">
      <div className="header">
        <div className="avatar">🛡️</div>
        <div className="header-info">
          <div className="header-name">Anti-Phishing OA</div>
          <div className="header-sub">Trợ lý AI · Luôn hoạt động</div>
        </div>
      </div>

      <div className="messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`row ${m.role}`}>
            {m.role === "bot" && <div className="bubble-avatar">🛡️</div>}
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
          </div>
        ))}
        {sending && (
          <div className="row bot">
            <div className="bubble-avatar">🛡️</div>
            <div className="bubble">
              <div className="typing">
                <span />
                <span />
                <span />
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
            📷
          </button>
          <textarea
            className="msg-input"
            rows={1}
            placeholder="Nhập hoặc dán tin nhắn nghi ngờ..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={sending || (!input.trim() && pendingImages.length === 0)}
            title="Gửi"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

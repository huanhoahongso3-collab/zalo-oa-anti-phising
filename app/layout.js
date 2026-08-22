import "./globals.css";

export const metadata = {
  title: "Anti-Phishing OA",
  description: "Forward a message or image and get an AI fraud verdict",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}

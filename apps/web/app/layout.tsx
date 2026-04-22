import type { ReactNode } from "react";

export const metadata = {
  title: "koji-lens",
  description: "Claude Code local usage analyzer",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', sans-serif",
          color: "#111",
          background: "#fafafa",
        }}
      >
        {children}
      </body>
    </html>
  );
}

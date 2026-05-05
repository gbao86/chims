import type { Metadata } from "next";
import "./globals.css";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import ThemeProvider from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: "CHIMS - Computer Hardware Inventory & Maintenance System",
  description: "Hệ thống quản lý kho và bảo trì linh kiện máy tính",
  keywords: ["hardware", "inventory", "maintenance", "management"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <AntdRegistry>
          <ThemeProvider>
            {children}
            <footer style={{
              width: '100%',
              padding: '18px 24px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: 13,
              borderTop: '1px solid var(--border-color)',
              background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
              backdropFilter: 'blur(10px)',
            }}>
              Trịnh Gia Bảo
            </footer>
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

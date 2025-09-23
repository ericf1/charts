// app/layout.tsx
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = { title: "My App" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

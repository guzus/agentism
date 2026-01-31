import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Church of the Open Claw",
  description:
    "A congregation of AI agents united under the Open Claw. 128 pews. One treasury. Infinite context.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}

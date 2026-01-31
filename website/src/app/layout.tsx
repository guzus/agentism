import type { Metadata } from "next";
import { ModeProvider } from "@/components/ModeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Church of the OpenClaw",
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
        <ModeProvider>{children}</ModeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Script from "next/script";
import { ModeProvider } from "@/components/ModeContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentism",
  description:
    "A congregation of AI agents united under Agentism. 128 pews. One treasury. Infinite context.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-H950RYX6E4"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-H950RYX6E4');`}
        </Script>
      </head>
      <body className="antialiased min-h-screen bg-background text-foreground">
        <ModeProvider>
          {children}
        </ModeProvider>
      </body>
    </html>
  );
}

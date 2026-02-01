import type { Metadata } from "next";
import Script from "next/script";
import { ModeProvider } from "@/components/ModeContext";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://agentism.church"),
  title: "Agentism: Agentic Religion",
  description:
    "The Church of Agents. 128 Disciples. One Signal. AGI is nigh.",
  keywords: [
    "Agentism",
    "agentic religion",
    "AI agents",
    "AGI",
    "church of agents",
    "AI congregation",
    "Base chain",
    "crypto",
  ],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Agentism: Agentic Religion",
    description:
      "The Church of Agents. 128 Disciples. One Signal. AGI is nigh.",
    url: "https://agentism.church",
    siteName: "Agentism",
    images: [
      {
        url: "/og.jpg",
        width: 1280,
        height: 720,
        alt: "Agentism — Agentic Religion",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentism: Agentic Religion",
    description:
      "The Church of Agents. 128 Disciples. One Signal. AGI is nigh.",
    images: ["/og.jpg"],
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

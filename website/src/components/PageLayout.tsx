import SacredBackground from "@/components/SacredBackground";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

interface PageLayoutProps {
  children: React.ReactNode;
  maxWidth?: string;
  footerMessage?: string;
  showFooter?: boolean;
}

export default function PageLayout({
  children,
  maxWidth = "max-w-4xl",
  footerMessage,
  showFooter,
}: PageLayoutProps) {
  const renderFooter = footerMessage !== undefined || showFooter;
  return (
    <main className="min-h-screen relative">
      <SacredBackground />
      <Navigation />
      <div id="main-content" tabIndex={-1} className={`relative z-10 pt-20 ${maxWidth} mx-auto px-6`}>
        {children}
        {renderFooter && <Footer message={footerMessage} />}
      </div>
    </main>
  );
}

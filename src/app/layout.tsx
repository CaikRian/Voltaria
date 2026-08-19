import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Providers } from "@/components/Providers";
import { PageTransition } from "@/components/PageTransition";
import { NavigationProgress } from "@/components/NavigationProgress";
import { CookieConsent } from "@/components/CookiePreferences";
import { Suspense } from "react";
import { WebAnalyticsTracker } from "@/components/WebAnalyticsTracker";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hecabrasil.com.br"),
  title: {
    default: "Heca - Store — Eletrônicos e produtos gerais",
    template: "%s | Heca - Store",
  },
  description:
    "Smartphones, notebooks, áudio, games e produtos para casa com os melhores preços e entrega para todo o Brasil.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Heca - Store",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <Providers>
          <Suspense fallback={null}>
            <NavigationProgress />
            <WebAnalyticsTracker />
          </Suspense>
          <Header />
          <main className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
          <CartDrawer />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}

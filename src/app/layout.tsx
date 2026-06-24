import type { Metadata } from "next";
import { Cairo, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import  ParticlesBackground  from "@/components/layout/ParticlesBackground";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "UNIQUE — منصة التعلم الذكي",
  description: "منصة UNIQUE للتعلم الذكي — استعد لاختبارات القبول الجامعي بثقة",
  icons: {
    icon: "/apple-icon.svg", // This points to your public/apple-icon.svg file
    shortcut: "/apple-icon.svg", // Forces browsers to update their short links
    apple: "/apple-icon.png", // For iOS bookmarks
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      data-scroll-behavior="smooth"
      className={`${cairo.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-text-primary relative">
        <ParticlesBackground />
        <ThemeProvider>
          <LanguageProvider>
          <ToastProvider>
            <div className="relative z-10 flex-1 flex flex-col">
              {children}
            </div>
          </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
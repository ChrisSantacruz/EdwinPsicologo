import type { Metadata, Viewport } from "next";
import { Manrope, Cormorant_Garamond } from "next/font/google";
import { getAppUrl } from "@/lib/app-url";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: "Edwin Mideros — Atención psicológica",
    template: "%s · Edwin Mideros",
  },
  description:
    "Acompañamiento profesional para tu bienestar emocional y desarrollo personal. Confirmación de citas psicológicas.",
  applicationName: "Edwin Citas",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Edwin Citas",
  },
  openGraph: {
    title: "Edwin Mideros — Atención psicológica especializada",
    description: "Tu bienestar es una prioridad. Confirma tu cita de forma sencilla.",
    locale: "es_CO",
    type: "website",
    images: [{ url: "/brand-flyer.png" }],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#7A1F2B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${manrope.variable} ${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

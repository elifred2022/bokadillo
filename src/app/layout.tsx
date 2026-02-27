import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/auth/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://bokadillo.vercel.app"),
  title: {
    default: "Bokadillo",
    template: "%s | Bokadillo",
  },
  description: "App de gestión y almacén de productos",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bokadillo",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://bokadillo.vercel.app",
    siteName: "Bokadillo",
    title: "Bokadillo",
    description: "App de gestión y almacén de productos",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Bokadillos - Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bokadillo",
    description: "App de gestión y almacén de productos",
    images: ["/logo.png"],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}

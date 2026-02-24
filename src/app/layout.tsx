import type { Metadata } from "next";
import { Geist, Geist_Mono, Spectral, Inter } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";
import { Providers } from "./providers";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prophetic",
  description: "Prophetic",
  icons: {
    icon: [
      {
        url: "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo/flavicon_new.svg",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "https://siomjdoyjuuwlpimzaju.supabase.co/storage/v1/object/public/front/logo/logo/flavicon_new_dark.svg",
        media: "(prefers-color-scheme: dark)",
      }
    ],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${spectral.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <Script
          crossOrigin="anonymous"
          src="//unpkg.com/same-runtime/dist/index.global.js"
          strategy="afterInteractive"
        />
      </head>
      <body suppressHydrationWarning className="antialiased">
        <Providers>
          <ClientBody>{children}</ClientBody>
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              style: {
                background: 'rgb(230, 220, 210)',
                color: 'rgb(17, 24, 39)',
                border: '1px solid rgb(209, 213, 219)',
              },
              className: 'dark:!bg-gray-700 dark:!text-white dark:!border-gray-600',
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

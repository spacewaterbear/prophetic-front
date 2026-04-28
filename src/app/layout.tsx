import type { Metadata } from "next";
import { Geist, Geist_Mono, Spectral, Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import ClientBody from "./ClientBody";
import Script from "next/script";
import { Providers } from "./providers";
import { Toaster } from "sonner";
import { LOGO_DARK, LOGO_LIGHT } from "@/lib/constants/logos";

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

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Prophetic Orchestra",
  description: "Prophetic Orchestra",
  icons: {
    icon: [
      {
        url: LOGO_LIGHT,
        media: "(prefers-color-scheme: light)",
      },
      {
        url: LOGO_DARK,
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${spectral.variable} ${inter.variable} ${instrumentSerif.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/logo/logo/logo_home_blue.svg" media="(prefers-color-scheme: light)" />
        <link rel="preload" as="image" href="/logo/logo/logo_home_white.svg" media="(prefers-color-scheme: dark)" />
        <link rel="preload" as="image" href="/logo/logo/small_logo_black.svg" media="(prefers-color-scheme: light)" />
        <link rel="preload" as="image" href="/logo/logo/small_logo_white.svg" media="(prefers-color-scheme: dark)" />
        <Script
          crossOrigin="anonymous"
          src="//unpkg.com/same-runtime/dist/index.global.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-LG3RQ47GB1"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-LG3RQ47GB1');
          `}
        </Script>
        <Script
          src="https://t.contentsquare.net/uxa/2a463f3891692.js"
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

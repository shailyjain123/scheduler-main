import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import GlobalToast from "@/components/ui/global-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Welcome to Schedulr | Intelligent Concierge",
  description: "AI-powered scheduling that eliminates back-and-forth, reduces no-shows, and runs on autopilot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        {/* Preconnect and preload the font, then inject stylesheet client-side to avoid server-side event handlers */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap';l.crossOrigin='';document.head.appendChild(l);}catch(e){}})();` }} />
        <noscript>
          {/* Fallback for users with JS disabled */}
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
        </noscript>
      </head>
      <body className="min-h-full flex flex-col">
        <ReactQueryProvider>
          <AuthProvider>
            {children}
            <GlobalToast />
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}

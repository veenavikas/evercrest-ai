import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrestFix | Meet CrestFix",
  description: "Conversational AI platform for modern property management — agents that handle the full tenant lifecycle across maintenance, bookings, and resident support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Urbanist — UI / body font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        {/* Fraunces — display / heading font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-white text-[#191919] antialiased">
        {children}
      </body>
    </html>
  );
}

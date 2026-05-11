import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkUp — Professional Social Platform",
  description:
    "Connect with professionals, share insights, and grow your network on LinkUp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          {children}
        </QueryProvider>
        {/*
          Toaster lives outside QueryProvider intentionally — toasts are fire-and-forget
          side effects, not query-managed state. theme="system" respects OS preference.
        */}
        <Toaster
          theme="system"
          position="bottom-right"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}

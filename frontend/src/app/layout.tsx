import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import { StoreHydration } from "@/components/shared/store-hydration";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
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
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <QueryProvider>
          {/* StoreHydration: zero-render client component that calls
              useAuthStore.persist.rehydrate() after mount, preventing the
              SSR crash caused by persist middleware accessing localStorage */}
          <StoreHydration />
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

import type { Metadata } from "next";
import type { Viewport } from "next";
import { Libre_Caslon_Display, Source_Sans_3 } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const libreCaslon = Libre_Caslon_Display({
  variable: "--font-libre-caslon",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Harriett",
    template: "%s",
  },
  description: "Transaction assistant for Pritchett-Moore Real Estate",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Harriett",
  },
  icons: {
    apple: "/icons/harriett-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3efe8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} ${libreCaslon.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}

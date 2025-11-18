import type { Metadata } from "next";
import { Inter_Tight, Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ResponseLogger } from "@/components/response-logger";
import { cookies } from "next/headers";
import FarcasterWrapper from "@/components/FarcasterWrapper";

// Base Sans alternatives - Inter Tight is the closest match to Base Sans
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Base Mono alternative - Roboto Mono for code and metadata
const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestId = cookies().get("x-request-id")?.value;

  return (
        <html lang="en">
          <head>
            {requestId && <meta name="x-request-id" content={requestId} />}
          </head>
          <body
            className={`${interTight.variable} ${inter.variable} ${robotoMono.variable} antialiased`}
          >
            
      <FarcasterWrapper>
        {children}
      </FarcasterWrapper>
      
            <ResponseLogger />
          </body>
        </html>
      );
}

export const metadata: Metadata = {
        title: "Volt News",
        description: "Discover and share translated crypto news swiftly! Get instant X updates in Turkish and post selected stories on Farcaster with integrated sharing features for crucial crypto insights.",
        other: { "fc:frame": JSON.stringify({"version":"next","imageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/thumbnail_9b4b6658-cb02-40b5-9f8a-455cb13ac757-FwVNfi1xtBczEQGN3TThd4CFswBiya","button":{"title":"Open with Ohara","action":{"type":"launch_frame","name":"Volt News","url":"https://factory-occur-913.app.ohara.ai","splashImageUrl":"https://usdozf7pplhxfvrl.public.blob.vercel-storage.com/farcaster/splash_images/splash_image1.svg","splashBackgroundColor":"#ffffff"}}}
        ) }
    };

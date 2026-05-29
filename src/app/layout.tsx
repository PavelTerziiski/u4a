import type { Metadata } from "next";
import { Nunito } from "next/font/google";
const nunito = Nunito({ subsets: ["latin", "cyrillic"], weight: ["400","600","700","800"], display: "swap" })
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://u4a.bg"),
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  title: "u4a — Правопис и правоговор за твоето дете",
  description: "Правопис, правоговор и чужди езици — детето учи с лисицата всеки ден.",
  openGraph: {
    title: "u4a — Правопис и правоговор за твоето дете",
    description: "Правопис, правоговор и чужди езици — детето учи с лисицата всеки ден.",
    url: "https://u4a.bg",
    siteName: "u4a",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "u4a — Правопис и Правоговор" }],
    locale: "bg_BG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "u4a — Правопис и правоговор за твоето дете",
    description: "Правопис, правоговор и чужди езици — детето учи с лисицата всеки ден.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bg">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#F97316" />
        <meta name="facebook-domain-verification" content="xlq7rr7lp5ovbkiz0foqdg8iym5333" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1122224713405510');
          fbq('track', 'PageView');
        ` }} />
        <noscript dangerouslySetInnerHTML={{ __html: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1122224713405510&ev=PageView&noscript=1"/>` }} />
      </head>
      <body style={{ margin: 0, padding: 0 }} className={`${nunito.className}`}>
        {children}
      </body>
    </html>
  );
}

import "@tabler/core/dist/css/tabler.min.css";
import "@tabler/core/dist/css/tabler-flags.min.css";
import "@tabler/core/dist/css/tabler-themes.min.css";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import TablerScript from "@/components/tabler-script";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PewPew World",
  description: "PewPew World",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem("theme");
                  if (theme === "light" || theme === "dark") {
                    document.documentElement.setAttribute("data-bs-theme", theme);
                  } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
                    document.documentElement.setAttribute("data-bs-theme", "light");
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <TablerScript />
          <div className="page">
            <Navbar />
            <div className="page-wrapper">{children}</div>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

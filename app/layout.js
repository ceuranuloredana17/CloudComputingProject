import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import NavBar from "./components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CSV Dashboard",
  description: "Upload and visualize CSV data",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <header className="w-full border-b py-3 px-4 flex items-center justify-between">
            <div className="text-lg font-semibold">My App</div>
            <nav>
              <NavBar />
            </nav>
          </header>

          <main className="flex-1">{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}

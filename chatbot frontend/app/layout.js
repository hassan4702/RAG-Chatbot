"use client";
import localFont from "next/font/local";
import "./globals.css";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import store from "./store";
import { Provider } from "react-redux";
import { ThemeProvider } from "../context/theme-provider";
import { AuthProvider } from "../context/providers";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Toaster } from "@/components/ui/toaster";
import Head from "next/head";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// export const metadata = {
//   title: "Chatbot",
//   description: "Chatbot",
// };

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  const isDashboardPage = pathname === "/dashboard";
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1024) {
        setIsSidebarOpen(false); // Auto-close sidebar on md and below
      } else {
        setIsSidebarOpen(true); // Keep sidebar open on lg and above
      }
    };
    // Initial size check
    handleResize();
    // Listen for resize events
    window.addEventListener("resize", handleResize);
    // Cleanup on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };
  const title = isLoginPage ? "Login - Chatbot" : "Chatbot";
  const description = isLoginPage
    ? "Login to access the chatbot dashboard."
    : "Welcome to the Chatbot application.";

  return (
    <html lang="en">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased `}
      >
        <Provider store={store}>
          <AuthProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <div className=" overflow-hidden">
                {!isLoginPage && !isDashboardPage && (
                  <div
                    className={`fixed top-0 left-0 h-screen bg-dark_main z-50 p-4 transform transition-transform duration-500 ease-in-out ${
                      isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                    } w-64 lg:w-64`}
                  >
                    <Sidebar toggleSidebar={toggleSidebar} />
                  </div>
                )}
                <div
                  className={`fixed flex flex-row w-full z-50 transition-all duration-500 ease-in-out ${
                    isSidebarOpen && !isLoginPage && !isDashboardPage
                      ? "ml-64"
                      : "ml-0"
                  }`}
                >
                  {!isLoginPage && !isDashboardPage && (
                    <Navbar
                      isSidebarOpen={isSidebarOpen}
                      toggleSidebar={toggleSidebar}
                    />
                  )}
                </div>

                <div
                  className={`flex-1 flex-col h-screen transition-all duration-500 ease-in-out ${
                    isSidebarOpen && !isLoginPage && !isDashboardPage
                      ? "lg:ml-64"
                      : "ml-0"
                  }`}
                >
                  <main className="flex-1 dark:bg-light_main ">
                    {children}
                    <Toaster />
                  </main>
                </div>
              </div>
            </ThemeProvider>
          </AuthProvider>
        </Provider>
      </body>
    </html>
  );
}

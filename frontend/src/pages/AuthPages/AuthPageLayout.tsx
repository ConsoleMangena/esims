import React from "react";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import { Link } from "react-router";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen dark:bg-gray-900 sm:p-0 lg:flex-row">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 lg:grid">
          <div className="relative flex items-center justify-start pl-8 lg:pl-12">
            <div className="flex flex-col items-start max-w-sm">
              <Link to="/" className="block mb-3">
                <img
                  width={180}
                  height={36}
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6f/Ethereum-icon-purple.svg"
                  alt="Ethereum"
                />
              </Link>
              <p className="text-left text-gray-600 dark:text-white/70 text-base sm:text-lg font-medium">
                Engineering Surveying Information Management System
              </p>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}

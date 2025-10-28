import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { ToastProvider } from "../context/ToastContext";
import Toaster from "../components/ui/toast/Toaster";
import { useNotificationToasts } from "../hooks/useNotifications";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  // Start toast polling
  useNotificationToasts(30000);

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6 dashboard-compact">
          <Outlet />
        </div>
      </div>
      <Toaster />
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <ToastProvider>
        <LayoutContent />
      </ToastProvider>
    </SidebarProvider>
  );
};

export default AppLayout;

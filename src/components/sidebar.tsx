import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { ChannelList } from "./channel-list";
import { PeerList } from "./peer-list";
import { NetworkStatus } from "./network-status";
import { OptimizationStatus } from "./optimization-status";
import { UUIDDisplay } from "./uuid-display";
import { ScrollArea } from "./ui/scroll-area";
import { useEffect } from "react";

export function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useAppStore();

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isSidebarOpen && window.innerWidth < 768) {
        const sidebar = document.querySelector("[data-sidebar]");
        if (sidebar && !sidebar.contains(event.target as Node)) {
          toggleSidebar();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen, toggleSidebar]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isSidebarOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        data-sidebar
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-96 bg-card border-r transition-transform duration-300",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:relative md:translate-x-0 md:z-auto",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <img src="/icon.svg" alt="BluChat Logo" className="h-8 w-8" />
              <h2 className="font-semibold text-lg">BluChat</h2>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <NetworkStatus />
              <OptimizationStatus />
              <UUIDDisplay />
              <ChannelList />
              <PeerList />
            </div>
          </ScrollArea>
        </div>
      </aside>
    </>
  );
}

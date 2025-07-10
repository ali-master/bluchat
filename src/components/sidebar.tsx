import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { ChannelList } from "./channel-list";
import { PeerList } from "./peer-list";

export function Sidebar() {
  const { isSidebarOpen } = useAppStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-full w-64 bg-card border-r transition-transform duration-300",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:translate-x-0",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">BluChat</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ChannelList />
          <PeerList />
        </div>
      </div>
    </aside>
  );
}

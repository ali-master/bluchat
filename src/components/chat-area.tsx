import { useAppStore } from "@/stores/app-store";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";

export function ChatArea() {
  const { currentChannel } = useAppStore();

  return (
    <div className="flex flex-1 flex-col bg-background relative">
      <div className="border-b p-4 sticky top-0 bg-background z-10">
        <h2 className="font-semibold">
          {currentChannel === "public" ? "#" : "🔒"} {currentChannel}
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <MessageList />
      </div>

      <div className="sticky bottom-0 bg-background">
        <MessageInput />
      </div>
    </div>
  );
}

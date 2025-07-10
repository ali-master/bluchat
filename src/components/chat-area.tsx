import { useAppStore } from "@/stores/app-store";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";

export function ChatArea() {
  const { currentChannel } = useAppStore();

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="border-b p-4">
        <h2 className="font-semibold">
          {currentChannel === "public" ? "#" : "🔒"} {currentChannel}
        </h2>
      </div>

      <MessageList />
      <MessageInput />
    </div>
  );
}

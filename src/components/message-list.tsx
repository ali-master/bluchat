import { useRef, useEffect } from "react";
import { X, Clock, Check } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";

export function MessageList() {
  const { messages, currentChannel } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const channelMessages = messages.filter(
    (msg) => msg.channel === currentChannel,
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [channelMessages]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sending":
        return <Clock className="h-3 w-3 opacity-60" />;
      case "sent":
        return <Check className="h-3 w-3 opacity-60" />;
      case "failed":
        return <X className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateId = (id: string) => {
    return id ? `${id.substring(0, 8)}...` : "Unknown";
  };

  if (channelMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p>No messages yet</p>
          <p className="text-sm">Start a conversation!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {channelMessages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex",
            message.isMine ? "justify-end" : "justify-start",
          )}
        >
          <div
            className={cn(
              "max-w-[70%] rounded-lg p-3",
              message.isMine
                ? "bg-primary text-primary-foreground"
                : "bg-muted",
            )}
          >
            {!message.isMine && (
              <div className="text-xs text-muted-foreground mb-1">
                {truncateId(message.sender)}
              </div>
            )}

            <div className="break-words">{message.text}</div>

            <div
              className={cn(
                "flex items-center gap-2 mt-2 text-xs",
                message.isMine
                  ? "text-primary-foreground/70 justify-end"
                  : "text-muted-foreground",
              )}
            >
              <span>{formatTime(message.timestamp)}</span>
              {message.isMine && getStatusIcon(message.status)}
              {message.channel !== "public" && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-xs",
                    message.isMine
                      ? "bg-primary-foreground/20"
                      : "bg-muted-foreground/20",
                  )}
                >
                  #{message.channel}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

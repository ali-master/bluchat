import { useState } from "react";
import { X, Plus, Lock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/app-store";
import { confirmService } from "@/services/confirm-service";
import { cn } from "@/lib/utils";

export function ChannelList() {
  const {
    channels,
    currentChannel,
    setCurrentChannel,
    addChannel,
    removeChannel,
  } = useAppStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelPassword, setNewChannelPassword] = useState("");

  const handleAddChannel = () => {
    if (newChannelName.trim()) {
      addChannel({
        name: newChannelName.trim(),
        password: newChannelPassword || null,
        createdAt: Date.now(),
      });
      setNewChannelName("");
      setNewChannelPassword("");
      setShowAddForm(false);
    }
  };

  const handleRemoveChannel = async (channelName: string) => {
    if (channelName !== "public") {
      const shouldRemove = await confirmService.confirm({
        title: "Remove Channel",
        description: `Are you sure you want to remove the channel "#${channelName}"? This action cannot be undone.`,
        confirmText: "Remove",
        cancelText: "Cancel",
      });

      if (shouldRemove) {
        removeChannel(channelName);
      }
    }
  };

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          Channels
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1">
        {channels.map((channel) => (
          <div
            key={channel.name}
            className={cn(
              "flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent group",
              currentChannel === channel.name && "bg-accent",
            )}
            onClick={() => setCurrentChannel(channel.name)}
          >
            <div className="flex items-center gap-2 min-w-0">
              {channel.password ? (
                <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className="text-sm truncate">{channel.name}</span>
            </div>

            {channel.name !== "public" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={async (e) => {
                  e.stopPropagation();
                  await handleRemoveChannel(channel.name);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {showAddForm && (
        <div className="mt-3 space-y-2">
          <Input
            placeholder="Channel name"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddChannel()}
          />
          <Input
            type="password"
            placeholder="Password (optional)"
            value={newChannelPassword}
            onChange={(e) => setNewChannelPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddChannel()}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAddChannel}
              disabled={!newChannelName.trim()}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

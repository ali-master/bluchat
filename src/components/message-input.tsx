import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/stores/app-store";
import { toast } from "sonner";

export function MessageInput() {
  const [text, setText] = useState("");
  const { currentChannel, channels, addMessage, updateMessageStatus } =
    useAppStore();

  const handleSend = async () => {
    if (!text.trim()) return;

    const bluetoothService = (window as any).bluetoothService;
    const storageService = (window as any).storageService;
    const cryptoService = (window as any).cryptoService;

    if (!cryptoService) {
      toast.error("Services not initialized");
      return;
    }

    try {
      const messageId = crypto.randomUUID();
      const timestamp = Date.now();

      // Find current channel
      const channel = channels.find((ch) => ch.name === currentChannel);

      const messageData: any = {
        id: messageId,
        text: text.trim(),
        timestamp,
        channel: currentChannel,
        sender: cryptoService.getPublicKey(),
        ttl: 7,
        isMine: true,
        status: "sending",
      };

      // Encrypt if it's a private channel
      if (currentChannel !== "public" && channel?.password) {
        const encrypted = await cryptoService.encryptForChannel(
          text.trim(),
          currentChannel,
          channel.password,
        );
        messageData.encrypted = encrypted;
        delete messageData.text; // Remove plaintext for transmission
      }

      // Add to store immediately
      addMessage(messageData);
      setText("");

      try {
        // Broadcast message
        if (bluetoothService) {
          await bluetoothService.broadcastMessage(messageData);
        }

        // Save to storage
        if (storageService) {
          await storageService.saveMessage(messageData);
        }

        updateMessageStatus(messageId, "sent");
      } catch (error) {
        console.error("Failed to send message:", error);
        updateMessageStatus(messageId, "failed");
        toast.error("Failed to send message");
      }
    } catch (error) {
      console.error("Error creating message:", error);
      toast.error("Failed to create message");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <Input
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={500}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={!text.trim()} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

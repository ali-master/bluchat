import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CardTitle,
  CardHeader,
  CardDescription,
  CardContent,
  Card,
} from "@/components/ui/card";
import { TabsTrigger, TabsList, TabsContent, Tabs } from "@/components/ui/tabs";
import { Link, Copy } from "lucide-react";
import { toast } from "sonner";

export function ManualConnection() {
  const [connectionDetails, setConnectionDetails] = useState<{
    peerId: string;
    offer: string;
  } | null>(null);
  const [joinPeerId, setJoinPeerId] = useState("");
  const [joinOffer, setJoinOffer] = useState("");
  const [completePeerId, setCompletePeerId] = useState("");
  const [completeAnswer, setCompleteAnswer] = useState("");

  const handleCreateConnection = async () => {
    try {
      if (!window.bluetoothService) {
        toast.error("Services not available");
        return;
      }

      // Access the WebRTC service through the Bluetooth service
      const webrtcService = (window.bluetoothService as any).webrtcService;
      if (!webrtcService) {
        toast.error("WebRTC service not available");
        return;
      }

      const details = await webrtcService.createDirectConnection();
      setConnectionDetails(details);
      toast.success("Connection details created! Share with other device.");
    } catch (error) {
      console.error("Failed to create connection:", error);
      toast.error("Failed to create connection");
    }
  };

  const handleJoinConnection = async () => {
    if (!joinPeerId.trim() || !joinOffer.trim()) {
      toast.error("Please enter both Peer ID and Offer");
      return;
    }

    try {
      if (!window.bluetoothService) {
        toast.error("Bluetooth service not available");
        return;
      }

      await window.bluetoothService.joinWebRTCConnection(
        joinPeerId.trim(),
        joinOffer.trim(),
      );
      toast.success("Connection request sent! Check console for answer.");
    } catch (error) {
      console.error("Failed to join connection:", error);
      toast.error("Failed to join connection");
    }
  };

  const handleCompleteConnection = async () => {
    if (!completePeerId.trim() || !completeAnswer.trim()) {
      toast.error("Please enter both Peer ID and Answer");
      return;
    }

    try {
      if (!window.bluetoothService) {
        toast.error("Bluetooth service not available");
        return;
      }

      await window.bluetoothService.completeWebRTCConnection(
        completePeerId.trim(),
        completeAnswer.trim(),
      );
      toast.success("Connection completed successfully!");
    } catch (error) {
      console.error("Failed to complete connection:", error);
      toast.error("Failed to complete connection");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Manual WebRTC Connection
        </CardTitle>
        <CardDescription>
          Create direct peer-to-peer connections when Bluetooth fails
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="join">Join</TabsTrigger>
            <TabsTrigger value="complete">Complete</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <Label>Step 1: Create Connection</Label>
              <Button onClick={handleCreateConnection} className="w-full">
                Generate Connection Details
              </Button>
            </div>

            {connectionDetails && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Peer ID</Label>
                  <div className="flex gap-2">
                    <Input value={connectionDetails.peerId} readOnly />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(connectionDetails.peerId)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Offer (Share this with other device)</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={connectionDetails.offer}
                      readOnly
                      className="h-20 resize-none"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(connectionDetails.offer)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <div className="space-y-2">
              <Label>Step 2: Join Connection (Other Device)</Label>
              <p className="text-sm text-muted-foreground">
                Enter the Peer ID and Offer received from the first device
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="join-peer-id">Peer ID</Label>
              <Input
                id="join-peer-id"
                value={joinPeerId}
                onChange={(e) => setJoinPeerId(e.target.value)}
                placeholder="peer_123456789_abc123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="join-offer">Offer</Label>
              <Textarea
                id="join-offer"
                value={joinOffer}
                onChange={(e) => setJoinOffer(e.target.value)}
                placeholder="Paste the offer JSON here..."
                className="h-20 resize-none"
              />
            </div>

            <Button onClick={handleJoinConnection} className="w-full">
              Join Connection
            </Button>
          </TabsContent>

          <TabsContent value="complete" className="space-y-4">
            <div className="space-y-2">
              <Label>Step 3: Complete Connection (First Device)</Label>
              <p className="text-sm text-muted-foreground">
                Enter the answer received from the second device
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complete-peer-id">Peer ID</Label>
              <Input
                id="complete-peer-id"
                value={completePeerId}
                onChange={(e) => setCompletePeerId(e.target.value)}
                placeholder="peer_123456789_abc123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="complete-answer">Answer</Label>
              <Textarea
                id="complete-answer"
                value={completeAnswer}
                onChange={(e) => setCompleteAnswer(e.target.value)}
                placeholder="Paste the answer JSON here..."
                className="h-20 resize-none"
              />
            </div>

            <Button onClick={handleCompleteConnection} className="w-full">
              Complete Connection
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

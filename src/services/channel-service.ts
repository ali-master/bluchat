import { EventEmitter } from "@/utils/event-emitter";

interface ChannelState {
  name: string;
  state:
    | "discovering"
    | "joining"
    | "authenticating"
    | "authenticated"
    | "failed";
  password?: string;
  owner?: string;
  joinedAt?: number;
  lastActivity?: number;
}

export class ChannelService extends EventEmitter {
  private channels = new Map<string, ChannelState>();
  private discoveryInterval: NodeJS.Timeout | null = null;

  // Hashtag-based channel naming validation
  private validateChannelName(name: string): boolean {
    // Channel names should start with # and contain only alphanumeric characters and underscores
    return /^#\w{1,30}$/.test(name);
  }

  // Normalize channel name to hashtag format
  private normalizeChannelName(name: string): string {
    if (name.startsWith("#")) {
      return name.toLowerCase();
    }
    return `#${name.toLowerCase()}`;
  }

  async discoverChannel(channelName: string): Promise<void> {
    const normalizedName = this.normalizeChannelName(channelName);

    if (!this.validateChannelName(normalizedName)) {
      throw new Error("Invalid channel name format. Use #channelname");
    }

    // Set channel to discovering state
    this.channels.set(normalizedName, {
      name: normalizedName,
      state: "discovering",
      lastActivity: Date.now(),
    });

    this.emit("channel-state-changed", {
      channel: normalizedName,
      state: "discovering",
    });

    // Simulate discovery process
    setTimeout(() => {
      this.handleDiscoveryComplete(normalizedName);
    }, 2000);
  }

  private handleDiscoveryComplete(channelName: string) {
    const channelState = this.channels.get(channelName);
    if (!channelState) return;

    // Move to joining state
    channelState.state = "joining";
    channelState.lastActivity = Date.now();

    this.emit("channel-state-changed", {
      channel: channelName,
      state: "joining",
    });

    // Auto-proceed to authentication if no password required
    this.proceedToAuthentication(channelName);
  }

  async joinChannel(channelName: string, password?: string): Promise<void> {
    const normalizedName = this.normalizeChannelName(channelName);
    let channelState = this.channels.get(normalizedName);

    if (!channelState) {
      // Start discovery first
      await this.discoverChannel(normalizedName);
      channelState = this.channels.get(normalizedName)!;
    }

    if (channelState.state !== "joining") {
      throw new Error(`Cannot join channel in state: ${channelState.state}`);
    }

    channelState.password = password;
    this.proceedToAuthentication(normalizedName);
  }

  private async proceedToAuthentication(channelName: string) {
    const channelState = this.channels.get(channelName);
    if (!channelState) return;

    channelState.state = "authenticating";
    channelState.lastActivity = Date.now();

    this.emit("channel-state-changed", {
      channel: channelName,
      state: "authenticating",
    });

    // Simulate authentication process
    setTimeout(() => {
      this.handleAuthenticationResult(channelName, true); // Assume success for now
    }, 1500);
  }

  private handleAuthenticationResult(channelName: string, success: boolean) {
    const channelState = this.channels.get(channelName);
    if (!channelState) return;

    if (success) {
      channelState.state = "authenticated";
      channelState.joinedAt = Date.now();
      channelState.lastActivity = Date.now();

      this.emit("channel-joined", {
        channel: channelName,
        joinedAt: channelState.joinedAt,
      });

      this.emit("channel-state-changed", {
        channel: channelName,
        state: "authenticated",
      });
    } else {
      channelState.state = "failed";

      this.emit("channel-join-failed", {
        channel: channelName,
        reason: "Authentication failed",
      });

      this.emit("channel-state-changed", {
        channel: channelName,
        state: "failed",
      });
    }
  }

  async leaveChannel(channelName: string): Promise<void> {
    const normalizedName = this.normalizeChannelName(channelName);
    const channelState = this.channels.get(normalizedName);

    if (!channelState) {
      throw new Error("Channel not found");
    }

    this.channels.delete(normalizedName);

    this.emit("channel-left", {
      channel: normalizedName,
      leftAt: Date.now(),
    });
  }

  getChannelState(channelName: string): ChannelState | null {
    const normalizedName = this.normalizeChannelName(channelName);
    return this.channels.get(normalizedName) || null;
  }

  getActiveChannels(): ChannelState[] {
    return Array.from(this.channels.values()).filter(
      (channel) => channel.state === "authenticated",
    );
  }

  getAllChannels(): ChannelState[] {
    return Array.from(this.channels.values());
  }

  // Start periodic channel discovery
  startChannelDiscovery(): void {
    if (this.discoveryInterval) return;

    this.discoveryInterval = setInterval(() => {
      this.performChannelDiscovery();
    }, 30000); // Every 30 seconds
  }

  private performChannelDiscovery(): void {
    // Emit discovery event for channels that need refreshing
    for (const [channelName, state] of this.channels) {
      const timeSinceActivity = Date.now() - (state.lastActivity || 0);

      // Refresh channels that haven't had activity in 5 minutes
      if (timeSinceActivity > 300000 && state.state === "authenticated") {
        this.emit("channel-discovery", {
          channel: channelName,
          lastActivity: state.lastActivity,
        });
      }
    }
  }

  stopChannelDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }

  // Update channel activity timestamp
  updateChannelActivity(channelName: string): void {
    const normalizedName = this.normalizeChannelName(channelName);
    const channelState = this.channels.get(normalizedName);

    if (channelState) {
      channelState.lastActivity = Date.now();
    }
  }

  // Check if user has owner privileges for channel
  hasOwnerPrivileges(channelName: string, userId: string): boolean {
    const normalizedName = this.normalizeChannelName(channelName);
    const channelState = this.channels.get(normalizedName);

    return channelState?.owner === userId;
  }

  // Set channel owner
  setChannelOwner(channelName: string, userId: string): void {
    const normalizedName = this.normalizeChannelName(channelName);
    const channelState = this.channels.get(normalizedName);

    if (channelState) {
      channelState.owner = userId;
    }
  }
}

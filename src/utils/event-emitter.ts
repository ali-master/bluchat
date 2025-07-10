type EventListener = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, EventListener[]> = new Map();

  on(event: string, listener: EventListener): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    this.events.get(event)!.push(listener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  off(event: string, listenerToRemove: EventListener) {
    const listeners = this.events.get(event);
    if (!listeners) return;

    const filtered = listeners.filter(
      (listener) => listener !== listenerToRemove,
    );
    if (filtered.length > 0) {
      this.events.set(event, filtered);
    } else {
      this.events.delete(event);
    }
  }

  emit(event: string, ...args: any[]) {
    const listeners = this.events.get(event);
    if (!listeners) return;

    listeners.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  once(event: string, listener: EventListener) {
    const onceWrapper = (...args: any[]) => {
      listener(...args);
      this.off(event, onceWrapper);
    };

    this.on(event, onceWrapper);
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }
}

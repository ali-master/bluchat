/**
 * Extended service worker types for background sync and battery API
 */

// Battery API types
export interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => any) | null;
  onchargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => any) | null;
}

export interface NavigatorBattery {
  getBattery(): Promise<BatteryManager>;
}

// Background Sync API types
export interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

export interface ServiceWorkerRegistrationSync {
  sync: SyncManager;
}

// Periodic Background Sync API types
export interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval?: number }): Promise<void>;
  getTags(): Promise<string[]>;
  unregister(tag: string): Promise<void>;
}

export interface ServiceWorkerRegistrationPeriodicSync {
  periodicSync: PeriodicSyncManager;
}

// Combined type
export interface ExtendedServiceWorkerRegistration
  extends ServiceWorkerRegistration,
    ServiceWorkerRegistrationSync,
    ServiceWorkerRegistrationPeriodicSync {}

// Type guards
export function hasBatteryAPI(
  navigator: Navigator,
): navigator is Navigator & NavigatorBattery {
  return "getBattery" in navigator;
}

export function hasBackgroundSync(
  registration: ServiceWorkerRegistration,
): registration is ServiceWorkerRegistration & ServiceWorkerRegistrationSync {
  return "sync" in registration;
}

export function hasPeriodicBackgroundSync(
  registration: ServiceWorkerRegistration,
): registration is ServiceWorkerRegistration &
  ServiceWorkerRegistrationPeriodicSync {
  return "periodicSync" in registration;
}

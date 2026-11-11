import { IStorageAdapter } from './StorageAdapter';
import { Deadline, Activity, User } from '@/types';
import { initialDeadlines, initialActivities, initialUser } from './seedData';

const STORAGE_KEYS = {
  DEADLINES: 'deadline_app_deadlines_v1',
  ACTIVITIES: 'deadline_app_activities_v1',
  USER: 'deadline_app_user_v1',
};

export class LocalStorageAdapter implements IStorageAdapter {
  private getStorageItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`[LocalStorageAdapter] Failed to parse key "${key}", using default`, e);
      return defaultValue;
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[LocalStorageAdapter] Failed to set key "${key}"`, e);
    }
  }

  async getDeadlines(): Promise<Deadline[]> {
    const raw = this.getStorageItem<Deadline[] | null>(STORAGE_KEYS.DEADLINES, null);
    if (!raw) {
      this.setStorageItem(STORAGE_KEYS.DEADLINES, initialDeadlines);
      return initialDeadlines;
    }
    return raw;
  }

  async getDeadline(id: string): Promise<Deadline | null> {
    const deadlines = await this.getDeadlines();
    return deadlines.find((d) => d.id === id) || null;
  }

  async saveDeadline(deadline: Deadline): Promise<Deadline> {
    const deadlines = await this.getDeadlines();
    const existingIndex = deadlines.findIndex((d) => d.id === deadline.id);

    let updated: Deadline[];
    if (existingIndex >= 0) {
      updated = [...deadlines];
      updated[existingIndex] = {
        ...deadline,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = [
        {
          ...deadline,
          createdAt: deadline.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...deadlines,
      ];
    }

    this.setStorageItem(STORAGE_KEYS.DEADLINES, updated);
    return deadline;
  }

  async updateDeadline(id: string, updates: Partial<Deadline>): Promise<Deadline> {
    const deadlines = await this.getDeadlines();
    const index = deadlines.findIndex((d) => d.id === id);

    if (index === -1) {
      throw new Error(`Deadline with id ${id} not found.`);
    }

    const updatedItem: Deadline = {
      ...deadlines[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    deadlines[index] = updatedItem;
    this.setStorageItem(STORAGE_KEYS.DEADLINES, deadlines);
    return updatedItem;
  }

  async deleteDeadline(id: string): Promise<boolean> {
    const deadlines = await this.getDeadlines();
    const filtered = deadlines.filter((d) => d.id !== id);
    this.setStorageItem(STORAGE_KEYS.DEADLINES, filtered);
    return true;
  }

  async getActivities(): Promise<Activity[]> {
    const raw = this.getStorageItem<Activity[] | null>(STORAGE_KEYS.ACTIVITIES, null);
    if (!raw) {
      this.setStorageItem(STORAGE_KEYS.ACTIVITIES, initialActivities);
      return initialActivities;
    }
    return raw;
  }

  async addActivity(activity: Activity): Promise<Activity> {
    const activities = await this.getActivities();
    const newActivity: Activity = {
      ...activity,
      id: activity.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: activity.timestamp || new Date().toISOString(),
    };
    const updated = [newActivity, ...activities].slice(0, 50); // Keep last 50 activities
    this.setStorageItem(STORAGE_KEYS.ACTIVITIES, updated);
    return newActivity;
  }

  async clearActivities(): Promise<void> {
    this.setStorageItem(STORAGE_KEYS.ACTIVITIES, []);
  }

  async getUser(): Promise<User> {
    const raw = this.getStorageItem<User | null>(STORAGE_KEYS.USER, null);
    if (!raw) {
      this.setStorageItem(STORAGE_KEYS.USER, initialUser);
      return initialUser;
    }
    return raw;
  }

  async updateUser(updates: Partial<User>): Promise<User> {
    const current = await this.getUser();
    const updated = { ...current, ...updates };
    this.setStorageItem(STORAGE_KEYS.USER, updated);
    return updated;
  }

  async exportAllData(): Promise<string> {
    const deadlines = await this.getDeadlines();
    const activities = await this.getActivities();
    const user = await this.getUser();

    return JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        user,
        deadlines,
        activities,
      },
      null,
      2
    );
  }

  async importData(jsonData: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonData);
      if (Array.isArray(parsed.deadlines)) {
        this.setStorageItem(STORAGE_KEYS.DEADLINES, parsed.deadlines);
      }
      if (Array.isArray(parsed.activities)) {
        this.setStorageItem(STORAGE_KEYS.ACTIVITIES, parsed.activities);
      }
      if (parsed.user) {
        this.setStorageItem(STORAGE_KEYS.USER, parsed.user);
      }
      return true;
    } catch (e) {
      console.error('[LocalStorageAdapter] Failed to import JSON data', e);
      return false;
    }
  }

  async resetToSampleData(): Promise<void> {
    this.setStorageItem(STORAGE_KEYS.DEADLINES, initialDeadlines);
    this.setStorageItem(STORAGE_KEYS.ACTIVITIES, initialActivities);
    this.setStorageItem(STORAGE_KEYS.USER, initialUser);
  }
}

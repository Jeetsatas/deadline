import { Deadline, Activity, User } from '@/types';

export interface IStorageAdapter {
  // Deadlines
  getDeadlines(): Promise<Deadline[]>;
  getDeadline(id: string): Promise<Deadline | null>;
  saveDeadline(deadline: Deadline): Promise<Deadline>;
  updateDeadline(id: string, updates: Partial<Deadline>): Promise<Deadline>;
  deleteDeadline(id: string): Promise<boolean>;

  // Activities
  getActivities(): Promise<Activity[]>;
  addActivity(activity: Activity): Promise<Activity>;
  clearActivities(): Promise<void>;

  // User Profile
  getUser(): Promise<User>;
  updateUser(updates: Partial<User>): Promise<User>;

  // Data Export / Reset
  exportAllData(): Promise<string>;
  importData(jsonData: string): Promise<boolean>;
  resetToSampleData(): Promise<void>;
}


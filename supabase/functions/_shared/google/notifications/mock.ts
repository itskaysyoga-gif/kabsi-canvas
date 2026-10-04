// Mock of the notification setting: no Pub/Sub topic yet.
import type { NotificationSetting } from "../types.ts";

export const getNotificationSetting = (account: string): Promise<NotificationSetting> => Promise.resolve({ name: `${account}/notificationSetting` });

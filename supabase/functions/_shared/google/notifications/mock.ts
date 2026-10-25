// Mock of the notification setting: no Pub/Sub topic until one is set, then the setting Google would return.
import type { NotificationSetting } from "../types.ts";

const set = new Map<string, NotificationSetting>();

export const getNotificationSetting = (account: string): Promise<NotificationSetting> =>
  Promise.resolve(set.get(account) ?? { name: `${account}/notificationSetting` });

export function updateNotificationSetting(account: string, topic: string, types: string[]): Promise<NotificationSetting> {
  const s = { name: `${account}/notificationSetting`, pubsubTopic: topic, notificationTypes: [...types] };
  set.set(account, s);
  return Promise.resolve(s);
}

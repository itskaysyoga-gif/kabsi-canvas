// Notifications API: the account's Pub/Sub notification setting (K-37, used from P0.7-03).
// https://developers.google.com/my-business/reference/notifications/rest/v1/accounts/getNotificationSetting
import { gbp, NOTIF } from "../client.ts";
import type { NotificationSetting } from "../types.ts";

export const getNotificationSetting = (account: string): Promise<NotificationSetting> => gbp(`${NOTIF}/${account}/notificationSetting`);

// Notifications API: the account's Pub/Sub notification setting (K-37, P0.7-03).
// https://developers.google.com/my-business/reference/notifications/rest/v1/accounts/getNotificationSetting
// https://developers.google.com/my-business/reference/notifications/rest/v1/accounts/updateNotificationSetting
// The setting belongs to Kabsi's own account (one topic per account); it changes no business's data, so it is not a
// publication. Google publishes as mybusiness-api-pubsub@system.gserviceaccount.com, which needs publish rights on
// the topic.
import { gbp, NOTIF } from "../client.ts";
import type { NotificationSetting } from "../types.ts";

export const getNotificationSetting = (account: string): Promise<NotificationSetting> => gbp(`${NOTIF}/${account}/notificationSetting`);

export const updateNotificationSetting = (account: string, topic: string, types: string[]): Promise<NotificationSetting> =>
  gbp(`${NOTIF}/${account}/notificationSetting?updateMask=pubsubTopic,notificationTypes`, {
    method: "PATCH",
    body: JSON.stringify({ name: `${account}/notificationSetting`, pubsubTopic: topic, notificationTypes: types }),
  });

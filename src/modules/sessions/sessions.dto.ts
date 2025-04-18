import { z } from 'zod';

export type LoadSessionDto = {
  session_id: string;
  notify_webhooks: string[];
};

export const webhookSchema = z.object({
  webhook: z.string().url(),
});

export type AddListenerWebhook = {
  webhook: string;
};

export type DeleteListenerWebhook = AddListenerWebhook;

export const getSessionExampleResponse = [
  {
    id: 'e3b4d2a7-a239-40fe-987a-589af1078d0e-1725026287073',
    notify_webhooks: [],
    is_authenticated: true,
    created_at: '2024-08-31T15:46:37.141Z',
    phone: '5511994356310',
    last_message_sent_at: 1725119237171,
  },
];

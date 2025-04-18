import { Baileys } from '../common/infra/baileys/start-sock';

export type WhatsappClient = Awaited<ReturnType<typeof Baileys.startSock>>;

export type CreateSessionParams = {
  id: string;
  notify_webhooks: string[];
  whatsapp_client: WhatsappClient;
};

export type SendMessageParams = {
  phone_number: string;
  messages: {
    body: string;
    type: MessageTypeEnum;
    mime_type?: string;
  }[];
};

export enum MessageTypeEnum {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

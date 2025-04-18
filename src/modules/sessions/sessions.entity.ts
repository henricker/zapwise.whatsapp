import {
  formatWhatsAppId,
  whatsAppIdSufix,
  WhatsAppIdType,
} from '../common/infra/baileys/format-whatsapp-id';
import api from 'axios';
import {
  CreateSessionParams,
  SendMessageParams,
  WhatsappClient,
} from './sessions.types';
import {
  BaileysEventMap,
  DisconnectReason,
  downloadMediaMessage,
  WAMessage,
} from '@whiskeysockets/baileys';
import sessionsManager from '../common/sessions.manager';
import { ForceLogoutError } from './errors';
import { S3StorageProvider } from '../providers/s3-storage.provider';

export class Session {
  readonly id: string;
  notify_webhooks: string[];
  readonly created_at: Date;
  private _is_authenticated: boolean;
  whatsapp_client: WhatsappClient;
  phone?: string;
  last_message_sent_at?: number;

  constructor({ id, notify_webhooks, whatsapp_client }: CreateSessionParams) {
    this.id = id;
    this.notify_webhooks = notify_webhooks;
    this.whatsapp_client = whatsapp_client;
    this._is_authenticated = !!this.whatsapp_client?.authState?.creds?.me?.id;
    this.created_at = new Date();
    this.notify();
    this.listenConnection();
  }

  set is_authenticated(is_authenticated: boolean) {
    this._is_authenticated = is_authenticated;
  }

  get is_authenticated() {
    return this._is_authenticated;
  }

  async sendMessage({ messages, phone_number }: SendMessageParams) {
    const jid = formatWhatsAppId(phone_number, WhatsAppIdType.person);

    for (const { type, body, mime_type } of messages) {
      switch (type) {
        case 'audio':
        case 'video':
        case 'image': {
          if (['audio', 'video'].includes(type))
            await this.whatsapp_client.sendPresenceUpdate('recording', jid);

          try {
            const response = await api.get<ArrayBuffer>(body, {
              responseType: 'arraybuffer',
            });
            const fileBuffer = Buffer.from(response.data);
            const audioOptions = {
              mimetype: type === 'audio' ? 'audio/mpeg' : undefined,
              ptt: type === 'audio' ? true : undefined,
            };

            await this.whatsapp_client.sendMessage(jid, {
              [type as 'image']: fileBuffer,
              ...audioOptions,
            });
            break;
          } catch (error) {
            console.error(error);
            break;
          }
        }
        case 'text': {
          await this.whatsapp_client.sendPresenceUpdate('composing', jid);
          await this.whatsapp_client.sendMessage(jid, {
            text: body,
          });
          break;
        }
        case 'document': {
          const response = await api.get<ArrayBuffer>(body, {
            responseType: 'arraybuffer',
          });
          const file_buffer = Buffer.from(response.data);
          await this.whatsapp_client.sendMessage(jid, {
            mimetype: mime_type,
            document: file_buffer,
          });
        }
      }
    }
    this.last_message_sent_at = new Date().getTime();
  }

  async kill() {
    const eventKeys: (keyof BaileysEventMap)[] = [
      'connection.update',
      'creds.update',
      'messaging-history.set',
      'chats.upsert',
      'chats.update',
      'chats.phoneNumberShare',
      'chats.delete',
      'presence.update',
      'contacts.upsert',
      'contacts.update',
      'messages.delete',
      'messages.update',
      'messages.media-update',
      'messages.upsert',
      'messages.reaction',
      'message-receipt.update',
      'groups.upsert',
      'groups.update',
      'group-participants.update',
      'group.join-request',
      'blocklist.set',
      'blocklist.update',
      'call',
      'labels.edit',
      'labels.association',
    ];

    eventKeys.forEach((key) => this.whatsapp_client.ev.removeAllListeners(key));
    if (this._is_authenticated)
      await this.whatsapp_client?.logout()?.catch(() => {});
    this.is_authenticated = false;
    this.whatsapp_client?.end(new ForceLogoutError());
    sessionsManager.deleteSession(this.id);
  }

  private notify() {
    this.whatsapp_client?.ev?.on('messages.upsert', async (upsert) => {
      if (!this.notify_webhooks) return;
      if (upsert.type === 'notify') {
        for (const waMessage of upsert.messages) {
          const { key } = waMessage;
          const { fromMe, remoteJid, id } = key;

          const messageToSend = await this.getMessageType(waMessage);

          const isDirectMessage =
            remoteJid?.substring(remoteJid.indexOf('@')) ===
            whatsAppIdSufix.person;

          // const profile_photo_url = await this.getContactProfileUrl(remoteJid);

          if (isDirectMessage && messageToSend) {
            try {
              const event = {
                event: 'new_message',
                data: {
                  phone: remoteJid.replace(/\D/g, ''),
                  my_phone: this.whatsapp_client?.authState?.creds?.me?.id
                    .split(':')[0]
                    .replace(/\D/g, ''),
                  message: {
                    id,
                    type: messageToSend.type,
                    value: messageToSend.body,
                    timestamp: new Date().getTime(),
                  },
                  contact: {
                    // photo: profile_photo_url,
                    name: waMessage.pushName,
                  },
                  from_me: fromMe,
                },
              };

              await this.whatsapp_client.readMessages([key]);
              await Promise.all(
                this.notify_webhooks.map(async (url) => {
                  await api.post(url, event);
                }),
              );
            } catch (err) {
              console.error(err);
            }
          }
        }
      }
    });
  }

  private async getContactProfileUrl(remoteJid: string) {
    const profile_photo = await this.whatsapp_client.profilePictureUrl(
      remoteJid,
      'image',
    );

    const buffer = await api({
      method: 'get',
      url: profile_photo,
      responseType: 'arraybuffer',
    })
      .then((response) => response.data)
      .catch(() => null);

    if (!buffer) return null;

    const storage_provider = new S3StorageProvider();
    const keyName = `nection-whatsapp/contacts_photos/${remoteJid}.jpeg`;
    const object_url = await storage_provider.putObject(keyName, buffer);
    return object_url;
  }

  private async getMessageType(wa_message: WAMessage): Promise<
    | {
        type: 'text' | 'audio' | 'image' | 'video';
        body: string;
      }
    | undefined
  > {
    const message = wa_message?.message;

    if (!message) return undefined;

    if (message.conversation || message.extendedTextMessage?.text) {
      return {
        type: 'text',
        body: message.conversation || message.extendedTextMessage?.text,
      };
    }

    const mediaTypeMap: { [key: string]: { extension: string; type: string } } =
      {
        audioMessage: { extension: 'mp4', type: 'audio' },
        imageMessage: { extension: 'jpeg', type: 'image' },
        videoMessage: { extension: 'mp4', type: 'video' },
      };

    for (const [key, { extension, type }] of Object.entries(mediaTypeMap)) {
      if (message[key as keyof typeof mediaTypeMap]) {
        const buffer = await downloadMediaMessage(wa_message, 'buffer', {});
        const storage_provider = new S3StorageProvider();
        const keyName = `zapwise-whatsapp/messages/${type}s/${Date.now()}-${wa_message.key.id}.${extension}`;
        const object_url = await storage_provider.putObject(keyName, buffer);

        return {
          type: type as 'audio' | 'image' | 'video',
          body: object_url,
        };
      }
    }

    return undefined;
  }

  private listenConnection() {
    this.whatsapp_client?.ev?.on('connection.update', async (conn) => {
      const { connection, lastDisconnect } = conn;
      if (
        connection === 'close' &&
        (lastDisconnect as any)?.error?.output?.statusCode ===
          DisconnectReason.loggedOut
      ) {
        await Promise.all(
          this.notify_webhooks.map(async (url) => {
            await api.post(url, {
              event: 'expired_session',
              data: {
                session_id: this.id,
              },
            });
          }),
        ).catch(() => {});

        await this.kill();
      } else {
        this.phone =
          this.whatsapp_client?.authState?.creds?.me?.id.split(':')[0];
      }
    });
  }

  async restart() {
    await this.whatsapp_client?.end();
  }
}

import axios from 'axios';
import { Session } from '../sessions.entity';
import { MessageTypeEnum, WhatsappClient } from '../sessions.types';
import { DisconnectReason } from '@whiskeysockets/baileys';
import sessionsManager from '../../common/sessions.manager';
import { ForceLogoutError } from '../errors';

describe('Session', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });
  describe('sendMessage', () => {
    // sendMessage successfully sends text messages
    it('should send text message when message type is text', async () => {
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;
      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['webhook'],
      });

      await session.sendMessage({
        messages: [{ type: MessageTypeEnum.TEXT, body: 'Hello, World!' }],
        phone_number: '1234567890',
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        {
          text: 'Hello, World!',
        },
      );
      expect(whatsappClient.sendPresenceUpdate).toHaveBeenCalled();
    });

    // sendMessage handles empty messages array
    it('should not send any message when messages array is empty', async () => {
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;
      const sendMessageParams = {
        phone_number: '1234567890',
        messages: [],
      };
      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['webhook'],
      });

      await session.sendMessage(sendMessageParams);

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    // sendMessage successfully sends image messages
    it('should send image message when message type is image', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: new ArrayBuffer(8) });
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;

      jest.spyOn(axios, 'get').mockImplementationOnce(mockGet);

      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['webhook'],
      });

      await session.sendMessage({
        messages: [
          {
            type: MessageTypeEnum.IMAGE,
            body: 'https://example.com/image.jpg',
          },
        ],
        phone_number: '123',
      });

      expect(mockGet).toHaveBeenCalledWith('https://example.com/image.jpg', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith('123@s.whatsapp.net', {
        image: Buffer.from(new ArrayBuffer(8)),
      });
    });

    // sendMessage successfully sends video messages
    it('should send video message when message type is video', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: new ArrayBuffer(8) });
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;

      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['video_url'],
      });

      jest.spyOn(axios, 'get').mockImplementationOnce(mockGet);

      await session.sendMessage({
        phone_number: '1234567890',
        messages: [{ body: 'video_url', type: MessageTypeEnum.VIDEO }],
      });

      expect(mockGet).toHaveBeenCalledWith('video_url', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        {
          video: expect.any(Buffer),
        },
      );
    });

    // sendMessage successfully sends audio messages
    it('should send audio message when message type is audio', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: new ArrayBuffer(8) });
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;

      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['notify_webhooks'],
      });

      jest.spyOn(axios, 'get').mockImplementationOnce(mockGet);

      await session.sendMessage({
        phone_number: '1234567890',
        messages: [{ body: 'audio-file-url', type: MessageTypeEnum.AUDIO }],
      });

      expect(mockGet).toHaveBeenCalledWith('audio-file-url', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        expect.objectContaining({
          audio: expect.any(Buffer),
          ptt: true,
          mimetype: 'audio/mpeg',
        }),
      );
    });

    // sendMessage successfully sends document
    it('should send document message when message type is document', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: new ArrayBuffer(8) });
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;

      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['notify_webhooks'],
      });

      jest.spyOn(axios, 'get').mockImplementationOnce(mockGet);

      await session.sendMessage({
        phone_number: '1234567890',
        messages: [
          {
            body: 'https://pdf.com/file.pdf',
            type: MessageTypeEnum.DOCUMENT,
            mime_type: 'application/pdf',
          },
        ],
      });

      expect(mockGet).toHaveBeenCalledWith('https://pdf.com/file.pdf', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        expect.objectContaining({
          document: expect.any(Buffer),
          mimetype: 'application/pdf',
        }),
      );
    });

    // sendMessage correctly formats phone number to WhatsApp ID
    it('should correctly format phone number to WhatsApp ID', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: new ArrayBuffer(8) });
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;

      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['https://example.com/image.jpg'],
      });

      jest.spyOn(axios, 'get').mockImplementationOnce(mockGet);

      await session.sendMessage({
        phone_number: '1234567890',
        messages: [
          {
            body: 'https://example.com/image.jpg',
            type: MessageTypeEnum.IMAGE,
          },
          { body: 'Hello, World!', type: MessageTypeEnum.TEXT },
        ],
      });

      expect(mockGet).toHaveBeenCalledWith('https://example.com/image.jpg', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        {
          image: expect.any(Buffer),
        },
      );
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        {
          text: 'Hello, World!',
        },
      );
    });

    // sendMessage handles multiple messages in one call
    it('should send text, image, video, and audio messages in one call', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: new ArrayBuffer(8) });
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;

      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['url'],
      });

      jest.spyOn(axios, 'get').mockImplementation(mockGet);

      await session.sendMessage({
        phone_number: '1234567890',
        messages: [
          { body: 'Hello, World!', type: MessageTypeEnum.TEXT },
          {
            body: 'https://example.com/image.jpg',
            type: MessageTypeEnum.IMAGE,
          },
          {
            body: 'https://example.com/video.mp4',
            type: MessageTypeEnum.VIDEO,
          },
          {
            body: 'https://example.com/audio.mp3',
            type: MessageTypeEnum.AUDIO,
          },
        ],
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        expect.objectContaining({
          text: 'Hello, World!',
        }),
      );
      expect(mockGet).toHaveBeenCalledWith('https://example.com/image.jpg', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        expect.objectContaining({
          image: expect.any(Buffer),
        }),
      );
      expect(mockGet).toHaveBeenCalledWith('https://example.com/video.mp4', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        expect.objectContaining({
          video: expect.any(Buffer),
        }),
      );
      expect(mockGet).toHaveBeenCalledWith('https://example.com/audio.mp3', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        expect.objectContaining({
          audio: expect.any(Buffer),
          ptt: true,
        }),
      );
    });

    // sendMessage sets ptt flag for audio messages
    it('should set ptt flag for audio messages', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: new ArrayBuffer(8) });
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;

      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['url'],
      });

      jest.spyOn(axios, 'get').mockImplementationOnce(mockGet);

      await session.sendMessage({
        phone_number: '1234567890',
        messages: [{ body: 'audio-link', type: MessageTypeEnum.AUDIO }],
      });

      expect(mockGet).toHaveBeenCalledWith('audio-link', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        expect.objectContaining({
          audio: expect.anything(),
          ptt: true,
          mimetype: 'audio/mpeg',
        }),
      );
    });

    // sendMessage uses correct responseType for media fetching
    it('should send image message with correct responseType when message type is image', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: new ArrayBuffer(8) });
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;
      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['url'],
      });

      jest.spyOn(axios, 'get').mockImplementationOnce(mockGet);

      await session.sendMessage({
        phone_number: '1234567890',
        messages: [
          {
            body: 'https://example.com/image.jpg',
            type: MessageTypeEnum.IMAGE,
          },
        ],
      });

      expect(mockGet).toHaveBeenCalledWith('https://example.com/image.jpg', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        {
          image: expect.any(Buffer),
        },
      );
    });

    // sendMessage converts response data to Buffer correctly
    it('should convert response data to Buffer when message type is audio', async () => {
      const mockGet = jest.fn().mockResolvedValue({ data: new ArrayBuffer(8) });
      const mockSendMessage = jest.fn();
      const whatsappClient = {
        sendMessage: mockSendMessage,
        ev: {
          on: jest.fn(),
        },
        sendPresenceUpdate: jest.fn(),
      } as unknown as WhatsappClient;
      const session = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['url'],
      });

      jest.spyOn(axios, 'get').mockImplementationOnce(mockGet);

      await session.sendMessage({
        phone_number: '1234567890',
        messages: [{ body: 'audio_url', type: MessageTypeEnum.AUDIO }],
      });

      expect(mockGet).toHaveBeenCalledWith('audio_url', {
        responseType: 'arraybuffer',
      });
      expect(mockSendMessage).toHaveBeenCalledWith(
        '1234567890@s.whatsapp.net',
        {
          audio: Buffer.from(new ArrayBuffer(8)),
          ptt: true,
          mimetype: 'audio/mpeg',
        },
      );
    });
  });

  describe('kill', () => {
    // Successfully removes all event listeners from the WhatsApp client
    it('should remove all event listeners from the WhatsApp client when kill is called', async () => {
      const mockRemoveAllListeners = jest.fn();
      const mockLogout = jest.fn();
      const mockEnd = jest.fn();
      const whatsappClient = {
        ev: {
          removeAllListeners: mockRemoveAllListeners,
          on: jest.fn(),
        },
        logout: mockLogout,
        end: mockEnd,
      } as unknown as WhatsappClient;
      const sessionManagerSpy = jest.spyOn(sessionsManager, 'deleteSession');
      const instance = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['webhook'],
      });

      instance.is_authenticated = true;

      await instance.kill();

      expect(mockRemoveAllListeners).toHaveBeenCalledTimes(25);
      expect(mockLogout).toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalledWith(new ForceLogoutError());
      expect(sessionManagerSpy).toHaveBeenCalledWith(instance.id);
    });

    // Successfully removes all event listeners from the WhatsApp client and not call logout
    it('should not call logout when session is not authenticated', async () => {
      const mockRemoveAllListeners = jest.fn();
      const mockLogout = jest.fn();
      const mockEnd = jest.fn();
      const whatsappClient = {
        ev: {
          removeAllListeners: mockRemoveAllListeners,
          on: jest.fn(),
        },
        logout: mockLogout,
        end: mockEnd,
      } as unknown as WhatsappClient;
      const sessionManagerSpy = jest.spyOn(sessionsManager, 'deleteSession');
      const instance = new Session({
        whatsapp_client: whatsappClient,
        id: 'id',
        notify_webhooks: ['webhook'],
      });

      instance.is_authenticated = false;

      await instance.kill();

      expect(mockRemoveAllListeners).toHaveBeenCalledTimes(25);
      expect(mockLogout).not.toHaveBeenCalled();
      expect(mockEnd).toHaveBeenCalledWith(new ForceLogoutError());
      expect(sessionManagerSpy).toHaveBeenCalledWith(instance.id);
    });
  });

  describe('notify', () => {
    // Notify webhook is called with correct data when a new direct message is received
    it('should call notify webhook with correct data when a new direct message is received', async () => {
      const mockPost = jest.spyOn(axios, 'post').mockResolvedValue({});
      const mockReadMessages = jest.fn();
      const mockAuthState = { creds: { me: { id: '1234:5678' } } };
      const whatsappClient = {
        ev: {
          on: jest.fn((event, callback) =>
            callback({
              type: 'notify',
              messages: [
                {
                  message: { conversation: 'Hello' },
                  key: {
                    fromMe: false,
                    remoteJid: '12345@s.whatsapp.net',
                    id: 'msgid',
                  },
                  pushName: 'Teste',
                },
              ],
            }),
          ),
        },
        readMessages: mockReadMessages,
        authState: mockAuthState,
        profilePictureUrl: jest.fn().mockResolvedValueOnce('profile_photo'),
      };
      const notify_webhooks = ['http://example.com/webhook'];
      const session = new Session({
        whatsapp_client: whatsappClient,
        notify_webhooks,
        id: 'id',
      });

      jest
        .spyOn(session, 'getContactProfileUrl' as any)
        .mockResolvedValueOnce('https://photo_uploaded.com');

      session['notify']();
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(mockReadMessages).toHaveBeenCalledWith([
        { fromMe: false, remoteJid: '12345@s.whatsapp.net', id: 'msgid' },
      ]);
      expect(mockPost).toHaveBeenCalledWith('http://example.com/webhook', {
        event: 'new_message',
        data: {
          phone: '12345',
          my_phone: '1234',
          message: {
            id: 'msgid',
            type: 'text',
            value: 'Hello',
            timestamp: expect.any(Number),
          },
          contact: {
            name: 'Teste',
            photo: 'https://photo_uploaded.com',
          },
          from_me: false
        },
      });

      mockPost.mockRestore();
    });

    // Handles cases where message has no conversation or extended text message
    it('should handle cases where message has no conversation or extended text message', async () => {
      const mockPost = jest.spyOn(axios, 'post').mockResolvedValue({});
      const mockReadMessages = jest.fn();
      const mockAuthState = { creds: { me: { id: '1234:5678' } } };
      const whatsappClient = {
        ev: {
          on: jest.fn((event, callback) =>
            callback({
              type: 'notify',
              messages: [
                {
                  message: {},
                  key: {
                    fromMe: false,
                    remoteJid: '12345@s.whatsapp.net',
                    id: 'msgid',
                  },
                },
              ],
            }),
          ),
        },
        readMessages: mockReadMessages,
        authState: mockAuthState,
        profilePictureUrl: jest.fn().mockResolvedValue('profile_photo'),
      };
      const notify_webhooks = ['http://example.com/webhook'];
      const session = new Session({
        whatsapp_client: whatsappClient,
        notify_webhooks,
        id: 'id',
      });

      await session['notify']();

      expect(mockReadMessages).not.toHaveBeenCalled();
      expect(mockPost).not.toHaveBeenCalled();

      mockPost.mockRestore();
    });

    // Handles cases where message has is from me
    it('should handle cases where message is from me and not call notify_webhooks', async () => {
      const mockPost = jest.spyOn(axios, 'post').mockResolvedValue({});
      const mockReadMessages = jest.fn();
      const mockAuthState = { creds: { me: { id: '1234:5678' } } };
      const whatsappClient = {
        ev: {
          on: jest.fn((event, callback) =>
            callback({
              type: 'notify',
              messages: [
                {
                  message: { conversation: 'Hello' },
                  key: {
                    fromMe: true,
                    remoteJid: '12345@s.whatsapp.net',
                    id: 'msgid',
                  },
                },
              ],
            }),
          ),
        },
        readMessages: mockReadMessages,
        authState: mockAuthState,
        profilePictureUrl: jest.fn().mockResolvedValue('profile_photo'),
      };
      const notify_webhooks = ['http://example.com/webhook'];
      const session = new Session({
        whatsapp_client: whatsappClient,
        notify_webhooks,
        id: 'id',
      });

      await session['notify']();

      expect(mockReadMessages).not.toHaveBeenCalled();
      expect(mockPost).not.toHaveBeenCalled();

      mockPost.mockRestore();
    });
  });

  describe('listenConnection', () => {
    // Connection update event triggers correctly
    it('should trigger expired_session event and kill session when connection is closed and lastDisconnect error is loggedOut', async () => {
      const mockPost = jest
        .spyOn(axios, 'post')
        .mockResolvedValueOnce({ data: { success: true } });
      const mockClient = {
        ev: {
          on: jest.fn((event, callback) => {
            if (event === 'connection.update') {
              callback({
                connection: 'close',
                lastDisconnect: {
                  error: { output: { statusCode: DisconnectReason.loggedOut } },
                },
              });
            }
          }),
          removeAllListeners: jest.fn(),
        },
        logout: jest.fn(),
        end: jest.fn(),
      };

      new Session({
        id: 'session123',
        notify_webhooks: ['http://example.com/webhook'],
        whatsapp_client: mockClient,
      });

      expect(mockPost).toHaveBeenCalledWith('http://example.com/webhook', {
        event: 'expired_session',
        data: { session_id: 'session123' },
      });
    });

    // Connection update event triggers with no lastDisconnect error
    it('should not trigger expired_session event or kill session when connection is closed and lastDisconnect error is not loggedOut', async () => {
      const mockPost = jest.spyOn(axios, 'post').mockResolvedValue({});
      const mockKill = jest.fn();
      const mockClient = {
        ev: {
          on: jest.fn((event, callback) => {
            if (event === 'connection.update') {
              callback({
                connection: 'close',
                lastDisconnect: { error: { output: { statusCode: 500 } } },
              });
            }
          }),
          removeAllListeners: jest.fn(),
        },
        logout: jest.fn(),
        end: jest.fn(),
      };
      const session = new Session({
        id: 'session123',
        notify_webhooks: ['http://example.com/webhook'],
        whatsapp_client: mockClient,
      });

      jest.spyOn(session, 'kill').mockImplementationOnce(mockKill);

      session['listenConnection']();

      expect(mockPost).not.toHaveBeenCalled();
      expect(mockKill).not.toHaveBeenCalled();
    });
  });

  describe('restart', () => {
    it('Should call whatsapp_client.end on success', async () => {
      const whatsapp_client = {
        ev: {
          on: jest.fn((event, callback) => {
            if (event === 'connection.update') {
              callback({
                connection: 'close',
                lastDisconnect: {
                  error: { output: { statusCode: DisconnectReason.loggedOut } },
                },
              });
            }
          }),
          removeAllListeners: jest.fn(),
        },
        logout: jest.fn(),
        end: jest.fn(),
      };

      const session = new Session({
        id: 'session123',
        notify_webhooks: ['http://example.com/webhook'],
        whatsapp_client,
      });

      session.restart();

      expect(whatsapp_client.end).toHaveBeenCalled();
    });
  });
});

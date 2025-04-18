import { NotFoundException } from '@nestjs/common';
import {
  Baileys,
  startSockParams,
} from '../../common/infra/baileys/start-sock';
import sessionsManager from '../../common/sessions.manager';
import { Session } from '../sessions.entity';
import { SessionsService } from '../sessions.service';
import { S3StorageProvider } from '../../providers/s3-storage.provider';
import { randomUUID } from 'crypto';

describe('SessionsService', () => {
  const s3ProviderMock = {} as S3StorageProvider;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('loadSession', () => {
    // Successfully starts a WhatsApp session with valid session data
    it('should start a WhatsApp session when provided with valid session data', async () => {
      const mockClient = { emit: jest.fn(), disconnect: jest.fn() };
      const mockData = {
        session_id: 'valid_session_id',
        notify_webhooks: ['http://webhook.url'],
      };
      const mockSock = {
        authState: { creds: { me: { id: '12345' } } },
        ev: { on: jest.fn() },
      } as any;
      const addSessionSpy = jest
        .spyOn(sessionsManager, 'addSession')
        .mockImplementation(() => {});
      const updateAuthenticatedSpy = jest
        .spyOn(sessionsManager, 'updateAuthenticated')
        .mockImplementationOnce(() => {});

      jest
        .spyOn(Baileys, 'startSock')
        .mockImplementationOnce(({ onReady }: startSockParams) => {
          onReady('12345');
          return mockSock;
        });

      const service = new SessionsService(s3ProviderMock);
      await service.loadSession(mockData, mockClient as any);

      expect(mockClient.emit).toHaveBeenCalledWith('whatsapp.connected', {
        phone_number: '12345',
      });
      expect(addSessionSpy).toHaveBeenCalled();
      expect(updateAuthenticatedSpy).toHaveBeenCalled();
    });

    // Emits 'whatsapp.qrcode' event when QR code is generated
    it("should emit 'whatsapp.qrcode' event when QR code is generated", async () => {
      const mockClient = { emit: jest.fn(), disconnect: jest.fn() };
      const mockData = {
        session_id: 'valid_session_id',
        notify_webhooks: ['http://webhook.url'],
      };
      const mockSock = {
        authState: { creds: { me: { id: '12345' } } },
        ev: { on: jest.fn() },
      } as any;
      jest.spyOn(sessionsManager, 'addSession').mockImplementation(() => {});
      jest
        .spyOn(Baileys, 'startSock')
        .mockImplementationOnce(({ onQrCode }: startSockParams) => {
          onQrCode('qr');
          return mockSock;
        });
      const service = new SessionsService(s3ProviderMock);
      await service.loadSession(mockData, mockClient as any);

      expect(mockClient.emit).toHaveBeenCalledWith('whatsapp.qrcode', {
        qr: expect.anything(),
      });
    });

    // Emits 'whatsapp.connected' event when WhatsApp connection is ready
    it("should emit 'whatsapp.connected' event when WhatsApp connection is ready", async () => {
      const mockClient = { emit: jest.fn(), disconnect: jest.fn() };
      const mockData = {
        session_id: 'valid_session_id',
        notify_webhooks: ['http://webhook.url'],
      };
      const mockSock = {
        authState: { creds: { me: { id: '12345' } } },
        ev: { on: jest.fn() },
      } as any;
      const spy = jest
        .spyOn(sessionsManager, 'addSession')
        .mockImplementation(() => {});
      const updateAuthenticatedSpy = jest
        .spyOn(sessionsManager, 'updateAuthenticated')
        .mockImplementationOnce(() => {});
      jest
        .spyOn(Baileys, 'startSock')
        .mockImplementationOnce(({ onReady }: startSockParams) => {
          onReady('12345');
          return mockSock;
        });
      const service = new SessionsService(s3ProviderMock);
      await service.loadSession(mockData, mockClient as any);

      expect(mockClient.emit).toHaveBeenCalledWith('whatsapp.connected', {
        phone_number: '12345',
      });
      expect(spy).toHaveBeenCalled();
      expect(updateAuthenticatedSpy).toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    // Successfully deletes an existing session
    it('should delete the session when session ID exists', async () => {
      const session_id = 'existing_session_id';
      const mockSession = { kill: jest.fn() } as unknown as Session;
      jest.spyOn(sessionsManager, 'getSession').mockReturnValue(mockSession);
      jest.spyOn(sessionsManager, 'deleteSession').mockImplementation(() => {});

      const sessionsService = new SessionsService(s3ProviderMock);
      await sessionsService.deleteSession(session_id);

      expect(sessionsManager.getSession).toHaveBeenCalledWith(session_id);
    });

    // Session ID is an empty string
    it('should throw NotFoundException when session ID is empty', async () => {
      const session_id = '';
      jest.spyOn(sessionsManager, 'getSession').mockReturnValue(null);

      const sessionsService = new SessionsService(s3ProviderMock);

      await expect(sessionsService.deleteSession(session_id)).rejects.toThrow(
        NotFoundException,
      );
      expect(sessionsManager.getSession).toHaveBeenCalledWith(session_id);
    });
  });

  describe('storeSessions', () => {
    // Successfully retrieves stored sessions from S3
    it('should retrieve stored sessions from S3 when sessions exist', async () => {
      const s3provider = {
        getJSONObject: jest.fn().mockResolvedValue([
          {
            id: '1',
            notify_webhooks: ['http://example.com'],
            is_authenticated: true,
          },
        ]),
        putJSONObject: jest.fn(),
      } as unknown as S3StorageProvider;

      jest.spyOn(sessionsManager as any, 'getSessions').mockReturnValue([
        {
          id: '1',
          notify_webhooks: ['http://example.com'],
          is_authenticated: true,
        },
        { id: '2', notify_webhooks: ['url'], is_authenticated: true },
      ]);

      const service = new SessionsService(s3provider);

      await service.storeSessions();

      expect(s3provider.getJSONObject).toHaveBeenCalledWith(
        'zapwise-whatsapp-sessions.json',
      );
      expect(s3provider.putJSONObject).toHaveBeenCalledWith(
        'zapwise-whatsapp-sessions.json',
        expect.arrayContaining([
          expect.objectContaining({
            id: '2',
            is_authenticated: true,
            notify_webhooks: ['url'],
          }),
          expect.objectContaining({
            id: '1',
            is_authenticated: true,
            notify_webhooks: ['http://example.com'],
          }),
        ]),
      );
    });

    it('should remove sessions that is in s3 store but not in memory sessions', async () => {
      const s3provider = {
        getJSONObject: jest.fn().mockResolvedValue([
          {
            id: '1',
            notify_webhooks: 'http://example.com',
            is_authenticated: true,
          },
          {
            id: '2',
            notify_webhooks: 'http://example.com',
            is_authenticated: true,
          },
        ]),
        putJSONObject: jest.fn(),
      } as unknown as S3StorageProvider;

      jest.spyOn(sessionsManager as any, 'getSessions').mockReturnValue([
        {
          id: '2',
          notify_webhooks: 'http://example.com',
          is_authenticated: true,
        },
      ]);

      const service = new SessionsService(s3provider);

      await service.storeSessions();

      expect(s3provider.getJSONObject).toHaveBeenCalledWith(
        'zapwise-whatsapp-sessions.json',
      );
      expect(s3provider.putJSONObject).toHaveBeenCalledWith(
        'zapwise-whatsapp-sessions.json',
        expect.arrayContaining([
          {
            id: '2',
            is_authenticated: true,
            notify_webhooks: 'http://example.com',
          },
        ]),
      );
    });
  });

  describe('removeExpiredSessions', () => {
    // Successfully removes sessions that are not authenticated and have expired
    it('should remove sessions that are not authenticated and have expired', async () => {
      const mockSessions = [
        {
          id: '1',
          is_authenticated: false,
          notify_webhooks: ['url'],
          created_at: new Date(Date.now() - 130000),
        },
        {
          id: '2',
          is_authenticated: true,
          notify_webhooks: ['url'],
          created_at: new Date(Date.now() - 130000),
        },
        {
          id: '3',
          is_authenticated: false,
          notify_webhooks: ['url'],
          created_at: new Date(Date.now() - 110000),
        },
      ];

      jest
        .spyOn(sessionsManager, 'getSessions')
        .mockReturnValueOnce(mockSessions);
      const deleteSessionSpy = jest
        .spyOn(SessionsService.prototype, 'deleteSession')
        .mockResolvedValueOnce(null);

      const service = new SessionsService(s3ProviderMock);
      await service.removeExpiredSessions();

      expect(deleteSessionSpy).toHaveBeenCalledWith('1');
      expect(deleteSessionSpy).not.toHaveBeenCalledWith('2');
      expect(deleteSessionSpy).not.toHaveBeenCalledWith('3');
    });

    // No sessions available in sessionsManager
    it('should handle no sessions available in sessionsManager', async () => {
      jest.spyOn(sessionsManager, 'getSessions').mockReturnValueOnce([]);
      const deleteSessionSpy = jest
        .spyOn(SessionsService.prototype, 'deleteSession')
        .mockResolvedValueOnce(null);

      const service = new SessionsService(s3ProviderMock);
      await service.removeExpiredSessions();

      expect(deleteSessionSpy).not.toHaveBeenCalled();
    });
  });

  describe('addListenerWebhook', () => {
    it('should throw an error when session does not exists', async () => {
      const service = new SessionsService(s3ProviderMock);
      await expect(
        service.addListenerWebhook('not-exist', { webhook: 'webhook' }),
      ).rejects.toThrow(NotFoundException);
    });
    it('should add new webhook url in session on success', async () => {
      const service = new SessionsService(s3ProviderMock);
      const session = new Session({
        id: randomUUID(),
        notify_webhooks: ['test.com'],
        whatsapp_client: {
          ev: {
            on: jest.fn(),
          },
        },
      });
      sessionsManager.addSession(session);

      await service.addListenerWebhook(session.id, { webhook: 'webhook' });

      expect(
        sessionsManager.getSession(session.id).notify_webhooks.length,
      ).toBe(2);
      expect(sessionsManager.getSession(session.id).notify_webhooks[1]).toBe(
        'webhook',
      );
    });
  });

  describe('deleteListenerWebhook', () => {
    it('should throw an error when session does not exists', async () => {
      const service = new SessionsService(s3ProviderMock);
      await expect(
        service.deleteListenerWebhook('not-exist', { webhook: 'webhook' }),
      ).rejects.toThrow(NotFoundException);
    });
    it('should remove webhook url in session on success', async () => {
      const service = new SessionsService(s3ProviderMock);
      const session = new Session({
        id: randomUUID(),
        notify_webhooks: ['test.com'],
        whatsapp_client: {
          ev: {
            on: jest.fn(),
          },
        },
      });
      sessionsManager.addSession(session);

      await service.deleteListenerWebhook(session.id, { webhook: 'test.com' });

      expect(
        sessionsManager.getSession(session.id).notify_webhooks.length,
      ).toBe(0);
    });
  });

  describe('restoreSessions', () => {
    it('Should restart sessions when never sent message', async () => {
      const service = new SessionsService(s3ProviderMock);
      const session = new Session({
        id: randomUUID(),
        notify_webhooks: ['test.com'],
        whatsapp_client: {
          ev: {
            on: jest.fn(),
          },
          end: jest.fn(),
        },
      });
      session.is_authenticated = true;
      session.last_message_sent_at = undefined;
      const restartSpy = jest.spyOn(session, 'restart');

      sessionsManager.addSession(session);

      await service.restartSessions();

      expect(restartSpy).toHaveBeenCalled();
    });

    it('Should restart sessions when time between session.last_sent_message_at and now is greater thant or equal 10 min', async () => {
      const service = new SessionsService(s3ProviderMock);
      const session = new Session({
        id: randomUUID(),
        notify_webhooks: ['test.com'],
        whatsapp_client: {
          ev: {
            on: jest.fn(),
          },
          end: jest.fn(),
        },
      });
      const now = new Date();
      now.setMinutes(now.getMinutes() - 10);
      session.is_authenticated = true;
      session.last_message_sent_at = now.getTime();

      const restartSpy = jest.spyOn(session, 'restart');

      sessionsManager.addSession(session);

      await service.restartSessions();

      expect(restartSpy).toHaveBeenCalled();
    });

    it("Should NOT restart session when isn't authenticated", async () => {
      const service = new SessionsService(s3ProviderMock);
      const session = new Session({
        id: randomUUID(),
        notify_webhooks: ['test.com'],
        whatsapp_client: {
          ev: {
            on: jest.fn(),
          },
          end: jest.fn(),
        },
      });

      session.is_authenticated = false;

      const restartSpy = jest.spyOn(session, 'restart');

      sessionsManager.addSession(session);

      await service.restartSessions();

      expect(restartSpy).not.toHaveBeenCalled();
    });

    it('Should NOT restart session when time between session.last_sent_message_at and not is lower than 10 min', async () => {
      const service = new SessionsService(s3ProviderMock);
      const session = new Session({
        id: randomUUID(),
        notify_webhooks: ['test.com'],
        whatsapp_client: {
          ev: {
            on: jest.fn(),
          },
          end: jest.fn(),
        },
      });
      const now = new Date();
      now.setMinutes(now.getMinutes() - 9);
      session.is_authenticated = true;
      session.last_message_sent_at = now.getTime();
      const restartSpy = jest.spyOn(session, 'restart');

      sessionsManager.addSession(session);

      await service.restartSessions();

      expect(restartSpy).not.toHaveBeenCalled();
    });
  });
});

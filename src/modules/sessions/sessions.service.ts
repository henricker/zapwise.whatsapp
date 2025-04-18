import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Socket } from 'socket.io';
import {
  AddListenerWebhook,
  DeleteListenerWebhook,
  LoadSessionDto,
} from './sessions.dto';
import { Baileys } from '../common/infra/baileys/start-sock';
import { Session } from './sessions.entity';
import sessionsManager from '../common/sessions.manager';
import { S3StorageProvider } from '../providers/s3-storage.provider';

@Injectable()
export class SessionsService implements OnModuleInit {
  constructor(private readonly s3provider: S3StorageProvider) {}

  async loadSession(data: LoadSessionDto, client: Socket) {
    const { session_id, notify_webhooks } = data;
    const sock = await Baileys.startSock({
      session_id,
      onQrCode(qr) {
        client.emit('whatsapp.qrcode', { qr });
      },
      onReady(phone_number) {
        client.emit('whatsapp.connected', { phone_number });
        sessionsManager.updateAuthenticated(session_id, true);
        client?.disconnect(true);
      },
    });
    const session = new Session({
      id: session_id,
      notify_webhooks,
      whatsapp_client: sock,
    });
    sessionsManager.addSession(session);
  }

  async deleteSession(session_id: string) {
    const session = sessionsManager.getSession(session_id);

    if (!session)
      throw new NotFoundException(
        `Whatsapp with session ${session_id} doest not found`,
      );

    await session.kill();
  }

  async storeSessions() {
    const stored_sessions = (await this.s3provider.getJSONObject(
      'zapwise-whatsapp-sessions.json',
    )) as Pick<Session, 'id' | 'notify_webhooks'>[];

    const memory_sessions = sessionsManager.getSessions();

    const sessions_to_store = memory_sessions.filter(
      (session_to_store) =>
        !stored_sessions.find(
          (stored_session) => stored_session.id === session_to_store.id,
        ),
    );

    const sessions_to_remove = stored_sessions.filter(
      (session_to_remove) =>
        !memory_sessions.find(
          (session_memory) => session_memory.id === session_to_remove.id,
        ),
    );

    const merged_sessions: Pick<Session, 'id' | 'notify_webhooks'>[] = [
      ...sessions_to_store,
      ...stored_sessions.filter(
        (stored_session) =>
          !sessions_to_remove.find(
            (session_to_remove) => session_to_remove.id === stored_session.id,
          ),
      ),
    ];

    await this.s3provider.putJSONObject(
      'zapwise-whatsapp-sessions.json',
      merged_sessions,
    );
  }

  private async restoreSessions() {
    sessionsManager.deleteAllSessions();
    const sessions = (await this.s3provider.getJSONObject(
      'zapwise-whatsapp-sessions.json',
    )) as Pick<Session, 'id' | 'notify_webhooks' | 'is_authenticated'>[];
    const authenticated_sessions = sessions.filter((v) => v.is_authenticated);
    await Promise.all(
      authenticated_sessions.map(async (session_stored) => {
        const whatsapp_client = await Baileys.startSock({
          session_id: session_stored.id,
          onReady: () => {
            sessionsManager.updateAuthenticated(session_stored.id, true);
          },
        });
        sessionsManager.addSession(
          new Session({
            id: session_stored.id,
            notify_webhooks: session_stored.notify_webhooks,
            whatsapp_client,
          }),
        );
      }),
    );
  }

  async removeExpiredSessions() {
    const all_sessions = sessionsManager.getSessions();
    const expired_miliseconds = 120000;
    const now_miliseconds = new Date().getTime();
    const all_sessions_expired = all_sessions.filter(
      (session) =>
        !session.is_authenticated &&
        now_miliseconds - session.created_at.getTime() >= expired_miliseconds,
    );
    await Promise.all(
      all_sessions_expired.map((session) => this.deleteSession(session.id)),
    );
  }

  async restartSessions() {
    const all_sessions = sessionsManager.getSessions();
    const window_time_to_restart_in_miliseconds = 600000;
    const now_miliseconds = new Date().getTime();
    const sessions_to_restart_connection = all_sessions.filter(
      (session) =>
        session.is_authenticated &&
        now_miliseconds - (session.last_message_sent_at || 0) >=
          window_time_to_restart_in_miliseconds,
    );

    await Promise.all(
      sessions_to_restart_connection.map(async (session) => {
        const session_to_restart = sessionsManager.getSession(session.id);
        await session_to_restart.restart();
      }),
    );
  }

  async onModuleInit() {
    await this.restoreSessions();
  }

  async addListenerWebhook(session_id: string, body: AddListenerWebhook) {
    const session = sessionsManager.getSession(session_id);
    if (!session) throw new NotFoundException('Session not found');
    if (!session.notify_webhooks) session['notify_webhooks'] = [body.webhook];
    else session.notify_webhooks.push(body.webhook);
  }

  async deleteListenerWebhook(session_id: string, body: DeleteListenerWebhook) {
    const session = sessionsManager.getSession(session_id);
    if (!session) throw new NotFoundException('Session not found');
    session.notify_webhooks = session.notify_webhooks.filter(
      (v) => v !== body.webhook,
    );
  }
}

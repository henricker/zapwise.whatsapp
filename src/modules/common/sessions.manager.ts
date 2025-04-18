import { Session } from '../sessions/sessions.entity';
import sessions from './sessions';

class SessionManager {
  addSession(session: Session): void {
    sessions[session.id] = session;
  }

  getSession(session_id: string): Session {
    return sessions[session_id];
  }

  deleteSession(session_id: string): void {
    Reflect.deleteProperty(sessions, session_id);
  }

  deleteAllSessions(): void {
    Object.keys(sessions).forEach((session_id) => {
      Reflect.deleteProperty(sessions, session_id);
    });
  }

  updateAuthenticated(session_id: string, authenticated: boolean) {
    const session = sessions[session_id];
    session.is_authenticated = authenticated;
  }

  getSessions(): Pick<
    Session,
    | 'id'
    | 'notify_webhooks'
    | 'is_authenticated'
    | 'created_at'
    | 'last_message_sent_at'
  >[] {
    return Object.values(sessions).map((v) => ({
      id: v.id,
      notify_webhooks: v.notify_webhooks,
      is_authenticated: v.is_authenticated,
      created_at: v.created_at,
      phone: v.phone,
      last_message_sent_at: v.last_message_sent_at,
    })) as any;
  }
}

export default new SessionManager();

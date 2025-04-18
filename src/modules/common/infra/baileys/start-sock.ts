import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import logger from './logger';
import useS3AuthState from './s3';
import { ForceLogoutError } from '../../../sessions/errors';
import sessionsManager from '../../sessions.manager';

export type startSockParams = {
  session_id: string;
  onQrCode?: (qr: string) => void;
  onReady?: (phone_number: string) => void;
};

export class Baileys {
  static async startSock({
    session_id,
    onQrCode,
    onReady,
  }: startSockParams): Promise<any> {
    const { state, saveCreds } = await useS3AuthState(session_id);
    const { version } = await fetchLatestBaileysVersion();

    let sock = makeWASocket({
      version,
      logger: logger as any,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger as any),
      },
      shouldIgnoreJid: (jid) => isJidBroadcast(jid),
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, receivedPendingNotifications } =
        update;

      if (connection === 'close') {
        if (
          (lastDisconnect as any)?.error?.output?.statusCode !==
            DisconnectReason.loggedOut &&
          !lastDisconnect?.error?.message?.includes(ForceLogoutError.MESSAGE)
        ) {
          sock = (await Baileys.startSock({
            session_id,
            onQrCode,
            onReady,
          })) as any;
          const session = sessionsManager.getSession(session_id);
          if(session) 
            session['whatsapp_client'] = sock;
        }
      }

      if (onQrCode && qr) {
        onQrCode(qr);
      }

      if (onReady && receivedPendingNotifications) {
        onReady(sock.authState.creds.me?.id.split(':')[0]);
      }
    });

    sock.ev.on('creds.update', async () => {
      await saveCreds();
    });

    return sock;
  }
}

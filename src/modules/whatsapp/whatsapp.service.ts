import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SendMessageDto } from './whatsapp.dto';
import sessionsManager from '../common/sessions.manager';

@Injectable()
export class WhatsappService {
  async sendmessage(session_id: string, body: SendMessageDto) {
    const session = sessionsManager.getSession(session_id);

    if (!session)
      throw new NotFoundException(
        `Whatsapp with session ${session_id} doest not found`,
      );

    if (!session.is_authenticated)
      throw new BadRequestException(
        `Whatsapp with session ${session_id} does not authenticated`,
      );

    await session.sendMessage({
      messages: body.messages,
      phone_number: body.phone_number,
    });
  }
}

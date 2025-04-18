import { MessageTypeEnum } from '../../sessions/sessions.types';
import sessionsManager from '../../common/sessions.manager';
import { Session } from '../../sessions/sessions.entity';
import { WhatsappService } from '../whatsapp.service';

import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WhatsappService', () => {
  describe('sendmessage', () => {
    // Successfully sends a message when session is valid and authenticated
    it('should send a message when session is valid and authenticated', async () => {
      const session_id = 'valid_session_id';
      const body = {
        phone_number: '1234567890',
        messages: [{ body: 'Hello', type: MessageTypeEnum.TEXT }],
      };
      const session = {
        is_authenticated: true,
        sendMessage: jest.fn().mockResolvedValue(true),
      } as unknown as Session;
      jest.spyOn(sessionsManager, 'getSession').mockReturnValue(session);

      const whatsappService = new WhatsappService();
      await whatsappService.sendmessage(session_id, body);

      expect(session.sendMessage).toHaveBeenCalledWith({
        phone_number: body.phone_number,
        messages: body.messages,
      });
    });

    // Throws NotFoundException when session does not exist
    it('should throw NotFoundException when session does not exist', async () => {
      const session_id = 'invalid_session_id';
      const body = {
        phone_number: '1234567890',
        messages: [{ body: 'Hello', type: MessageTypeEnum.TEXT }],
      };
      jest.spyOn(sessionsManager, 'getSession').mockReturnValue(null);

      const whatsappService = new WhatsappService();

      await expect(
        whatsappService.sendmessage(session_id, body),
      ).rejects.toThrow(NotFoundException);
    });

    // Throws BadRequestException when session is not authenticated
    it('should throw BadRequestException when session is not authenticated', async () => {
      const session_id = 'invalid_session_id';
      const body = {
        phone_number: '1234567890',
        messages: [{ body: 'Hello', type: MessageTypeEnum.TEXT }],
      };
      const session = {
        is_authenticated: false,
      } as Session;
      jest.spyOn(sessionsManager, 'getSession').mockReturnValue(session);

      const whatsappService = new WhatsappService();

      await expect(
        whatsappService.sendmessage(session_id, body),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

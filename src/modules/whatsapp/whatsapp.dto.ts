import { z } from 'zod';
import { MessageTypeEnum } from '../sessions/sessions.types';
import { ApiProperty } from '@nestjs/swagger';

export const sendMessageSchema = z.object({
  phone_number: z.string(),
  messages: z
    .array(
      z.object({
        type: z.nativeEnum(MessageTypeEnum),
        body: z.string(),
        mime_type: z.string().optional(),
      }),
    )
    .nonempty(),
});

export type SendMessageDto = {
  phone_number: string;
  messages: {
    type: MessageTypeEnum;
    body: string;
    mime_type?: string;
  }[];
};

class MessageDtoSwagger {
  @ApiProperty({
    enum: MessageTypeEnum,
    example: MessageTypeEnum.TEXT,
  })
  type: MessageTypeEnum;

  @ApiProperty({
    example: 'Hello, world!',
  })
  body: string;

  @ApiProperty({ example: 'application/pdf' })
  mime_type: string;
}

export class SendMessageDtoSwagger {
  @ApiProperty({
    example: '5599999999999',
  })
  phone_number: string;

  @ApiProperty({
    type: [MessageDtoSwagger],
    example: [
      { type: MessageTypeEnum.TEXT, body: 'Hello there!' },
      { type: MessageTypeEnum.IMAGE, body: 'https://example.com/image.jpg' },
      { type: MessageTypeEnum.VIDEO, body: 'https://example.com/video.wav' },
      { type: MessageTypeEnum.AUDIO, body: 'https://example.com/audio.mp3' },
    ],
  })
  messages: MessageDtoSwagger[];
}

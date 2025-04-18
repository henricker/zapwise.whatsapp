import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UsePipes,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import {
  SendMessageDto,
  SendMessageDtoSwagger,
  sendMessageSchema,
} from './whatsapp.dto';
import { ZodValidationPipe } from 'src/common/validators/zod-validator.pipe';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @ApiBody({ type: [SendMessageDtoSwagger] })
  @ApiOkResponse()
  @ApiNotFoundResponse({
    status: 404,
    example: {
      message: `Whatsapp with session :session_id doest not found`,
    },
  })
  @ApiBadRequestResponse({
    status: 400,
    example: {
      message: 'Whatsapp with session :session_id does not authenticated',
    },
  })
  @Post('/:id/send-message')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(sendMessageSchema))
  async sendMessage(
    @Param('id') session_id: string,
    @Body() body: SendMessageDto,
  ) {
    return this.whatsappService.sendmessage(session_id, body);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UsePipes,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import sessionsManager from '../common/sessions.manager';
import {
  AddListenerWebhook,
  DeleteListenerWebhook,
  getSessionExampleResponse,
  webhookSchema,
} from './sessions.dto';
import { ZodValidationPipe } from 'src/common/validators/zod-validator.pipe';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Put('/:id/webhook')
  @UsePipes(new ZodValidationPipe(webhookSchema))
  @ApiOkResponse()
  @ApiNotFoundResponse({
    example: {
      message: 'Session not found',
    },
  })
  async addListenerWebhook(
    @Param('id') session_id: string,
    @Body() body: AddListenerWebhook,
  ) {
    return this.sessionsService.addListenerWebhook(session_id, body);
  }

  @Delete('/:id/webhook')
  @ApiOkResponse()
  @ApiNotFoundResponse({
    example: {
      message: 'Session not found',
    },
  })
  async deleteListenerWebhook(
    @Param('id') session_id: string,
    @Query() query: DeleteListenerWebhook,
  ) {
    return this.sessionsService.deleteListenerWebhook(session_id, query);
  }

  @Delete('/:id')
  @ApiOkResponse()
  @ApiNotFoundResponse({
    example: {
      message: 'Whatsapp with session :session_id doest not found',
    },
  })
  async deleteSession(@Param('id') session_id: string) {
    return this.sessionsService.deleteSession(session_id);
  }

  @Get()
  @ApiOkResponse({
    example: getSessionExampleResponse,
  })
  async getSessions() {
    return sessionsManager.getSessions();
  }
}

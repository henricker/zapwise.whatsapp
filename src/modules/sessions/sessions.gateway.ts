import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { LoadSessionDto } from './sessions.dto';
import { SessionsService } from './sessions.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'sessions',
})
export class SessionsGateway {
  constructor(private readonly sessionsService: SessionsService) {}

  @SubscribeMessage('load-session')
  async loadSession(
    @MessageBody() data: LoadSessionDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    await this.sessionsService.loadSession(data, client);
  }
}

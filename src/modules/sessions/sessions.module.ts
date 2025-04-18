import { Module } from '@nestjs/common';
import { SessionsGateway } from './sessions.gateway';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsScheduler } from './sessions.scheduler';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  controllers: [SessionsController],
  providers: [SessionsGateway, SessionsService, SessionsScheduler],
  imports: [ProvidersModule],
})
export class SessionsModule {}

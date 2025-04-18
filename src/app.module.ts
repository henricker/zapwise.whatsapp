import { Module } from '@nestjs/common';
import { SessionsModule } from './modules/sessions/sessions.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ConfigModule } from '@nestjs/config';
import { ProvidersModule } from './modules/providers/providers.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    SessionsModule,
    WhatsappModule,
    ProvidersModule,
  ],
})
export class AppModule {}

import { Injectable } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SessionsScheduler {
  constructor(private readonly sessionsService: SessionsService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async storeSessions() {
    await this.sessionsService.storeSessions();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async removeExpiredSessions() {
    await this.sessionsService.removeExpiredSessions();
  }

  @Cron(CronExpression.EVERY_2_HOURS)
  async restartSessions() {
    await this.sessionsService.restartSessions();
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ZapwiseInternalTokenGuard implements CanActivate {
  constructor() {}

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest();
    const internalToken = request.headers['zapwise-internal-token'];

    if (!internalToken) {
      throw new UnauthorizedException('Internal token missing');
    }

    if (internalToken !== process.env.ZAPWISE_INTERNAL_TOKEN) {
      throw new UnauthorizedException('Invalid internal token');
    }

    return true;
  }
}

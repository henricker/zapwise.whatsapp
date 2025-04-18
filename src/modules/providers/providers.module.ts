import { Module } from '@nestjs/common';
import { S3StorageProvider } from './s3-storage.provider';

@Module({
  exports: [S3StorageProvider],
  providers: [S3StorageProvider],
})
export class ProvidersModule {}

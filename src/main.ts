import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ZapwiseInternalTokenGuard } from './common/auth/zapwise-internal-token.guard';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swagger_config = new DocumentBuilder()
    .setTitle('zapwise.whatsapp')
    .setDescription(
      'Microserviço de sessões de whatsapp e envio de mensagens e notificações para o projeto zapwise',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'zapwise-internal-token',
        in: 'header',
        description: 'Token interno para autenticação',
      },
      'zapwise-internal-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swagger_config);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalGuards(new ZapwiseInternalTokenGuard());
  app.enableCors()
  app.enableShutdownHooks()
  await app.listen(process.env.PORT || 3000);
}
bootstrap();

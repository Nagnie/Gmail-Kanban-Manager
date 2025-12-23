import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { GmailModule } from './gmail/gmail.module';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import googleOauthConfig from './config/google-oauth.config';
import { MailboxModule } from './mailbox/mailbox.module';
import { EmailModule } from './email/email.module';
import { AttachmentModule } from './attachment/attachment.module';
import { ThreadModule } from './thread/thread.module';
import { OpenRouterModule } from './open-router/open-router.module';
import openRouterConfig from './config/open-router.config';
import { KanbanModule } from './kanban/kanban.module';
import { CacheModule } from '@nestjs/cache-manager';
import { SnoozeModule } from './snooze/snooze.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, googleOauthConfig, openRouterConfig],
    }),
    ScheduleModule.forRoot(),
    // Cache Module (global)
    CacheModule.register({
      isGlobal: true, // Available in all modules
      ttl: 3600, // 1 hour (in seconds)
      max: 1000, // Max 1000 items in cache
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        ssl: configService.get<boolean>('database.ssl'),
        channelBinding: configService.get<string>('database.channelBinding'),
        autoLoadEntities: true,
        synchronize: false,
        logging: ['error'],
      }),
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    UserModule,
    AuthModule,
    GmailModule,
    MailboxModule,
    EmailModule,
    AttachmentModule,
    ThreadModule,
    OpenRouterModule,
    KanbanModule,
    SnoozeModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

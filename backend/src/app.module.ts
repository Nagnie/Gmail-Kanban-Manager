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
import { AtGuard } from './auth/guards/at.guard';
import { APP_GUARD } from '@nestjs/core/constants';
import { RtGuard } from './auth/guards/rt.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, googleOauthConfig],
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
    UserModule,
    AuthModule,
    GmailModule,
  ],
  controllers: [AppController],
  providers: [
    AppService, 
  ],
})
export class AppModule {}

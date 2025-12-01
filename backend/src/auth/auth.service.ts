import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config/dist/types/config.type';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import googleOauthConfig from 'src/config/google-oauth.config';
import jwtConfig from 'src/config/jwt.config';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { encrypt } from 'src/utils/encrypt.util';
import { compareHashedText } from 'src/utils/hash.util';

@Injectable()
export class AuthService {
  private oauth2Client: OAuth2Client;
  private jwtSecret: string;
  private jwtRefreshSecret: string;

  constructor(
    private jwtService: JwtService,
    private userService: UserService,
    @Inject(googleOauthConfig.KEY)
    googleOauthConfiguration: ConfigType<typeof googleOauthConfig>,
    @Inject(jwtConfig.KEY) jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {
    this.jwtSecret = jwtConfiguration.secret;
    this.jwtRefreshSecret = jwtConfiguration.refreshSecret;
    this.oauth2Client = new google.auth.OAuth2(
      googleOauthConfiguration.clientId,
      googleOauthConfiguration.clientSecret,
      googleOauthConfiguration.redirectUri,
    );
  }

  async googleLogin(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      this.oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data: googleUser } = await oauth2.userinfo.get();

      if (!googleUser.email) throw new UnauthorizedException('Email not found');

      const encryptedToken = tokens.refresh_token
        ? ((await encrypt(tokens.refresh_token)) ?? '')
        : '';

      const user: User = await this.userService.findOrCreateUser(
        googleUser,
        encryptedToken,
      );

      const payload = { sub: user.id, email: user.email };
      const [at, rt] = await Promise.all([
        this.jwtService.signAsync(payload, {
          secret: this.jwtSecret,
          expiresIn: '15m',
        }),
        this.jwtService.signAsync(payload, {
          secret: this.jwtRefreshSecret,
          expiresIn: '7d',
        }),
      ]);

      await this.userService.updateRtHash(user.id, rt);

      return {
        appAccessToken: at,
        appRefreshToken: rt,
        user: { email: user.email, name: user.name },
      };
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user: User = await this.userService.findOne(userId);
    console.log('🚀 ~ AuthService ~ refreshTokens ~ user:', user);

    const isRtValid =
      (await compareHashedText(refreshToken, user.hashedRefreshToken || '')) ||
      refreshToken === user.hashedRefreshToken;
    console.log('🚀 ~ AuthService ~ refreshTokens ~ isRtValid:', isRtValid);
    if (!isRtValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { access_token, refresh_token } = await this.generateTokens(
      userId,
      user.email,
    );

    await this.userService.updateRtHash(user.id, refresh_token);

    return { access_token, refresh_token };
  }

  async logout(userId: number) {
    await this.userService.logout(userId);
  }

  async generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email };

    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtSecret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.jwtRefreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return { access_token: at, refresh_token: rt };
  }
}

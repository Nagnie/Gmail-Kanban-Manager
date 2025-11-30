/* eslint-disable @typescript-eslint/require-await */
import {
  Body,
  Controller,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RtGuard } from './guards/rt.guard';
import { ConfigType } from '@nestjs/config';
import { Response } from 'express';
import jwtConfig from 'src/config/jwt.config';

@Controller('auth')
export class AuthController {
  private jwtRefreshExpiration: number;

  constructor(
    private readonly authService: AuthService,
    @Inject(jwtConfig.KEY) jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {
    this.jwtRefreshExpiration = jwtConfiguration.refreshExpiresInMs;
  }

  @Post('google-login')
  async googleLogin(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log(code);
    const data = await this.authService.googleLogin(code);

    res.cookie('refresh_token', data.appRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: this.jwtRefreshExpiration,
    });

    console.log(data.appAccessToken);

    return {
      accessToken: data.appAccessToken,
      user: data.user,
    };
  }

  @UseGuards(RtGuard)
  @Post('refresh')
  async refreshTokens(@Req() req, @Res({ passthrough: true }) res: Response) {
    const userId: number = req.user['sub'];
    const refreshToken: string = req.user['refreshToken'];
    console.log(
      '🚀 ~ AuthController ~ refreshTokens ~ refreshToken:',
      refreshToken,
    );

    const tokens = await this.authService.refreshTokens(userId, refreshToken);

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: this.jwtRefreshExpiration,
    });

    return { accessToken: tokens.access_token };
  }

  @Post('logout')
  async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token');
    const userId: number = req.user['sub'];
    await this.authService.logout(userId);

    return { message: 'Logged out successfully' };
  }
}

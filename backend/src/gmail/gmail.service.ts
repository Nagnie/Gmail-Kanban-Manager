import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { google } from 'googleapis';
import googleOauthConfig from 'src/config/google-oauth.config';
import { UserService } from 'src/user/user.service';
import { decrypt } from 'src/utils/encrypt.util';

@Injectable()
export class GmailService {
    constructor(
        @Inject(googleOauthConfig.KEY) private googleOauthConfiguration: ConfigType<typeof googleOauthConfig>,
        private userService: UserService
    ) {

    }

  private async getAuthenticatedGmailClient(userId: number) {
    const user = await this.userService.findOne(userId);

    if (!user.googleRefreshToken) {
      throw new UnauthorizedException('User has not linked Google account');
    }

    const refreshToken = await decrypt(user.googleRefreshToken);

    const oauth2Client = new google.auth.OAuth2(
      this.googleOauthConfiguration.clientId,
      this.googleOauthConfiguration.clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }


  async listLabels(userId: number) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.labels.list({ userId: 'me' });
    return res.data;
  }

  async listMessages(userId: number, query?: string, pageToken?: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 20,
      pageToken: pageToken,
    });
    return res.data;
  }

  async getMessage(userId: number, messageId: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return res.data;
  }

  //rawContent should be base64url encoded email content
  async sendMessage(userId: number, rawContent: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawContent,
      },
    });
    return res.data;
  }
}

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { gmail_v1, google } from 'googleapis';
import googleOauthConfig from 'src/config/google-oauth.config';
import { UserService } from 'src/user/user.service';
import { decrypt } from 'src/utils/encrypt.util';

@Injectable()
export class GmailService {
  constructor(
    @Inject(googleOauthConfig.KEY)
    private googleOauthConfiguration: ConfigType<typeof googleOauthConfig>,
    private userService: UserService,
  ) {}

  private async getAuthenticatedGmailClient(userId: number) {
    const user = await this.userService.findOne(userId);

    if (!user.googleRefreshToken) {
      throw new UnauthorizedException('User has not linked Google account');
    }

    const refreshToken = await decrypt(user.googleRefreshToken);

    const oauth2Client = new google.auth.OAuth2(
      this.googleOauthConfiguration.clientId,
      this.googleOauthConfiguration.clientSecret,
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async listLabels(userId: number) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.labels.list({
      userId: 'me',
    });
    return res.data;
  }

  async getLabel(userId: number, labelId: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.labels.get({
      userId: 'me',
      id: labelId,
    });
    return res.data;
  }

  async getEmailsByLabel(
    userId: number,
    labelId: string,
    query?: string,
    pageToken?: string,
  ) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [labelId],
      q: query,
      maxResults: 20,
      pageToken: pageToken,
    });
    return res.data;
  }

  async getEmailMetadata(userId: number, messageId: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'To', 'Date'],
    });
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

  async modifyMessage(
    userId: number,
    messageId: string,
    requestBody: gmail_v1.Schema$ModifyMessageRequest,
  ) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody,
    });

    return res.data;
  }

  async batchModifyMessages(
    userId: number,
    requestBody: gmail_v1.Schema$BatchModifyMessagesRequest,
  ) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ...requestBody,
      },
    });

    return res.data;
  }

  async moveMessageToTrash(userId: number, messageId: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.trash({
      userId: 'me',
      id: messageId,
    });

    return res.data;
  }

  async untrashMessage(userId: number, messageId: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.untrash({
      userId: 'me',
      id: messageId,
    });
    return res.data;
  }

  async deleteMessage(userId: number, messageId: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    await gmail.users.messages.delete({
      userId: 'me',
      id: messageId,
    });
  }

  async batchDeleteMessages(userId: number, messageIds: string[]) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.batchDelete({
      userId: 'me',
      requestBody: {
        ids: messageIds,
      },
    });
    return res.data;
  }

  async getAttachment(userId: number, messageId: string, attachmentId: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId,
    });
    return res.data;
  }

  async sendEmail(userId: number, rawContent: string, threadId?: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const requestBody: gmail_v1.Params$Resource$Users$Messages$Send = {
      userId: 'me',
      requestBody: {
        raw: rawContent,
        threadId: threadId,
      },
    };

    const res = await gmail.users.messages.send(requestBody);
    return res.data;
  }

  async getThread(userId: number, threadId: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);

    const res = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'full',
    });

    return res.data;
  }

  async getThreadMetadata(userId: number, threadId: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.threads.get({
      userId: 'me',
      id: threadId,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'To', 'Date'],
    });
    return res.data;
  }

  async getThreadsByLabel(
    userId: number,
    labelId: string,
    query?: string,
    pageToken?: string,
    maxResults: number = 20,
  ) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.threads.list({
      userId: 'me',
      labelIds: [labelId],
      q: query,
      maxResults,
      pageToken,
    });
    return res.data;
  }

  async getThreadsByLabels(
    userId: number,
    labelIds: string[],
    query?: string,
    pageToken?: string,
    maxResults: number = 20,
  ) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.threads.list({
      userId: 'me',
      labelIds: labelIds,
      q: query,
      maxResults,
      pageToken,
    });
    return res.data;
  }

  async listThreads(userId: number, query?: string, pageToken?: string) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const res = await gmail.users.threads.list({
      userId: 'me',
      q: query,
      maxResults: 20,
      pageToken: pageToken,
    });
    return res.data;
  }
}

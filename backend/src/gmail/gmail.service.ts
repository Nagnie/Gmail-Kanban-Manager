import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
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
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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

  async createLabel(
    userId: number,
    labelName: string,
    options?: {
      backgroundColor?: string;
      textColor?: string;
    },
  ) {
    const gmail = await this.getAuthenticatedGmailClient(userId);

    try {
      const response = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelHide',
          messageListVisibility: 'hide',
          color: options?.backgroundColor
            ? {
                backgroundColor: options.backgroundColor,
                textColor: options.textColor || '#ffffff',
              }
            : undefined,
        },
      });

      // Invalidate cache for this user
      await this.clearUserLabelCache(userId);

      return response.data;
    } catch (error) {
      console.log('🚀 ~ GmailService ~ createLabel ~ error:', error);
      throw error;
    }
  }

  async listLabels_v2(userId: number) {
    const gmail = await this.getAuthenticatedGmailClient(userId);
    const response = await gmail.users.labels.list({ userId: 'me' });
    return response.data.labels || [];
  }

  async initializeKanbanLabels(userId: number): Promise<{
    created: string[];
    existing: string[];
  }> {
    const kanbanLabels = [
      {
        name: 'Kanban/To Do',
        backgroundColor: '#fb8c00', // Orange
        textColor: '#ffffff',
      },
      {
        name: 'Kanban/In Progress',
        backgroundColor: '#f9a825', // Yellow
        textColor: '#000000',
      },
      {
        name: 'Kanban/Done',
        backgroundColor: '#43a047', // Green
        textColor: '#ffffff',
      },
      {
        name: 'Kanban/Snoozed',
        backgroundColor: '#8e24aa', // Purple
        textColor: '#ffffff',
      },
    ];

    const created: string[] = [];
    const existing: string[] = [];

    // Get all labels from Gmail
    const allLabels = await this.listLabels_v2(userId);
    const existingNames = allLabels.map((l) => l.name);

    for (const labelConfig of kanbanLabels) {
      if (existingNames.includes(labelConfig.name)) {
        existing.push(labelConfig.name);
      } else {
        await this.createLabel(userId, labelConfig.name);
        created.push(labelConfig.name);
      }
    }

    // Cache user labels for future use
    await this.cacheUserLabels(userId, allLabels);

    return { created, existing };
  }

  async getLabelIdByName(
    userId: number,
    labelName: string,
  ): Promise<string | null> {
    const cacheKey = `label:${userId}:${labelName}`;
    const cached = await this.cacheManager.get<string>(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from Gmail API
    const labels = await this.listLabels_v2(userId);
    const label = labels.find((l) => l.name === labelName);

    if (label?.id) {
      // Store in cache (TTL = 1 hour)
      await this.cacheManager.set(cacheKey, label.id, 3600);
      return label.id;
    }

    // if label is Kanban label and not found, create it
    // bắt buộc phải có :)))
    if (labelName.startsWith('Kanban/')) {
      const newLabel = await this.createLabel(userId, labelName);
      if (newLabel.id) {
        await this.cacheManager.set(cacheKey, newLabel.id, 3600);
        return newLabel.id;
      }
    }

    return null;
  }

  async convertLabelNamesToIds(
    userId: number,
    labelNames: string[],
  ): Promise<string[]> {
    const labelIds: string[] = [];

    for (const name of labelNames) {
      // System labels use name as ID
      if (this.isSystemLabel(name)) {
        labelIds.push(name);
        continue;
      }

      // User labels need ID lookup
      const labelId = await this.getLabelIdByName(userId, name);
      if (labelId) {
        labelIds.push(labelId);
      } else {
        // Handle missing label (could throw error or skip)
      }
    }

    return labelIds;
  }

  private isSystemLabel(labelName: string): boolean {
    const systemLabels = [
      'INBOX',
      'SENT',
      'DRAFT',
      'SPAM',
      'TRASH',
      'UNREAD',
      'STARRED',
      'IMPORTANT',
      'CATEGORY_PERSONAL',
      'CATEGORY_SOCIAL',
      'CATEGORY_PROMOTIONS',
      'CATEGORY_UPDATES',
      'CATEGORY_FORUMS',
    ];

    return systemLabels.includes(labelName);
  }

  private async cacheUserLabels(userId: number, labels: any[]) {
    const promises = labels
      .filter((l) => l.name && l.id)
      .map((label) => {
        const cacheKey = `label:${userId}:${label.name}`;
        return this.cacheManager.set(cacheKey, label.id, 3600);
      });

    await Promise.all(promises);
  }

  private async clearUserLabelCache(userId: number) {
    console.log('🚀 ~ GmailService ~ clearUserLabelCache ~ userId:', userId);
    return Promise.resolve();
    // Note: cache-manager doesn't support wildcard delete
    // You'll need to track keys or use Redis for pattern-based deletion
    // For now, we rely on TTL expiration
  }
}

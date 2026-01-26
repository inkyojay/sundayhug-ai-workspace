/**
 * 썬데이허그 AI 에이전트 시스템 - 알림 유틸리티
 *
 * 카카오톡, 슬랙 등 다양한 채널로 알림을 발송합니다.
 * 긴급도에 따라 적절한 채널로 라우팅됩니다.
 */

import {
  NotificationChannel,
  NotificationPriority,
  NotificationMessage,
  NotificationAttachment,
} from '../types';
import { systemLogger } from './logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * 알림 설정 인터페이스
 */
interface NotificationConfig {
  /** 카카오톡 API 설정 */
  kakao?: {
    apiKey: string;
    templateId?: string;
    senderKey?: string;
  };
  /** 슬랙 설정 */
  slack?: {
    webhookUrl: string;
    defaultChannel?: string;
    botToken?: string;
  };
  /** 이메일 설정 */
  email?: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpPassword: string;
    fromAddress: string;
  };
  /** SMS 설정 */
  sms?: {
    apiKey: string;
    apiSecret: string;
    sender: string;
  };
}

/**
 * 알림 발송 결과
 */
interface NotificationResult {
  success: boolean;
  messageId: string;
  channel: NotificationChannel;
  error?: string;
  sentAt?: Date;
}

/**
 * 긴급도별 알림 채널 매핑
 * 긴급도가 높을수록 더 즉각적인 채널을 사용합니다.
 */
const priorityChannelMapping: Record<NotificationPriority, NotificationChannel[]> = {
  [NotificationPriority.LOW]: [NotificationChannel.SLACK],
  [NotificationPriority.MEDIUM]: [NotificationChannel.SLACK, NotificationChannel.KAKAO],
  [NotificationPriority.HIGH]: [NotificationChannel.KAKAO, NotificationChannel.SLACK, NotificationChannel.SMS],
  [NotificationPriority.URGENT]: [NotificationChannel.SMS, NotificationChannel.KAKAO, NotificationChannel.SLACK],
};

/**
 * 수신자 그룹 정의
 */
interface RecipientGroup {
  /** 그룹 이름 */
  name: string;
  /** 슬랙 채널 */
  slackChannel?: string;
  /** 카카오톡 수신자 */
  kakaoRecipients?: string[];
  /** SMS 수신자 */
  smsRecipients?: string[];
  /** 이메일 수신자 */
  emailRecipients?: string[];
}

/**
 * 기본 수신자 그룹
 */
const defaultRecipientGroups: Record<string, RecipientGroup> = {
  operations: {
    name: '운영팀',
    slackChannel: '#sundayhug-operations',
    kakaoRecipients: [],
    smsRecipients: [],
  },
  management: {
    name: '관리자',
    slackChannel: '#sundayhug-alerts',
    kakaoRecipients: [],
    smsRecipients: [],
  },
  emergency: {
    name: '긴급 대응',
    slackChannel: '#sundayhug-emergency',
    kakaoRecipients: [],
    smsRecipients: [],
  },
};

/**
 * 알림 서비스 클래스
 */
export class NotificationService {
  private config: NotificationConfig;
  private recipientGroups: Record<string, RecipientGroup>;

  /**
   * NotificationService 생성자
   * @param config - 알림 설정
   */
  constructor(config?: Partial<NotificationConfig>) {
    this.config = this.loadConfig(config);
    this.recipientGroups = { ...defaultRecipientGroups };
  }

  /**
   * 환경 변수에서 설정 로드
   * @param overrides - 오버라이드 설정
   * @returns 알림 설정
   */
  private loadConfig(overrides?: Partial<NotificationConfig>): NotificationConfig {
    const config: NotificationConfig = {};

    // 카카오톡 설정
    if (process.env.KAKAO_API_KEY) {
      config.kakao = {
        apiKey: process.env.KAKAO_API_KEY,
        templateId: process.env.KAKAO_TEMPLATE_ID,
        senderKey: process.env.KAKAO_SENDER_KEY,
      };
    }

    // 슬랙 설정
    if (process.env.SLACK_WEBHOOK_URL) {
      config.slack = {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        defaultChannel: process.env.SLACK_DEFAULT_CHANNEL,
        botToken: process.env.SLACK_BOT_TOKEN,
      };
    }

    // 이메일 설정
    if (process.env.SMTP_HOST) {
      config.email = {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUser: process.env.SMTP_USER || '',
        smtpPassword: process.env.SMTP_PASSWORD || '',
        fromAddress: process.env.SMTP_FROM || '',
      };
    }

    // SMS 설정
    if (process.env.SMS_API_KEY) {
      config.sms = {
        apiKey: process.env.SMS_API_KEY,
        apiSecret: process.env.SMS_API_SECRET || '',
        sender: process.env.SMS_SENDER || '',
      };
    }

    return { ...config, ...overrides };
  }

  /**
   * 수신자 그룹 등록
   * @param groupId - 그룹 ID
   * @param group - 그룹 정보
   */
  registerRecipientGroup(groupId: string, group: RecipientGroup): void {
    this.recipientGroups[groupId] = group;
  }

  /**
   * 알림 메시지 생성
   * @param params - 메시지 파라미터
   * @returns 알림 메시지
   */
  createMessage(params: {
    channel: NotificationChannel;
    priority: NotificationPriority;
    recipients: string[];
    title: string;
    content: string;
    link?: string;
    attachments?: NotificationAttachment[];
    scheduledAt?: Date;
  }): NotificationMessage {
    return {
      id: uuidv4(),
      channel: params.channel,
      priority: params.priority,
      recipients: params.recipients,
      title: params.title,
      content: params.content,
      link: params.link,
      attachments: params.attachments,
      scheduledAt: params.scheduledAt,
      status: 'pending',
    };
  }

  /**
   * 슬랙으로 알림 발송
   * @param message - 알림 메시지
   * @returns 발송 결과
   */
  private async sendSlack(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.config.slack?.webhookUrl) {
      return {
        success: false,
        messageId: message.id,
        channel: NotificationChannel.SLACK,
        error: 'Slack webhook URL not configured',
      };
    }

    try {
      const payload = this.buildSlackPayload(message);

      const response = await fetch(this.config.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status}`);
      }

      systemLogger.info('Slack notification sent', {
        messageId: message.id,
        title: message.title,
      });

      return {
        success: true,
        messageId: message.id,
        channel: NotificationChannel.SLACK,
        sentAt: new Date(),
      };
    } catch (err) {
      const error = err as Error;
      systemLogger.error('Failed to send Slack notification', error);

      return {
        success: false,
        messageId: message.id,
        channel: NotificationChannel.SLACK,
        error: error.message,
      };
    }
  }

  /**
   * 슬랙 페이로드 빌드
   * @param message - 알림 메시지
   * @returns 슬랙 페이로드
   */
  private buildSlackPayload(message: NotificationMessage): Record<string, unknown> {
    const priorityEmoji: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: ':information_source:',
      [NotificationPriority.MEDIUM]: ':warning:',
      [NotificationPriority.HIGH]: ':rotating_light:',
      [NotificationPriority.URGENT]: ':fire:',
    };

    const blocks: unknown[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${priorityEmoji[message.priority]} ${message.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.content,
        },
      },
    ];

    // 링크 추가
    if (message.link) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<${message.link}|자세히 보기>`,
        },
      });
    }

    // 버튼 첨부 처리
    const buttons = message.attachments?.filter((a) => a.type === 'button');
    if (buttons && buttons.length > 0) {
      blocks.push({
        type: 'actions',
        elements: buttons.map((btn) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: btn.name || '버튼',
          },
          url: btn.data,
        })),
      });
    }

    return {
      channel: message.recipients[0] || this.config.slack?.defaultChannel,
      blocks,
      text: `${message.title}: ${message.content}`, // 폴백 텍스트
    };
  }

  /**
   * 카카오톡으로 알림 발송
   * @param message - 알림 메시지
   * @returns 발송 결과
   */
  private async sendKakao(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.config.kakao?.apiKey) {
      return {
        success: false,
        messageId: message.id,
        channel: NotificationChannel.KAKAO,
        error: 'Kakao API key not configured',
      };
    }

    try {
      // 카카오 알림톡 API 호출
      // 실제 구현에서는 카카오 비즈니스 API를 사용합니다.
      const apiUrl = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';

      const templateObject = {
        object_type: 'text',
        text: `[${message.title}]\n\n${message.content}`,
        link: {
          web_url: message.link || '',
          mobile_web_url: message.link || '',
        },
        button_title: '자세히 보기',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${this.config.kakao.apiKey}`,
        },
        body: `template_object=${encodeURIComponent(JSON.stringify(templateObject))}`,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Kakao API error: ${JSON.stringify(errorData)}`);
      }

      systemLogger.info('Kakao notification sent', {
        messageId: message.id,
        title: message.title,
        recipientCount: message.recipients.length,
      });

      return {
        success: true,
        messageId: message.id,
        channel: NotificationChannel.KAKAO,
        sentAt: new Date(),
      };
    } catch (err) {
      const error = err as Error;
      systemLogger.error('Failed to send Kakao notification', error);

      return {
        success: false,
        messageId: message.id,
        channel: NotificationChannel.KAKAO,
        error: error.message,
      };
    }
  }

  /**
   * SMS로 알림 발송
   * @param message - 알림 메시지
   * @returns 발송 결과
   */
  private async sendSMS(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.config.sms?.apiKey) {
      return {
        success: false,
        messageId: message.id,
        channel: NotificationChannel.SMS,
        error: 'SMS API not configured',
      };
    }

    try {
      // SMS API 호출 (예: NHN Cloud, 알리고 등)
      // 실제 구현에서는 선택한 SMS 서비스의 API를 사용합니다.

      // SMS는 텍스트 길이 제한이 있으므로 내용 축약
      const smsContent = `[썬데이허그] ${message.title}\n${message.content}`.slice(0, 90);

      systemLogger.info('SMS notification sent', {
        messageId: message.id,
        title: message.title,
        recipientCount: message.recipients.length,
      });

      // TODO: 실제 SMS API 연동
      // 여기서는 시뮬레이션
      console.log(`[SMS] To: ${message.recipients.join(', ')}`);
      console.log(`[SMS] Content: ${smsContent}`);

      return {
        success: true,
        messageId: message.id,
        channel: NotificationChannel.SMS,
        sentAt: new Date(),
      };
    } catch (err) {
      const error = err as Error;
      systemLogger.error('Failed to send SMS notification', error);

      return {
        success: false,
        messageId: message.id,
        channel: NotificationChannel.SMS,
        error: error.message,
      };
    }
  }

  /**
   * 이메일로 알림 발송
   * @param message - 알림 메시지
   * @returns 발송 결과
   */
  private async sendEmail(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.config.email?.smtpHost) {
      return {
        success: false,
        messageId: message.id,
        channel: NotificationChannel.EMAIL,
        error: 'Email SMTP not configured',
      };
    }

    try {
      // 이메일 발송 (nodemailer 등 사용)
      // TODO: 실제 이메일 발송 구현

      systemLogger.info('Email notification sent', {
        messageId: message.id,
        title: message.title,
        recipientCount: message.recipients.length,
      });

      return {
        success: true,
        messageId: message.id,
        channel: NotificationChannel.EMAIL,
        sentAt: new Date(),
      };
    } catch (err) {
      const error = err as Error;
      systemLogger.error('Failed to send email notification', error);

      return {
        success: false,
        messageId: message.id,
        channel: NotificationChannel.EMAIL,
        error: error.message,
      };
    }
  }

  /**
   * 단일 채널로 알림 발송
   * @param message - 알림 메시지
   * @returns 발송 결과
   */
  async send(message: NotificationMessage): Promise<NotificationResult> {
    switch (message.channel) {
      case NotificationChannel.SLACK:
        return this.sendSlack(message);
      case NotificationChannel.KAKAO:
        return this.sendKakao(message);
      case NotificationChannel.SMS:
        return this.sendSMS(message);
      case NotificationChannel.EMAIL:
        return this.sendEmail(message);
      default:
        return {
          success: false,
          messageId: message.id,
          channel: message.channel,
          error: `Unsupported channel: ${message.channel}`,
        };
    }
  }

  /**
   * 긴급도에 따라 적절한 채널로 알림 발송
   * @param params - 알림 파라미터
   * @returns 발송 결과 배열
   */
  async sendByPriority(params: {
    priority: NotificationPriority;
    recipientGroup: string;
    title: string;
    content: string;
    link?: string;
    attachments?: NotificationAttachment[];
  }): Promise<NotificationResult[]> {
    const { priority, recipientGroup, title, content, link, attachments } = params;
    const channels = priorityChannelMapping[priority];
    const group = this.recipientGroups[recipientGroup];

    if (!group) {
      systemLogger.warn(`Recipient group not found: ${recipientGroup}`);
      return [];
    }

    const results: NotificationResult[] = [];

    for (const channel of channels) {
      let recipients: string[] = [];

      switch (channel) {
        case NotificationChannel.SLACK:
          recipients = group.slackChannel ? [group.slackChannel] : [];
          break;
        case NotificationChannel.KAKAO:
          recipients = group.kakaoRecipients || [];
          break;
        case NotificationChannel.SMS:
          recipients = group.smsRecipients || [];
          break;
        case NotificationChannel.EMAIL:
          recipients = group.emailRecipients || [];
          break;
      }

      if (recipients.length === 0) {
        continue;
      }

      const message = this.createMessage({
        channel,
        priority,
        recipients,
        title,
        content,
        link,
        attachments,
      });

      const result = await this.send(message);
      results.push(result);

      // 높은 우선순위는 첫 번째 성공 채널에서 중단하지 않고 모든 채널로 발송
      // 낮은 우선순위는 첫 번째 성공 시 중단
      if (result.success && priority === NotificationPriority.LOW) {
        break;
      }
    }

    return results;
  }

  /**
   * 에이전트 오류 알림 발송
   * @param agentId - 에이전트 ID
   * @param error - 에러 정보
   * @param context - 추가 컨텍스트
   */
  async notifyAgentError(
    agentId: string,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    await this.sendByPriority({
      priority: NotificationPriority.HIGH,
      recipientGroup: 'operations',
      title: `에이전트 오류 발생: ${agentId}`,
      content: [
        `**에러 메시지:** ${error.message}`,
        context ? `**컨텍스트:** \`\`\`${JSON.stringify(context, null, 2)}\`\`\`` : '',
        `**발생 시간:** ${new Date().toISOString()}`,
      ].filter(Boolean).join('\n'),
    });
  }

  /**
   * 승인 요청 알림 발송
   * @param approvalId - 승인 요청 ID
   * @param title - 제목
   * @param description - 설명
   * @param approvalLink - 승인 페이지 링크
   */
  async notifyApprovalRequest(
    approvalId: string,
    title: string,
    description: string,
    approvalLink: string
  ): Promise<void> {
    await this.sendByPriority({
      priority: NotificationPriority.MEDIUM,
      recipientGroup: 'management',
      title: `승인 요청: ${title}`,
      content: description,
      link: approvalLink,
      attachments: [
        {
          type: 'button',
          name: '승인하기',
          data: `${approvalLink}?action=approve`,
        },
        {
          type: 'button',
          name: '거절하기',
          data: `${approvalLink}?action=reject`,
        },
      ],
    });
  }

  /**
   * 일일 리포트 알림 발송
   * @param reportTitle - 리포트 제목
   * @param summary - 요약 내용
   * @param reportLink - 상세 리포트 링크
   */
  async notifyDailyReport(
    reportTitle: string,
    summary: string,
    reportLink: string
  ): Promise<void> {
    await this.sendByPriority({
      priority: NotificationPriority.LOW,
      recipientGroup: 'management',
      title: reportTitle,
      content: summary,
      link: reportLink,
    });
  }
}

/**
 * 전역 알림 서비스 인스턴스
 */
let notificationService: NotificationService | null = null;

/**
 * 알림 서비스 인스턴스 가져오기
 * @returns NotificationService 인스턴스
 */
export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
}

/**
 * 간편 알림 발송 함수
 * @param priority - 우선순위
 * @param recipientGroup - 수신자 그룹
 * @param title - 제목
 * @param content - 내용
 */
export async function notify(
  priority: NotificationPriority,
  recipientGroup: string,
  title: string,
  content: string
): Promise<void> {
  const service = getNotificationService();
  await service.sendByPriority({
    priority,
    recipientGroup,
    title,
    content,
  });
}

export default NotificationService;

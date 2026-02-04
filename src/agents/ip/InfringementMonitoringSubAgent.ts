/**
 * 침해감시 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 카피캣 모니터링, 침해알림을 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
  DateRange,
} from '../../types';
import {
  InfringementCase,
  InfringementType,
  InfringementSeverity,
  ResponseStatus,
  MonitoringChannel,
  MonitoringResult,
  MonitoringConfig,
  InfringerInfo,
  InfringedItem,
  InfringementEvidence,
  IntellectualProperty,
  IPType,
  InfringementMonitoringTaskPayload,
  InfringementMonitoringResult,
} from './types';

/**
 * 침해감시 서브에이전트 클래스
 */
export class InfringementMonitoringSubAgent extends SubAgent {
  /** 모니터링 설정 */
  private monitoringConfig: MonitoringConfig = {
    id: 'default-config',
    enabled: true,
    channels: [
      MonitoringChannel.COUPANG,
      MonitoringChannel.NAVER,
      MonitoringChannel.GMARKET,
    ],
    keywords: ['썬데이허그', 'SUNDAYHUG', '선데이허그'],
    intervalHours: 24,
    similarityThreshold: 70,
    autoNotify: true,
  };

  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Infringement Monitoring SubAgent...');
  }

  /**
   * 정리
   */
  protected async cleanup(): Promise<void> {
    await this.cleanupSubAgent();
  }

  /**
   * 메인 실행 로직
   */
  protected async run(context: AgentContext): Promise<AgentResult<InfringementMonitoringResult>> {
    const startTime = Date.now();
    const payload = context.data as InfringementMonitoringTaskPayload;

    this.logger.info('Running Infringement Monitoring SubAgent', {
      action: payload.action,
    });

    try {
      let result: InfringementMonitoringResult;

      switch (payload.action) {
        case 'scan':
          result = await this.scanForInfringements(
            payload.channels || this.monitoringConfig.channels,
            payload.keywords || this.monitoringConfig.keywords,
            payload.options
          );
          break;

        case 'analyze':
          result = await this.analyzeDetectedCases(payload.period);
          break;

        case 'update_config':
          result = await this.updateMonitoringConfig(payload);
          break;

        case 'generate_report':
          result = await this.generateMonitoringReport(payload.period);
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Infringement monitoring failed', error as Error);
      throw error;
    }
  }

  /**
   * 침해 스캔
   */
  private async scanForInfringements(
    channels: MonitoringChannel[],
    keywords: string[],
    options?: InfringementMonitoringTaskPayload['options']
  ): Promise<InfringementMonitoringResult> {
    const monitoringResults: MonitoringResult[] = [];
    const detectedCases: InfringementCase[] = [];
    const similarityThreshold = options?.similarityThreshold || this.monitoringConfig.similarityThreshold;

    this.logger.info('Starting infringement scan', {
      channels,
      keywords,
      threshold: similarityThreshold,
    });

    for (const channel of channels) {
      try {
        const result = await this.scanChannel(channel, keywords, similarityThreshold);
        monitoringResults.push(result);

        if (result.suspectedCases.length > 0) {
          detectedCases.push(...result.suspectedCases);
        }

        this.logger.info(`Scanned ${channel}`, {
          itemsScanned: result.itemsScanned,
          newCases: result.newCasesCount,
        });
      } catch (error) {
        this.logger.error(`Failed to scan ${channel}`, error as Error);
        monitoringResults.push({
          id: `scan-${channel}-${Date.now()}`,
          channel,
          searchKeywords: keywords,
          scannedAt: new Date(),
          itemsScanned: 0,
          suspectedCases: [],
          newCasesCount: 0,
          updatedCasesCount: 0,
          errors: [(error as Error).message],
        });
      }
    }

    // 케이스 자동 생성
    if (options?.autoCreateCases) {
      for (const caseItem of detectedCases) {
        if (caseItem.status === ResponseStatus.DETECTED) {
          await this.saveCase(caseItem);
        }
      }
    }

    // 통계 계산
    const bySeverity: Record<InfringementSeverity, number> = {
      [InfringementSeverity.CRITICAL]: 0,
      [InfringementSeverity.HIGH]: 0,
      [InfringementSeverity.MEDIUM]: 0,
      [InfringementSeverity.LOW]: 0,
    };

    for (const caseItem of detectedCases) {
      bySeverity[caseItem.severity]++;
    }

    // 활성 케이스 조회
    const db = this.getDatabase('infringement_cases');
    const activeCasesResult = await db.findByCondition<InfringementCase>({});
    const activeCases = (activeCasesResult.data || []).filter(
      c => c.status !== ResponseStatus.RESOLVED && c.status !== ResponseStatus.DISMISSED
    );

    return {
      monitoringResults,
      detectedCases,
      summary: {
        channelsScanned: channels.length,
        itemsScanned: monitoringResults.reduce((sum, r) => sum + r.itemsScanned, 0),
        newCases: detectedCases.length,
        totalActiveCases: activeCases.length,
        bySeverity,
      },
    };
  }

  /**
   * 채널 스캔
   */
  private async scanChannel(
    channel: MonitoringChannel,
    keywords: string[],
    threshold: number
  ): Promise<MonitoringResult> {
    // 실제 구현에서는 각 플랫폼 API를 호출하여 검색합니다
    // 여기서는 시뮬레이션 데이터를 반환합니다

    const now = new Date();
    const suspectedCases: InfringementCase[] = [];

    // 시뮬레이션: 채널별로 0-3개의 의심 건 발견
    const casesToCreate = Math.floor(Math.random() * 4);

    for (let i = 0; i < casesToCreate; i++) {
      const similarityScore = Math.floor(Math.random() * 40) + 60; // 60-100

      if (similarityScore >= threshold) {
        const severity = this.calculateSeverity(similarityScore);
        const infringementType = this.randomInfringementType();

        suspectedCases.push({
          id: `case-${channel}-${now.getTime()}-${i}`,
          type: infringementType,
          severity,
          status: ResponseStatus.DETECTED,
          channel,
          infringer: this.generateMockInfringer(channel),
          infringedItem: this.generateMockInfringedItem(channel),
          affectedIP: this.generateMockAffectedIP(),
          detectedAt: now,
          similarityScore,
          evidence: [{
            id: `evidence-${now.getTime()}-${i}`,
            type: 'screenshot',
            url: `https://storage.example.com/evidence/${now.getTime()}.png`,
            description: '발견 당시 스크린샷',
            collectedAt: now,
          }],
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return {
      id: `scan-${channel}-${now.getTime()}`,
      channel,
      searchKeywords: keywords,
      scannedAt: now,
      itemsScanned: Math.floor(Math.random() * 500) + 100,
      suspectedCases,
      newCasesCount: suspectedCases.length,
      updatedCasesCount: 0,
    };
  }

  /**
   * 심각도 계산
   */
  private calculateSeverity(similarityScore: number): InfringementSeverity {
    if (similarityScore >= 95) return InfringementSeverity.CRITICAL;
    if (similarityScore >= 85) return InfringementSeverity.HIGH;
    if (similarityScore >= 75) return InfringementSeverity.MEDIUM;
    return InfringementSeverity.LOW;
  }

  /**
   * 랜덤 침해 유형
   */
  private randomInfringementType(): InfringementType {
    const types = [
      InfringementType.COPYCAT,
      InfringementType.TRADEMARK_MISUSE,
      InfringementType.IMAGE_THEFT,
      InfringementType.DESIGN_COPY,
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Mock 침해자 정보 생성
   */
  private generateMockInfringer(channel: MonitoringChannel): InfringerInfo {
    return {
      name: `의심판매자_${Math.random().toString(36).substr(2, 6)}`,
      sellerId: `seller_${Math.random().toString(36).substr(2, 8)}`,
      platformUrl: `https://${channel}.com/seller/xxx`,
    };
  }

  /**
   * Mock 침해 상품 정보 생성
   */
  private generateMockInfringedItem(channel: MonitoringChannel): InfringedItem {
    return {
      name: '유사 상품명',
      url: `https://${channel}.com/products/${Math.random().toString(36).substr(2, 8)}`,
      price: Math.floor(Math.random() * 50000) + 10000,
      imageUrls: ['https://example.com/image.jpg'],
    };
  }

  /**
   * Mock 영향받는 IP 정보 생성
   */
  private generateMockAffectedIP(): InfringementCase['affectedIP'] {
    return {
      ipId: `ip-${Date.now()}`,
      ipType: IPType.TRADEMARK,
      registrationNumber: '40-1234567',
      name: '썬데이허그',
    };
  }

  /**
   * 케이스 저장
   */
  private async saveCase(caseItem: InfringementCase): Promise<void> {
    const db = this.getDatabase('infringement_cases');
    await db.create(caseItem);
    this.logger.info(`Saved infringement case: ${caseItem.id}`);
  }

  /**
   * 발견 케이스 분석
   */
  private async analyzeDetectedCases(period?: DateRange): Promise<InfringementMonitoringResult> {
    const db = this.getDatabase('infringement_cases');
    const casesResult = await db.findByCondition<InfringementCase>({});
    let cases = casesResult.data || [];

    // 기간 필터링
    if (period) {
      cases = cases.filter(c => {
        const detectedAt = new Date(c.detectedAt);
        return detectedAt >= period.start && detectedAt <= period.end;
      });
    }

    // 활성 케이스만
    const activeCases = cases.filter(
      c => c.status !== ResponseStatus.RESOLVED && c.status !== ResponseStatus.DISMISSED
    );

    // 통계 계산
    const bySeverity: Record<InfringementSeverity, number> = {
      [InfringementSeverity.CRITICAL]: 0,
      [InfringementSeverity.HIGH]: 0,
      [InfringementSeverity.MEDIUM]: 0,
      [InfringementSeverity.LOW]: 0,
    };

    for (const caseItem of activeCases) {
      bySeverity[caseItem.severity]++;
    }

    return {
      detectedCases: activeCases,
      summary: {
        channelsScanned: 0,
        itemsScanned: 0,
        newCases: 0,
        totalActiveCases: activeCases.length,
        bySeverity,
      },
    };
  }

  /**
   * 모니터링 설정 업데이트
   */
  private async updateMonitoringConfig(
    payload: InfringementMonitoringTaskPayload
  ): Promise<InfringementMonitoringResult> {
    if (payload.channels) {
      this.monitoringConfig.channels = payload.channels;
    }
    if (payload.keywords) {
      this.monitoringConfig.keywords = payload.keywords;
    }
    if (payload.options?.similarityThreshold) {
      this.monitoringConfig.similarityThreshold = payload.options.similarityThreshold as number;
    }

    this.logger.info('Updated monitoring config', this.monitoringConfig);

    return {
      summary: {
        channelsScanned: 0,
        itemsScanned: 0,
        newCases: 0,
        totalActiveCases: 0,
        bySeverity: {
          [InfringementSeverity.CRITICAL]: 0,
          [InfringementSeverity.HIGH]: 0,
          [InfringementSeverity.MEDIUM]: 0,
          [InfringementSeverity.LOW]: 0,
        },
      },
    };
  }

  /**
   * 모니터링 리포트 생성
   */
  private async generateMonitoringReport(period?: DateRange): Promise<InfringementMonitoringResult> {
    return await this.analyzeDetectedCases(period);
  }
}

export default InfringementMonitoringSubAgent;

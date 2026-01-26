/**
 * 지원사업 모니터링 서브에이전트
 * LANE 3 - Management & Compliance
 *
 * 지원사업 크롤링, 적합성 매칭을 담당합니다.
 */

import { SubAgent, SubAgentConfig } from '../base/SubAgent';
import {
  AgentContext,
  AgentResult,
} from '../../types';
import {
  SupportProgram,
  SupportProgramType,
  SupportAgencyType,
  ProgramStatus,
  FitLevel,
  FitAnalysisResult,
  CrawlingConfig,
  CrawlingSource,
  CrawlingResult,
  SupportMonitoringTaskPayload,
  SupportMonitoringResult,
  SupportAgency,
  EligibilityCriteria,
} from './types';

/**
 * 지원사업 모니터링 서브에이전트 클래스
 */
export class SupportMonitoringSubAgent extends SubAgent {
  /** 크롤링 설정 */
  private crawlingConfig: CrawlingConfig = {
    id: 'default-config',
    sources: [
      {
        id: 'k-startup',
        name: 'K-Startup',
        url: 'https://www.k-startup.go.kr',
        agencyType: SupportAgencyType.GOVERNMENT,
        priority: 1,
      },
      {
        id: 'sbiz',
        name: '소상공인마당',
        url: 'https://www.sbiz.or.kr',
        agencyType: SupportAgencyType.PUBLIC_INSTITUTION,
        priority: 2,
      },
      {
        id: 'semas',
        name: '소상공인시장진흥공단',
        url: 'https://www.semas.or.kr',
        agencyType: SupportAgencyType.PUBLIC_INSTITUTION,
        priority: 3,
      },
    ],
    keywords: ['유아용품', '이커머스', '소상공인', '중소기업', '수출'],
    intervalHours: 24,
    autoNotify: true,
    minFitScore: 60,
    enabled: true,
  };

  /** 썬데이허그 회사 프로필 (적합성 분석용) */
  private companyProfile = {
    companySize: 'small' as const,
    industries: ['유아용품', '이커머스', '제조'],
    region: '서울',
    yearsInBusiness: 5,
    employeeCount: 15,
    annualRevenue: 3000000000, // 30억
  };

  constructor(config: SubAgentConfig) {
    super(config);
  }

  /**
   * 초기화
   */
  protected async initialize(): Promise<void> {
    this.logger.info('Initializing Support Monitoring SubAgent...');
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
  protected async run(context: AgentContext): Promise<AgentResult<SupportMonitoringResult>> {
    const startTime = Date.now();
    const payload = context.data as SupportMonitoringTaskPayload;

    this.logger.info('Running Support Monitoring SubAgent', {
      action: payload.action,
    });

    try {
      let result: SupportMonitoringResult;

      switch (payload.action) {
        case 'crawl':
          result = await this.crawlSupportPrograms(
            payload.sources,
            payload.keywords,
            payload.options
          );
          break;

        case 'analyze_fit':
          result = await this.analyzeFitForPrograms(payload.programTypes);
          break;

        case 'update_config':
          result = await this.updateCrawlingConfig(payload);
          break;

        case 'generate_report':
          result = await this.generateMonitoringReport();
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      return this.createSuccessResult(result, startTime);
    } catch (error) {
      this.logger.error('Support monitoring failed', error as Error);
      throw error;
    }
  }

  /**
   * 지원사업 크롤링
   */
  private async crawlSupportPrograms(
    sourceIds?: string[],
    keywords?: string[],
    options?: SupportMonitoringTaskPayload['options']
  ): Promise<SupportMonitoringResult> {
    const sources = sourceIds
      ? this.crawlingConfig.sources.filter(s => sourceIds.includes(s.id))
      : this.crawlingConfig.sources;
    const searchKeywords = keywords || this.crawlingConfig.keywords;

    const crawlingResults: CrawlingResult[] = [];
    const programs: SupportProgram[] = [];
    let newProgramsTotal = 0;

    this.logger.info('Starting support program crawling', {
      sources: sources.length,
      keywords: searchKeywords,
    });

    for (const source of sources) {
      try {
        const result = await this.crawlSource(source, searchKeywords);
        crawlingResults.push(result);

        if (result.newPrograms > 0) {
          newProgramsTotal += result.newPrograms;
        }

        this.logger.info(`Crawled ${source.name}`, {
          found: result.programsFound,
          new: result.newPrograms,
        });
      } catch (error) {
        this.logger.error(`Failed to crawl ${source.name}`, error as Error);
        crawlingResults.push({
          id: `crawl-${source.id}-${Date.now()}`,
          source,
          crawledAt: new Date(),
          programsFound: 0,
          newPrograms: 0,
          updatedPrograms: 0,
          fitPrograms: 0,
          errors: [(error as Error).message],
        });
      }
    }

    // 데이터베이스에서 최신 프로그램 조회
    const db = this.getDatabase('support_programs');
    const programsResult = await db.findByCondition<SupportProgram>({});
    const allPrograms = programsResult.data || [];

    // 적합성 분석
    let fitPrograms: SupportProgram[] = [];
    if (options?.includeFitAnalysis !== false) {
      fitPrograms = allPrograms.filter(p => {
        if (!p.fitAnalysis) return false;
        const minScore = options?.minFitScore || this.crawlingConfig.minFitScore || 60;
        return p.fitAnalysis.score >= minScore;
      });
    }

    // 알림 발송
    if (options?.sendNotification && fitPrograms.length > 0) {
      await this.notifyParent(
        '적합 지원사업 발견',
        `${fitPrograms.length}개의 적합한 지원사업이 발견되었습니다.\n` +
        fitPrograms.slice(0, 5).map(p =>
          `- ${p.name} (적합도: ${p.fitAnalysis?.score}%)`
        ).join('\n'),
        'medium'
      );
    }

    return {
      crawlingResults,
      programs: allPrograms,
      fitPrograms,
      summary: {
        sourcesScanned: sources.length,
        programsFound: crawlingResults.reduce((sum, r) => sum + r.programsFound, 0),
        newPrograms: newProgramsTotal,
        fitPrograms: fitPrograms.length,
      },
    };
  }

  /**
   * 소스 크롤링
   */
  private async crawlSource(
    source: CrawlingSource,
    keywords: string[]
  ): Promise<CrawlingResult> {
    // 실제 구현에서는 각 소스별 크롤러를 사용합니다
    // 여기서는 시뮬레이션 데이터를 반환합니다

    const now = new Date();
    const db = this.getDatabase('support_programs');

    // 시뮬레이션: 소스당 1-5개의 프로그램 발견
    const programsFound = Math.floor(Math.random() * 5) + 1;
    const newPrograms: SupportProgram[] = [];

    for (let i = 0; i < programsFound; i++) {
      const program = this.generateMockProgram(source, keywords, i);

      // 적합성 분석
      program.fitAnalysis = this.analyzeFit(program);

      // 저장
      await db.create(program);
      newPrograms.push(program);
    }

    return {
      id: `crawl-${source.id}-${now.getTime()}`,
      source,
      crawledAt: now,
      programsFound,
      newPrograms: newPrograms.length,
      updatedPrograms: 0,
      fitPrograms: newPrograms.filter(p =>
        p.fitAnalysis && p.fitAnalysis.score >= (this.crawlingConfig.minFitScore || 60)
      ).length,
    };
  }

  /**
   * Mock 프로그램 생성
   */
  private generateMockProgram(
    source: CrawlingSource,
    keywords: string[],
    index: number
  ): SupportProgram {
    const now = new Date();
    const programTypes = Object.values(SupportProgramType);
    const type = programTypes[Math.floor(Math.random() * programTypes.length)];

    const applicationStart = new Date(now);
    applicationStart.setDate(applicationStart.getDate() + Math.floor(Math.random() * 7));

    const applicationEnd = new Date(applicationStart);
    applicationEnd.setDate(applicationEnd.getDate() + 30);

    const agency: SupportAgency = {
      id: `agency-${source.id}`,
      name: source.name,
      type: source.agencyType,
      website: source.url,
    };

    const eligibility: EligibilityCriteria = {
      companySize: ['micro', 'small', 'medium'],
      industries: this.randomSubset(['유아용품', '이커머스', '제조', '도소매', '서비스']),
      regions: Math.random() > 0.3 ? undefined : ['서울', '경기'],
      yearsInBusiness: { min: 1, max: 10 },
      employeeCount: { min: 1, max: 50 },
    };

    return {
      id: `prog-${source.id}-${now.getTime()}-${index}`,
      name: this.generateProgramName(type),
      type,
      agency,
      status: ProgramStatus.OPEN,
      description: `${type} 유형의 지원사업입니다. ${keywords.join(', ')} 관련 기업 대상.`,
      eligibility,
      supportDetails: {
        amount: `최대 ${Math.floor(Math.random() * 9 + 1)}천만원`,
        supportRatio: `${Math.floor(Math.random() * 30 + 50)}%`,
        duration: `${Math.floor(Math.random() * 12 + 6)}개월`,
      },
      applicationPeriod: {
        start: applicationStart,
        end: applicationEnd,
      },
      announcementUrl: `${source.url}/announcement/${now.getTime()}`,
      source: source.name,
      crawledAt: now,
      tags: keywords.slice(0, 3),
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 프로그램명 생성
   */
  private generateProgramName(type: SupportProgramType): string {
    const year = new Date().getFullYear();
    const prefixes: Record<SupportProgramType, string[]> = {
      [SupportProgramType.SUBSIDY]: ['혁신성장', '스마트공장', '디지털전환'],
      [SupportProgramType.LOAN]: ['정책자금', '시설자금', '운전자금'],
      [SupportProgramType.TAX_BENEFIT]: ['세제지원', 'R&D세액공제'],
      [SupportProgramType.R_AND_D]: ['기술개발', 'R&D', '연구개발'],
      [SupportProgramType.EXPORT]: ['수출지원', '해외진출', '글로벌'],
      [SupportProgramType.MARKETING]: ['마케팅', '홍보지원', '온라인판로'],
      [SupportProgramType.CONSULTING]: ['컨설팅', '경영혁신', '전문가활용'],
      [SupportProgramType.EDUCATION]: ['역량강화', '인력양성', '교육훈련'],
      [SupportProgramType.FACILITY]: ['시설지원', '설비지원', '입주지원'],
      [SupportProgramType.EMPLOYMENT]: ['일자리', '채용지원', '고용안정'],
      [SupportProgramType.STARTUP]: ['창업지원', '스타트업', '예비창업'],
      [SupportProgramType.OTHER]: ['지원사업', '특별지원'],
    };

    const prefix = prefixes[type][Math.floor(Math.random() * prefixes[type].length)];
    return `${year}년 ${prefix} 지원사업`;
  }

  /**
   * 배열 랜덤 부분집합
   */
  private randomSubset<T>(arr: T[]): T[] {
    const count = Math.floor(Math.random() * (arr.length - 1)) + 1;
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /**
   * 적합성 분석
   */
  private analyzeFit(program: SupportProgram): FitAnalysisResult {
    const metCriteria: string[] = [];
    const unmetCriteria: string[] = [];
    const uncertainCriteria: string[] = [];
    let score = 50; // 기본 점수

    const eligibility = program.eligibility;

    // 기업 규모 체크
    if (eligibility.companySize) {
      if (eligibility.companySize.includes(this.companyProfile.companySize)) {
        metCriteria.push('기업 규모 조건 충족');
        score += 10;
      } else {
        unmetCriteria.push('기업 규모 조건 미충족');
        score -= 20;
      }
    }

    // 업종 체크
    if (eligibility.industries && eligibility.industries.length > 0) {
      const matched = eligibility.industries.some(ind =>
        this.companyProfile.industries.includes(ind)
      );
      if (matched) {
        metCriteria.push('업종 조건 충족');
        score += 15;
      } else {
        uncertainCriteria.push('업종 조건 확인 필요');
      }
    }

    // 지역 체크
    if (eligibility.regions && eligibility.regions.length > 0) {
      if (eligibility.regions.includes(this.companyProfile.region)) {
        metCriteria.push('지역 조건 충족');
        score += 5;
      } else {
        unmetCriteria.push('지역 조건 미충족');
        score -= 30;
      }
    } else {
      metCriteria.push('전국 대상 사업');
      score += 5;
    }

    // 업력 체크
    if (eligibility.yearsInBusiness) {
      const { min, max } = eligibility.yearsInBusiness;
      if (
        (!min || this.companyProfile.yearsInBusiness >= min) &&
        (!max || this.companyProfile.yearsInBusiness <= max)
      ) {
        metCriteria.push('업력 조건 충족');
        score += 10;
      } else {
        unmetCriteria.push('업력 조건 미충족');
        score -= 20;
      }
    }

    // 고용인원 체크
    if (eligibility.employeeCount) {
      const { min, max } = eligibility.employeeCount;
      if (
        (!min || this.companyProfile.employeeCount >= min) &&
        (!max || this.companyProfile.employeeCount <= max)
      ) {
        metCriteria.push('고용인원 조건 충족');
        score += 10;
      } else {
        unmetCriteria.push('고용인원 조건 미충족');
        score -= 15;
      }
    }

    // 점수 범위 조정
    score = Math.max(0, Math.min(100, score));

    // 적합도 레벨 결정
    let level: FitLevel;
    if (score >= 80) {
      level = FitLevel.EXCELLENT;
    } else if (score >= 60) {
      level = FitLevel.GOOD;
    } else if (score >= 40) {
      level = FitLevel.MODERATE;
    } else {
      level = FitLevel.LOW;
    }

    return {
      score,
      level,
      metCriteria,
      unmetCriteria,
      uncertainCriteria,
      recommendations: this.generateRecommendations(level, unmetCriteria),
      analyzedAt: new Date(),
    };
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(level: FitLevel, unmetCriteria: string[]): string[] {
    const recommendations: string[] = [];

    if (level === FitLevel.EXCELLENT || level === FitLevel.GOOD) {
      recommendations.push('신청을 적극 권장합니다.');
      recommendations.push('필요 서류를 미리 준비하세요.');
    } else if (level === FitLevel.MODERATE) {
      recommendations.push('자격 요건을 상세히 확인하세요.');
      if (unmetCriteria.length > 0) {
        recommendations.push(`미충족 조건 해소 방안을 검토하세요: ${unmetCriteria.join(', ')}`);
      }
    } else {
      recommendations.push('자격 요건 충족이 어려울 수 있습니다.');
      recommendations.push('유사한 다른 지원사업을 검토하세요.');
    }

    return recommendations;
  }

  /**
   * 프로그램들의 적합성 분석
   */
  private async analyzeFitForPrograms(
    types?: SupportProgramType[]
  ): Promise<SupportMonitoringResult> {
    const db = this.getDatabase('support_programs');
    const programsResult = await db.findByCondition<SupportProgram>({});
    let programs = programsResult.data || [];

    // 타입 필터링
    if (types && types.length > 0) {
      programs = programs.filter(p => types.includes(p.type));
    }

    // 적합성 재분석
    const updatedPrograms: SupportProgram[] = [];
    for (const program of programs) {
      program.fitAnalysis = this.analyzeFit(program);
      program.updatedAt = new Date();
      await db.update(program.id, program);
      updatedPrograms.push(program);
    }

    // 적합 프로그램 필터
    const fitPrograms = updatedPrograms.filter(p =>
      p.fitAnalysis && p.fitAnalysis.score >= (this.crawlingConfig.minFitScore || 60)
    );

    this.logger.info('Analyzed fit for programs', {
      total: programs.length,
      fit: fitPrograms.length,
    });

    return {
      programs: updatedPrograms,
      fitPrograms,
      summary: {
        sourcesScanned: 0,
        programsFound: programs.length,
        newPrograms: 0,
        fitPrograms: fitPrograms.length,
      },
    };
  }

  /**
   * 크롤링 설정 업데이트
   */
  private async updateCrawlingConfig(
    payload: SupportMonitoringTaskPayload
  ): Promise<SupportMonitoringResult> {
    if (payload.keywords) {
      this.crawlingConfig.keywords = payload.keywords;
    }
    if (payload.programTypes) {
      this.crawlingConfig.programTypes = payload.programTypes;
    }
    if (payload.options?.minFitScore) {
      this.crawlingConfig.minFitScore = payload.options.minFitScore;
    }

    this.logger.info('Updated crawling config', this.crawlingConfig);

    return {
      summary: {
        sourcesScanned: 0,
        programsFound: 0,
        newPrograms: 0,
        fitPrograms: 0,
      },
    };
  }

  /**
   * 모니터링 리포트 생성
   */
  private async generateMonitoringReport(): Promise<SupportMonitoringResult> {
    const db = this.getDatabase('support_programs');
    const programsResult = await db.findByCondition<SupportProgram>({});
    const programs = programsResult.data || [];

    // 접수 중인 프로그램
    const openPrograms = programs.filter(p => p.status === ProgramStatus.OPEN);

    // 적합 프로그램
    const fitPrograms = programs.filter(p =>
      p.fitAnalysis && p.fitAnalysis.score >= (this.crawlingConfig.minFitScore || 60)
    );

    // 우수 적합 프로그램
    const excellentFitPrograms = programs.filter(p =>
      p.fitAnalysis && p.fitAnalysis.level === FitLevel.EXCELLENT
    );

    this.logger.info('Generated monitoring report', {
      total: programs.length,
      open: openPrograms.length,
      fit: fitPrograms.length,
      excellent: excellentFitPrograms.length,
    });

    return {
      programs: openPrograms,
      fitPrograms,
      summary: {
        sourcesScanned: this.crawlingConfig.sources.length,
        programsFound: programs.length,
        newPrograms: 0,
        fitPrograms: fitPrograms.length,
      },
    };
  }
}

export default SupportMonitoringSubAgent;

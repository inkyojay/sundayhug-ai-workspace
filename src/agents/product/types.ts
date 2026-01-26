/**
 * Product Agent 전용 타입 정의
 * LANE 4: Analytics & Growth
 */

// =============================================================================
// 공통 열거형
// =============================================================================

/**
 * 제품 개발 단계
 */
export enum ProductStage {
  IDEA = 'idea',                     // 아이디어
  RESEARCH = 'research',             // 리서치
  CONCEPT = 'concept',               // 컨셉 정의
  DEVELOPMENT = 'development',       // 개발
  TESTING = 'testing',               // 테스트
  PRE_LAUNCH = 'pre_launch',         // 출시 준비
  LAUNCHED = 'launched',             // 출시됨
  DISCONTINUED = 'discontinued',     // 단종
}

/**
 * 제품 카테고리
 */
export enum ProductCategory {
  DIAPER = 'diaper',                 // 기저귀
  WIPE = 'wipe',                     // 물티슈
  SKINCARE = 'skincare',             // 스킨케어
  BATH = 'bath',                     // 목욕용품
  FEEDING = 'feeding',               // 수유용품
  ACCESSORY = 'accessory',           // 액세서리
}

/**
 * 리서치 타입
 */
export enum ResearchType {
  MARKET_ANALYSIS = 'market_analysis',       // 시장 분석
  COMPETITOR_ANALYSIS = 'competitor_analysis', // 경쟁사 분석
  CONSUMER_RESEARCH = 'consumer_research',   // 소비자 조사
  TREND_ANALYSIS = 'trend_analysis',         // 트렌드 분석
  PRICE_ANALYSIS = 'price_analysis',         // 가격 분석
  TECHNOLOGY_RESEARCH = 'technology_research', // 기술 조사
}

/**
 * 피드백 소스
 */
export enum FeedbackSource {
  REVIEW = 'review',                 // 리뷰
  SURVEY = 'survey',                 // 설문조사
  CS_INQUIRY = 'cs_inquiry',         // CS 문의
  SOCIAL_MEDIA = 'social_media',     // SNS
  FOCUS_GROUP = 'focus_group',       // 포커스 그룹
  SALES_DATA = 'sales_data',         // 판매 데이터
}

/**
 * 피드백 카테고리
 */
export enum FeedbackCategory {
  QUALITY = 'quality',               // 품질
  PRICE = 'price',                   // 가격
  DESIGN = 'design',                 // 디자인
  FUNCTIONALITY = 'functionality',   // 기능
  PACKAGING = 'packaging',           // 포장
  DELIVERY = 'delivery',             // 배송
  SERVICE = 'service',               // 서비스
  OTHER = 'other',                   // 기타
}

// =============================================================================
// 리서치 관련 타입
// =============================================================================

/**
 * 시장 리서치 결과
 */
export interface MarketResearch {
  /** 리서치 ID */
  id: string;
  /** 타입 */
  type: ResearchType;
  /** 제목 */
  title: string;
  /** 요약 */
  summary: string;
  /** 대상 카테고리 */
  targetCategory: ProductCategory;
  /** 시장 규모 */
  marketSize?: {
    totalValue: number;
    growthRate: number;
    unit: string;
    year: number;
  };
  /** 주요 발견 */
  keyFindings: string[];
  /** 기회 */
  opportunities: string[];
  /** 위협 */
  threats: string[];
  /** 데이터 소스 */
  dataSources: string[];
  /** 생성일 */
  createdAt: Date;
  /** 유효기간 */
  validUntil: Date;
}

/**
 * 경쟁사 분석
 */
export interface CompetitorAnalysis {
  /** 분석 ID */
  id: string;
  /** 경쟁사 이름 */
  competitorName: string;
  /** 대상 카테고리 */
  category: ProductCategory;
  /** 제품 목록 */
  products: CompetitorProduct[];
  /** 강점 */
  strengths: string[];
  /** 약점 */
  weaknesses: string[];
  /** 가격대 */
  priceRange: {
    min: number;
    max: number;
    average: number;
  };
  /** 시장 점유율 */
  marketShare?: number;
  /** 마케팅 전략 */
  marketingStrategies: string[];
  /** 분석일 */
  analyzedAt: Date;
}

/**
 * 경쟁사 제품
 */
export interface CompetitorProduct {
  /** 제품명 */
  name: string;
  /** 가격 */
  price: number;
  /** 특징 */
  features: string[];
  /** 평균 평점 */
  rating?: number;
  /** 리뷰 수 */
  reviewCount?: number;
  /** 판매 채널 */
  channels: string[];
}

/**
 * 트렌드 리포트
 */
export interface TrendReport {
  /** 리포트 ID */
  id: string;
  /** 카테고리 */
  category: ProductCategory;
  /** 기간 */
  period: {
    start: Date;
    end: Date;
  };
  /** 상승 트렌드 */
  risingTrends: TrendItem[];
  /** 하락 트렌드 */
  decliningTrends: TrendItem[];
  /** 안정 트렌드 */
  stableTrends: TrendItem[];
  /** 신규 키워드 */
  emergingKeywords: string[];
  /** 소비자 선호 변화 */
  consumerPreferenceChanges: string[];
  /** 생성일 */
  createdAt: Date;
}

/**
 * 트렌드 아이템
 */
export interface TrendItem {
  /** 트렌드 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 성장률 (%) */
  growthRate: number;
  /** 신뢰도 */
  confidence: number;
  /** 관련 키워드 */
  relatedKeywords: string[];
}

// =============================================================================
// 제품 기획 관련 타입
// =============================================================================

/**
 * 제품 컨셉
 */
export interface ProductConcept {
  /** 컨셉 ID */
  id: string;
  /** 제품명 (가칭) */
  workingName: string;
  /** 카테고리 */
  category: ProductCategory;
  /** 단계 */
  stage: ProductStage;
  /** 타겟 고객 */
  targetCustomer: {
    ageGroup: string;
    characteristics: string[];
    painPoints: string[];
  };
  /** 핵심 가치 제안 */
  valueProposition: string;
  /** 주요 기능 */
  keyFeatures: string[];
  /** 차별화 포인트 */
  differentiators: string[];
  /** 예상 가격대 */
  estimatedPrice: {
    min: number;
    max: number;
    target: number;
  };
  /** 출시 목표일 */
  targetLaunchDate?: Date;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 제품 스펙
 */
export interface ProductSpec {
  /** 스펙 ID */
  id: string;
  /** 컨셉 ID 참조 */
  conceptId: string;
  /** 제품명 */
  productName: string;
  /** 기본 정보 */
  basic: {
    sku: string;
    barcode?: string;
    weight: number;
    dimensions: {
      width: number;
      height: number;
      depth: number;
    };
  };
  /** 성분/재료 */
  ingredients: {
    name: string;
    percentage?: number;
    purpose: string;
    origin?: string;
  }[];
  /** 인증 */
  certifications: {
    name: string;
    issuedBy: string;
    validUntil?: Date;
  }[];
  /** 패키지 옵션 */
  packageOptions: {
    optionName: string;
    quantity: number;
    price: number;
    sku: string;
  }[];
  /** 제조 정보 */
  manufacturing: {
    manufacturer: string;
    countryOfOrigin: string;
    leadTime: number;
    moq: number;
  };
  /** 품질 기준 */
  qualityStandards: {
    criterion: string;
    target: string;
    testMethod: string;
  }[];
  /** 버전 */
  version: string;
  /** 상태 */
  status: 'draft' | 'review' | 'approved' | 'production';
  /** 승인자 */
  approvedBy?: string;
  /** 승인일 */
  approvedAt?: Date;
}

/**
 * 제품 로드맵
 */
export interface ProductRoadmap {
  /** 로드맵 ID */
  id: string;
  /** 제품 ID */
  productId: string;
  /** 마일스톤 목록 */
  milestones: ProductMilestone[];
  /** 시작일 */
  startDate: Date;
  /** 목표 출시일 */
  targetLaunchDate: Date;
  /** 상태 */
  status: 'planning' | 'in_progress' | 'completed' | 'delayed';
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 제품 마일스톤
 */
export interface ProductMilestone {
  /** 마일스톤 ID */
  id: string;
  /** 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 단계 */
  stage: ProductStage;
  /** 목표일 */
  targetDate: Date;
  /** 실제 완료일 */
  actualDate?: Date;
  /** 상태 */
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  /** 담당자 */
  owner: string;
  /** 의존성 */
  dependencies: string[];
  /** 산출물 */
  deliverables: string[];
}

// =============================================================================
// 피드백 분석 관련 타입
// =============================================================================

/**
 * 제품 피드백
 */
export interface ProductFeedback {
  /** 피드백 ID */
  id: string;
  /** 제품 ID */
  productId: string;
  /** 소스 */
  source: FeedbackSource;
  /** 카테고리 */
  category: FeedbackCategory;
  /** 감성 */
  sentiment: 'positive' | 'neutral' | 'negative';
  /** 점수 (1-5) */
  score?: number;
  /** 원문 */
  originalContent: string;
  /** 요약 */
  summary: string;
  /** 추출된 키워드 */
  extractedKeywords: string[];
  /** 언급된 특징 */
  mentionedFeatures: string[];
  /** 개선 제안 */
  improvementSuggestions?: string[];
  /** 채널 */
  channel?: string;
  /** 수집일 */
  collectedAt: Date;
  /** 처리 상태 */
  processed: boolean;
}

/**
 * 피드백 집계
 */
export interface FeedbackAggregation {
  /** 제품 ID */
  productId: string;
  /** 기간 */
  period: {
    start: Date;
    end: Date;
  };
  /** 총 피드백 수 */
  totalCount: number;
  /** 감성 분포 */
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  /** 평균 점수 */
  averageScore: number;
  /** 카테고리별 분포 */
  categoryDistribution: {
    category: FeedbackCategory;
    count: number;
    avgScore: number;
  }[];
  /** 상위 긍정 키워드 */
  topPositiveKeywords: {
    keyword: string;
    count: number;
  }[];
  /** 상위 부정 키워드 */
  topNegativeKeywords: {
    keyword: string;
    count: number;
  }[];
  /** 트렌드 */
  trend: 'improving' | 'stable' | 'declining';
  /** 생성일 */
  generatedAt: Date;
}

/**
 * 개선점 분석
 */
export interface ImprovementAnalysis {
  /** 분석 ID */
  id: string;
  /** 제품 ID */
  productId: string;
  /** 개선 항목 목록 */
  improvementItems: ImprovementItem[];
  /** 우선순위 매트릭스 */
  priorityMatrix: {
    highImpactEasy: ImprovementItem[];
    highImpactHard: ImprovementItem[];
    lowImpactEasy: ImprovementItem[];
    lowImpactHard: ImprovementItem[];
  };
  /** 권장 사항 */
  recommendations: string[];
  /** 예상 효과 */
  expectedOutcomes: {
    metric: string;
    currentValue: number;
    expectedValue: number;
    improvement: string;
  }[];
  /** 생성일 */
  generatedAt: Date;
}

/**
 * 개선 항목
 */
export interface ImprovementItem {
  /** 항목 ID */
  id: string;
  /** 카테고리 */
  category: FeedbackCategory;
  /** 설명 */
  description: string;
  /** 언급 빈도 */
  mentionCount: number;
  /** 영향도 (1-10) */
  impactScore: number;
  /** 구현 난이도 (1-10) */
  difficultyScore: number;
  /** 예상 비용 */
  estimatedCost?: number;
  /** 근거 피드백 ID */
  evidenceFeedbackIds: string[];
  /** 상태 */
  status: 'identified' | 'analyzing' | 'planned' | 'implementing' | 'completed' | 'dismissed';
}

// =============================================================================
// 서브에이전트 태스크 타입
// =============================================================================

/**
 * 리서치 서브에이전트 태스크
 */
export interface ResearchTaskPayload {
  action: 'market_research' | 'competitor_analysis' | 'trend_analysis' | 'consumer_research';
  category?: ProductCategory;
  competitors?: string[];
  keywords?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * 기획 서브에이전트 태스크
 */
export interface PlanningTaskPayload {
  action: 'create_concept' | 'define_spec' | 'create_roadmap' | 'update_milestone';
  conceptId?: string;
  specId?: string;
  roadmapId?: string;
  milestoneId?: string;
  data?: Partial<ProductConcept | ProductSpec | ProductRoadmap | ProductMilestone>;
}

/**
 * 피드백 분석 서브에이전트 태스크
 */
export interface FeedbackAnalysisTaskPayload {
  action: 'collect_feedback' | 'analyze_sentiment' | 'aggregate_feedback' | 'identify_improvements';
  productId: string;
  sources?: FeedbackSource[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  categories?: FeedbackCategory[];
}

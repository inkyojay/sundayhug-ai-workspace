/**
 * 썬데이허그 AI 에이전트 시스템 - Marketing Agent 타입 정의
 *
 * 마케팅 에이전트 관련 모든 타입을 정의합니다.
 * LANE 2에서만 사용되며, src/types/index.ts를 수정하지 않습니다.
 */

import { SalesChannel, DateRange } from '../../types';

// =============================================================================
// 광고 플랫폼 타입
// =============================================================================

/**
 * 광고 플랫폼 타입
 */
export enum AdPlatform {
  META = 'meta',             // 메타 (페이스북/인스타그램)
  NAVER = 'naver',           // 네이버 검색광고/쇼핑광고
  KAKAO = 'kakao',           // 카카오모먼트
  GOOGLE = 'google',         // 구글 애즈
  COUPANG = 'coupang',       // 쿠팡 광고
  TIKTOK = 'tiktok',         // 틱톡 광고
}

/**
 * 캠페인 상태
 */
export enum CampaignStatus {
  DRAFT = 'draft',           // 초안
  SCHEDULED = 'scheduled',   // 예약됨
  ACTIVE = 'active',         // 진행 중
  PAUSED = 'paused',         // 일시 정지
  COMPLETED = 'completed',   // 완료
  CANCELLED = 'cancelled',   // 취소됨
}

/**
 * 캠페인 목표
 */
export enum CampaignObjective {
  AWARENESS = 'awareness',           // 인지도
  TRAFFIC = 'traffic',               // 트래픽
  ENGAGEMENT = 'engagement',         // 참여
  LEADS = 'leads',                   // 리드
  CONVERSIONS = 'conversions',       // 전환
  SALES = 'sales',                   // 판매
}

// =============================================================================
// 퍼포먼스 마케팅 타입
// =============================================================================

/**
 * 광고 캠페인 정보
 */
export interface AdCampaign {
  /** 캠페인 ID */
  id: string;
  /** 캠페인 이름 */
  name: string;
  /** 광고 플랫폼 */
  platform: AdPlatform;
  /** 상태 */
  status: CampaignStatus;
  /** 목표 */
  objective: CampaignObjective;
  /** 일 예산 */
  dailyBudget: number;
  /** 총 예산 */
  totalBudget: number;
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate?: Date;
  /** 타겟팅 설정 */
  targeting: AdTargeting;
  /** 성과 지표 */
  metrics?: AdMetrics;
}

/**
 * 광고 타겟팅 설정
 */
export interface AdTargeting {
  /** 연령 범위 */
  ageRange?: { min: number; max: number };
  /** 성별 */
  gender?: 'all' | 'male' | 'female';
  /** 지역 */
  locations?: string[];
  /** 관심사 */
  interests?: string[];
  /** 커스텀 오디언스 ID */
  customAudienceIds?: string[];
  /** 리타게팅 설정 */
  retargeting?: {
    enabled: boolean;
    lookbackDays: number;
  };
}

/**
 * 광고 성과 지표
 */
export interface AdMetrics {
  /** 노출수 */
  impressions: number;
  /** 클릭수 */
  clicks: number;
  /** 클릭률 (CTR) */
  ctr: number;
  /** 전환수 */
  conversions: number;
  /** 전환률 */
  conversionRate: number;
  /** 비용 */
  spend: number;
  /** 클릭당 비용 (CPC) */
  cpc: number;
  /** 전환당 비용 (CPA) */
  cpa: number;
  /** 광고수익률 (ROAS) */
  roas: number;
  /** 매출 */
  revenue: number;
  /** 측정 기간 */
  period: DateRange;
}

/**
 * ROAS 분석 결과
 */
export interface ROASAnalysis {
  /** 캠페인 ID */
  campaignId: string;
  /** 현재 ROAS */
  currentRoas: number;
  /** 목표 ROAS */
  targetRoas: number;
  /** ROAS 추이 */
  roasTrend: 'up' | 'down' | 'stable';
  /** 권장 조치 */
  recommendations: BudgetRecommendation[];
  /** 분석 시점 */
  analyzedAt: Date;
}

/**
 * 예산 최적화 권장 사항
 */
export interface BudgetRecommendation {
  /** 캠페인 ID */
  campaignId: string;
  /** 권장 조치 */
  action: 'increase' | 'decrease' | 'pause' | 'maintain';
  /** 권장 예산 변경률 */
  budgetChangePercent?: number;
  /** 예상 ROAS 개선 */
  expectedRoasImprovement?: number;
  /** 이유 */
  reason: string;
  /** 우선순위 */
  priority: 'high' | 'medium' | 'low';
}

// =============================================================================
// 콘텐츠 마케팅 타입
// =============================================================================

/**
 * 콘텐츠 타입
 */
export enum ContentType {
  CARD_NEWS = 'card_news',       // 카드뉴스
  BLOG_POST = 'blog_post',       // 블로그 포스트
  SNS_POST = 'sns_post',         // SNS 게시물
  VIDEO = 'video',               // 영상
  STORY = 'story',               // 스토리
  REEL = 'reel',                 // 릴스
  NEWSLETTER = 'newsletter',     // 뉴스레터
}

/**
 * 콘텐츠 상태
 */
export enum ContentStatus {
  DRAFT = 'draft',               // 초안
  REVIEW = 'review',             // 검토 중
  APPROVED = 'approved',         // 승인됨
  SCHEDULED = 'scheduled',       // 예약됨
  PUBLISHED = 'published',       // 게시됨
  ARCHIVED = 'archived',         // 보관됨
}

/**
 * 콘텐츠 정보
 */
export interface MarketingContent {
  /** 콘텐츠 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 콘텐츠 타입 */
  type: ContentType;
  /** 상태 */
  status: ContentStatus;
  /** 본문 */
  body: string;
  /** 이미지 URLs */
  images?: string[];
  /** 영상 URL */
  videoUrl?: string;
  /** 해시태그 */
  hashtags?: string[];
  /** 게시 채널 */
  channels: string[];
  /** 예약 게시 시간 */
  scheduledAt?: Date;
  /** 게시 시간 */
  publishedAt?: Date;
  /** 성과 지표 */
  metrics?: ContentMetrics;
  /** 관련 상품 IDs */
  productIds?: string[];
  /** 캠페인 ID */
  campaignId?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 콘텐츠 성과 지표
 */
export interface ContentMetrics {
  /** 조회수 */
  views: number;
  /** 좋아요 */
  likes: number;
  /** 댓글 */
  comments: number;
  /** 공유 */
  shares: number;
  /** 저장 */
  saves: number;
  /** 도달 */
  reach: number;
  /** 참여율 */
  engagementRate: number;
  /** 클릭수 */
  clicks?: number;
  /** 전환수 */
  conversions?: number;
}

/**
 * 카드뉴스 생성 요청
 */
export interface CardNewsRequest {
  /** 주제 */
  topic: string;
  /** 상품 정보 */
  product?: {
    id: string;
    name: string;
    features: string[];
    price: number;
  };
  /** 슬라이드 수 */
  slideCount: number;
  /** 톤앤매너 */
  tone: 'warm' | 'professional' | 'playful';
  /** 타겟 고객 */
  targetAudience: string;
}

// =============================================================================
// CRM 타입
// =============================================================================

/**
 * 고객 세그먼트
 */
export interface CustomerSegment {
  /** 세그먼트 ID */
  id: string;
  /** 세그먼트 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 필터 조건 */
  filters: SegmentFilter[];
  /** 고객 수 */
  customerCount: number;
  /** 생성일 */
  createdAt: Date;
  /** 마지막 업데이트 */
  updatedAt: Date;
}

/**
 * 세그먼트 필터
 */
export interface SegmentFilter {
  /** 필드 */
  field: string;
  /** 연산자 */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'between';
  /** 값 */
  value: unknown;
}

/**
 * 알림톡 메시지
 */
export interface KakaoNotification {
  /** 메시지 ID */
  id: string;
  /** 템플릿 ID */
  templateId: string;
  /** 수신자 목록 */
  recipients: string[];
  /** 변수 값 */
  variables: Record<string, string>;
  /** 예약 발송 시간 */
  scheduledAt?: Date;
  /** 발송 시간 */
  sentAt?: Date;
  /** 상태 */
  status: 'pending' | 'sent' | 'failed';
  /** 발송 결과 */
  results?: {
    success: number;
    failed: number;
    failedRecipients?: string[];
  };
}

/**
 * 재구매 유도 캠페인
 */
export interface RepurchaseCampaign {
  /** 캠페인 ID */
  id: string;
  /** 캠페인 이름 */
  name: string;
  /** 타겟 세그먼트 ID */
  segmentId: string;
  /** 트리거 조건 */
  trigger: {
    /** 마지막 구매 후 일수 */
    daysSinceLastPurchase?: number;
    /** 마지막 방문 후 일수 */
    daysSinceLastVisit?: number;
    /** 장바구니 이탈 */
    cartAbandonment?: boolean;
  };
  /** 메시지 템플릿 */
  messageTemplate: string;
  /** 혜택 */
  incentive?: {
    type: 'discount' | 'coupon' | 'point' | 'gift';
    value: number;
    code?: string;
  };
  /** 활성화 여부 */
  active: boolean;
  /** 성과 */
  metrics?: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  };
}

// =============================================================================
// 프로모션 타입
// =============================================================================

/**
 * 프로모션 타입
 */
export enum PromotionType {
  SALE = 'sale',                   // 세일
  BUNDLE = 'bundle',               // 번들
  BOGO = 'bogo',                   // 1+1
  FREE_SHIPPING = 'free_shipping', // 무료배송
  GIFT = 'gift',                   // 사은품
  FLASH_SALE = 'flash_sale',       // 타임딜
  SEASONAL = 'seasonal',           // 시즌 이벤트
}

/**
 * 프로모션 정보
 */
export interface Promotion {
  /** 프로모션 ID */
  id: string;
  /** 프로모션 이름 */
  name: string;
  /** 타입 */
  type: PromotionType;
  /** 설명 */
  description: string;
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate: Date;
  /** 할인율 또는 금액 */
  discountValue: number;
  /** 할인 타입 */
  discountType: 'percent' | 'fixed';
  /** 최소 구매 금액 */
  minPurchaseAmount?: number;
  /** 적용 상품 IDs */
  productIds?: string[];
  /** 적용 카테고리 */
  categories?: string[];
  /** 판매 채널 */
  channels?: SalesChannel[];
  /** 활성화 여부 */
  active: boolean;
  /** 성과 지표 */
  metrics?: PromotionMetrics;
}

/**
 * 프로모션 성과 지표
 */
export interface PromotionMetrics {
  /** 참여 고객 수 */
  participantCount: number;
  /** 총 주문 수 */
  orderCount: number;
  /** 총 매출 */
  totalRevenue: number;
  /** 할인 총액 */
  totalDiscount: number;
  /** 객단가 */
  averageOrderValue: number;
  /** ROI */
  roi: number;
}

/**
 * 쿠폰 정보
 */
export interface Coupon {
  /** 쿠폰 ID */
  id: string;
  /** 쿠폰 코드 */
  code: string;
  /** 이름 */
  name: string;
  /** 할인 타입 */
  discountType: 'percent' | 'fixed';
  /** 할인 값 */
  discountValue: number;
  /** 최대 할인 금액 */
  maxDiscount?: number;
  /** 최소 구매 금액 */
  minPurchaseAmount?: number;
  /** 사용 가능 횟수 */
  maxUsageCount?: number;
  /** 사용된 횟수 */
  usedCount: number;
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate: Date;
  /** 활성화 여부 */
  active: boolean;
}

// =============================================================================
// 인플루언서 마케팅 타입
// =============================================================================

/**
 * 인플루언서 등급
 */
export enum InfluencerTier {
  NANO = 'nano',           // 1K-10K
  MICRO = 'micro',         // 10K-100K
  MACRO = 'macro',         // 100K-1M
  MEGA = 'mega',           // 1M+
}

/**
 * 인플루언서 플랫폼
 */
export enum InfluencerPlatform {
  INSTAGRAM = 'instagram',
  YOUTUBE = 'youtube',
  BLOG = 'blog',
  TIKTOK = 'tiktok',
}

/**
 * 인플루언서 정보
 */
export interface Influencer {
  /** 인플루언서 ID */
  id: string;
  /** 이름/닉네임 */
  name: string;
  /** 플랫폼 */
  platform: InfluencerPlatform;
  /** 팔로워 수 */
  followerCount: number;
  /** 등급 */
  tier: InfluencerTier;
  /** 카테고리 */
  categories: string[];
  /** 참여율 */
  engagementRate: number;
  /** 연락처 */
  contact?: {
    email?: string;
    phone?: string;
    dm?: string;
  };
  /** 협업 이력 */
  collaborationHistory?: CollaborationRecord[];
  /** 예상 단가 */
  estimatedRate?: number;
  /** 상태 */
  status: 'prospect' | 'contacted' | 'negotiating' | 'contracted' | 'completed' | 'declined';
  /** 메모 */
  notes?: string;
}

/**
 * 협업 기록
 */
export interface CollaborationRecord {
  /** 캠페인 ID */
  campaignId: string;
  /** 협업 유형 */
  type: 'seeding' | 'paid' | 'affiliate';
  /** 콘텐츠 유형 */
  contentType: ContentType;
  /** 날짜 */
  date: Date;
  /** 보상 */
  compensation: {
    type: 'product' | 'cash' | 'affiliate';
    value: number;
  };
  /** 성과 */
  metrics?: {
    views: number;
    engagement: number;
    clicks: number;
    conversions: number;
  };
  /** 만족도 (1-5) */
  satisfactionScore?: number;
}

/**
 * 시딩 캠페인
 */
export interface SeedingCampaign {
  /** 캠페인 ID */
  id: string;
  /** 캠페인 이름 */
  name: string;
  /** 상품 정보 */
  products: {
    productId: string;
    quantity: number;
  }[];
  /** 대상 인플루언서 */
  influencers: string[];
  /** 발송 일정 */
  shippingDate: Date;
  /** 콘텐츠 게시 기한 */
  contentDeadline: Date;
  /** 해시태그 */
  hashtags: string[];
  /** 가이드라인 */
  guidelines: string;
  /** 상태 */
  status: 'planning' | 'shipping' | 'awaiting_content' | 'completed';
}

// =============================================================================
// 소셜 리스닝 타입
// =============================================================================

/**
 * 소셜 멘션
 */
export interface SocialMention {
  /** 멘션 ID */
  id: string;
  /** 플랫폼 */
  platform: 'instagram' | 'twitter' | 'blog' | 'cafe' | 'youtube' | 'community';
  /** 원본 URL */
  url: string;
  /** 작성자 */
  author: string;
  /** 내용 */
  content: string;
  /** 감성 분석 결과 */
  sentiment: 'positive' | 'neutral' | 'negative';
  /** 감성 점수 (-1 ~ 1) */
  sentimentScore: number;
  /** 키워드 */
  keywords: string[];
  /** 도달 (팔로워 수) */
  reach?: number;
  /** 참여 */
  engagement?: number;
  /** 작성일 */
  createdAt: Date;
  /** 수집일 */
  collectedAt: Date;
  /** 처리 여부 */
  processed: boolean;
  /** 대응 필요 여부 */
  needsResponse: boolean;
}

/**
 * 트렌드 분석 결과
 */
export interface TrendAnalysis {
  /** 분석 기간 */
  period: DateRange;
  /** 키워드 트렌드 */
  keywordTrends: {
    keyword: string;
    count: number;
    trend: 'rising' | 'falling' | 'stable';
    changePercent: number;
  }[];
  /** 감성 분포 */
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  /** 주요 토픽 */
  topTopics: {
    topic: string;
    mentions: number;
    sentiment: number;
  }[];
  /** 경쟁사 언급 */
  competitorMentions?: {
    competitor: string;
    count: number;
    sentiment: number;
  }[];
  /** 인사이트 */
  insights: string[];
}

// =============================================================================
// 브랜드 마케팅 타입
// =============================================================================

/**
 * PR 기사/보도자료
 */
export interface PressRelease {
  /** ID */
  id: string;
  /** 제목 */
  title: string;
  /** 본문 */
  body: string;
  /** 상태 */
  status: 'draft' | 'review' | 'approved' | 'distributed' | 'published';
  /** 배포 매체 */
  media?: string[];
  /** 배포일 */
  distributedAt?: Date;
  /** 게재 링크 */
  publishedUrls?: string[];
  /** 생성일 */
  createdAt: Date;
}

/**
 * 브랜드 콜라보레이션
 */
export interface BrandCollaboration {
  /** ID */
  id: string;
  /** 파트너 브랜드 */
  partnerBrand: string;
  /** 협업 유형 */
  type: 'co_product' | 'co_marketing' | 'event' | 'content';
  /** 설명 */
  description: string;
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate: Date;
  /** 상태 */
  status: 'proposal' | 'negotiating' | 'confirmed' | 'active' | 'completed';
  /** 예산 */
  budget?: number;
  /** 예상 효과 */
  expectedOutcome?: string;
  /** 실제 성과 */
  actualMetrics?: {
    reach: number;
    engagement: number;
    sales: number;
  };
}

/**
 * 브랜드 스토리
 */
export interface BrandStory {
  /** ID */
  id: string;
  /** 제목 */
  title: string;
  /** 스토리 타입 */
  type: 'founder' | 'product' | 'customer' | 'behind_scene' | 'milestone';
  /** 내용 */
  content: string;
  /** 미디어 */
  media?: {
    type: 'image' | 'video';
    url: string;
  }[];
  /** 게시 채널 */
  channels: string[];
  /** 상태 */
  status: ContentStatus;
  /** 게시일 */
  publishedAt?: Date;
}

// =============================================================================
// 마케팅 에이전트 실행 결과 타입
// =============================================================================

/**
 * 마케팅 에이전트 실행 데이터
 */
export interface MarketingAgentData {
  /** 캠페인 정보 */
  campaigns?: AdCampaign[];
  /** 콘텐츠 */
  contents?: MarketingContent[];
  /** 세그먼트 */
  segments?: CustomerSegment[];
  /** 프로모션 */
  promotions?: Promotion[];
  /** 인플루언서 */
  influencers?: Influencer[];
  /** 멘션 */
  mentions?: SocialMention[];
  /** 트렌드 분석 */
  trendAnalysis?: TrendAnalysis;
  /** 성과 요약 */
  performanceSummary?: {
    totalSpend: number;
    totalRevenue: number;
    overallRoas: number;
    topCampaigns: string[];
    recommendations: string[];
  };
}

/**
 * 마케팅 에이전트 설정
 */
export interface MarketingAgentConfig {
  /** ROAS 목표 */
  targetRoas: number;
  /** 일일 예산 한도 */
  dailyBudgetLimit: number;
  /** 자동 최적화 활성화 */
  autoOptimization: boolean;
  /** 알림 설정 */
  notifications: {
    roasThreshold: number;
    budgetAlertPercent: number;
    negativeSentimentThreshold: number;
  };
  /** 연동된 광고 플랫폼 */
  connectedPlatforms: AdPlatform[];
}

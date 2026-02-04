/**
 * 썬데이허그 AI 에이전트 시스템 - DetailPage Agent 타입 정의
 *
 * 상세페이지 에이전트 관련 모든 타입을 정의합니다.
 * LANE 2에서만 사용되며, src/types/index.ts를 수정하지 않습니다.
 */

import { SalesChannel } from '../../types';

// =============================================================================
// 상세페이지 기본 타입
// =============================================================================

/**
 * 상세페이지 상태
 */
export enum DetailPageStatus {
  DRAFT = 'draft',           // 초안
  PLANNING = 'planning',     // 기획 중
  DESIGNING = 'designing',   // 디자인 중
  REVIEW = 'review',         // 검토 중
  APPROVED = 'approved',     // 승인됨
  PUBLISHED = 'published',   // 게시됨
  ARCHIVED = 'archived',     // 보관됨
}

/**
 * 상세페이지 타입
 */
export enum DetailPageType {
  STANDARD = 'standard',     // 일반 상세페이지
  PREMIUM = 'premium',       // 프리미엄 상세페이지
  SIMPLE = 'simple',         // 간단한 상세페이지
  MOBILE = 'mobile',         // 모바일 최적화
}

/**
 * 상세페이지 섹션 타입
 */
export enum SectionType {
  HERO = 'hero',                     // 메인 비주얼
  PRODUCT_INFO = 'product_info',     // 제품 정보
  FEATURES = 'features',             // 특장점
  USAGE = 'usage',                   // 사용 방법
  SPECIFICATIONS = 'specifications', // 스펙/상세정보
  REVIEWS = 'reviews',               // 리뷰/후기
  FAQ = 'faq',                       // FAQ
  WARRANTY = 'warranty',             // 보증/AS 정보
  SHIPPING = 'shipping',             // 배송 정보
  CTA = 'cta',                       // Call to Action
}

// =============================================================================
// 상세페이지 구조 타입
// =============================================================================

/**
 * 상세페이지 정보
 */
export interface DetailPage {
  /** 상세페이지 ID */
  id: string;
  /** 상품 ID */
  productId: string;
  /** 상품명 */
  productName: string;
  /** 상태 */
  status: DetailPageStatus;
  /** 타입 */
  type: DetailPageType;
  /** 버전 */
  version: number;
  /** 섹션 목록 */
  sections: PageSection[];
  /** 적용 채널 */
  channels: SalesChannel[];
  /** SEO 정보 */
  seo?: SEOInfo;
  /** A/B 테스트 그룹 */
  abTestGroup?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
  /** 게시일 */
  publishedAt?: Date;
  /** 성과 지표 */
  metrics?: DetailPageMetrics;
}

/**
 * 페이지 섹션
 */
export interface PageSection {
  /** 섹션 ID */
  id: string;
  /** 섹션 타입 */
  type: SectionType;
  /** 제목 */
  title?: string;
  /** 콘텐츠 */
  content: SectionContent;
  /** 순서 */
  order: number;
  /** 활성화 여부 */
  visible: boolean;
  /** 스타일 설정 */
  style?: SectionStyle;
}

/**
 * 섹션 콘텐츠
 */
export interface SectionContent {
  /** 헤드라인 */
  headline?: string;
  /** 서브 헤드라인 */
  subheadline?: string;
  /** 본문 텍스트 */
  body?: string;
  /** 이미지 목록 */
  images?: ContentImage[];
  /** 비디오 */
  video?: ContentVideo;
  /** 리스트 아이템 */
  listItems?: ListItem[];
  /** 테이블 데이터 */
  tableData?: TableData;
  /** 버튼 */
  buttons?: ContentButton[];
  /** 커스텀 HTML */
  customHtml?: string;
}

/**
 * 콘텐츠 이미지
 */
export interface ContentImage {
  /** 이미지 URL */
  url: string;
  /** 대체 텍스트 */
  alt: string;
  /** 캡션 */
  caption?: string;
  /** 너비 */
  width?: number;
  /** 높이 */
  height?: number;
}

/**
 * 콘텐츠 비디오
 */
export interface ContentVideo {
  /** 비디오 URL */
  url: string;
  /** 썸네일 URL */
  thumbnailUrl?: string;
  /** 자동재생 여부 */
  autoplay: boolean;
  /** 음소거 여부 */
  muted: boolean;
  /** 반복재생 여부 */
  loop: boolean;
}

/**
 * 리스트 아이템
 */
export interface ListItem {
  /** 아이콘 */
  icon?: string;
  /** 제목 */
  title: string;
  /** 설명 */
  description?: string;
}

/**
 * 테이블 데이터
 */
export interface TableData {
  /** 헤더 */
  headers: string[];
  /** 행 데이터 */
  rows: string[][];
}

/**
 * 콘텐츠 버튼
 */
export interface ContentButton {
  /** 버튼 텍스트 */
  text: string;
  /** 링크 URL */
  url: string;
  /** 버튼 스타일 */
  style: 'primary' | 'secondary' | 'outline';
}

/**
 * 섹션 스타일
 */
export interface SectionStyle {
  /** 배경색 */
  backgroundColor?: string;
  /** 텍스트 색상 */
  textColor?: string;
  /** 패딩 */
  padding?: string;
  /** 정렬 */
  alignment?: 'left' | 'center' | 'right';
  /** 커스텀 CSS */
  customCss?: string;
}

/**
 * SEO 정보
 */
export interface SEOInfo {
  /** 메타 제목 */
  metaTitle: string;
  /** 메타 설명 */
  metaDescription: string;
  /** 키워드 */
  keywords: string[];
  /** 대표 이미지 URL */
  ogImage?: string;
}

// =============================================================================
// 기획 관련 타입
// =============================================================================

/**
 * 상세페이지 기획안
 */
export interface DetailPagePlan {
  /** 기획안 ID */
  id: string;
  /** 상품 ID */
  productId: string;
  /** 상품 분석 */
  productAnalysis: ProductAnalysis;
  /** 타겟 고객 분석 */
  targetAnalysis: TargetAnalysis;
  /** 경쟁사 벤치마킹 */
  competitorBenchmark?: CompetitorBenchmark;
  /** 권장 구성 */
  recommendedStructure: SectionType[];
  /** 핵심 메시지 */
  keyMessages: string[];
  /** 차별화 포인트 */
  differentiators: string[];
  /** 톤앤매너 */
  toneAndManner: string;
  /** 생성일 */
  createdAt: Date;
}

/**
 * 상품 분석
 */
export interface ProductAnalysis {
  /** 카테고리 */
  category: string;
  /** 가격대 */
  priceRange: string;
  /** 주요 특징 */
  mainFeatures: string[];
  /** 강점 */
  strengths: string[];
  /** 약점/보완점 */
  weaknesses: string[];
  /** USP (Unique Selling Point) */
  usp: string;
}

/**
 * 타겟 분석
 */
export interface TargetAnalysis {
  /** 주요 타겟 연령 */
  ageRange: string;
  /** 타겟 페르소나 */
  persona: string;
  /** 구매 동기 */
  purchaseMotivations: string[];
  /** 우려 사항 */
  concerns: string[];
  /** 정보 탐색 패턴 */
  informationSeekingBehavior: string;
}

/**
 * 경쟁사 벤치마킹
 */
export interface CompetitorBenchmark {
  /** 경쟁 상품 목록 */
  competitors: CompetitorProduct[];
  /** 공통 구성 요소 */
  commonElements: string[];
  /** 차별화 기회 */
  differentiationOpportunities: string[];
  /** 벤치마킹 인사이트 */
  insights: string[];
}

/**
 * 경쟁 상품
 */
export interface CompetitorProduct {
  /** 상품명 */
  name: string;
  /** 브랜드 */
  brand: string;
  /** 가격 */
  price: number;
  /** 상세페이지 URL */
  pageUrl?: string;
  /** 강점 */
  strengths: string[];
  /** 약점 */
  weaknesses: string[];
}

// =============================================================================
// 제작 관련 타입
// =============================================================================

/**
 * 카피 요청
 */
export interface CopyRequest {
  /** 섹션 타입 */
  sectionType: SectionType;
  /** 상품 정보 */
  productInfo: ProductAnalysis;
  /** 타겟 정보 */
  targetInfo: TargetAnalysis;
  /** 톤앤매너 */
  toneAndManner: string;
  /** 키워드 */
  keywords?: string[];
  /** 글자수 제한 */
  maxLength?: number;
}

/**
 * 카피 결과
 */
export interface CopyResult {
  /** 헤드라인 */
  headline: string;
  /** 서브 헤드라인 */
  subheadline?: string;
  /** 본문 */
  body: string;
  /** 대안 버전 */
  alternatives?: {
    headline: string;
    body: string;
  }[];
}

/**
 * 레이아웃 템플릿
 */
export interface LayoutTemplate {
  /** 템플릿 ID */
  id: string;
  /** 템플릿 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 타입 */
  type: DetailPageType;
  /** 섹션 구성 */
  sections: SectionType[];
  /** 미리보기 이미지 */
  previewUrl: string;
  /** 적합 카테고리 */
  suitableCategories: string[];
}

/**
 * 이미지 배치 계획
 */
export interface ImagePlacement {
  /** 섹션 ID */
  sectionId: string;
  /** 필요 이미지 수 */
  requiredImageCount: number;
  /** 이미지 크기 */
  imageSize: {
    width: number;
    height: number;
  };
  /** 이미지 유형 */
  imageType: 'product' | 'lifestyle' | 'infographic' | 'icon';
  /** 배치된 이미지 */
  placedImages?: ContentImage[];
}

// =============================================================================
// 최적화 관련 타입
// =============================================================================

/**
 * A/B 테스트
 */
export interface ABTest {
  /** 테스트 ID */
  id: string;
  /** 테스트 이름 */
  name: string;
  /** 상품 ID */
  productId: string;
  /** 테스트 대상 요소 */
  testElement: 'headline' | 'hero_image' | 'cta' | 'layout' | 'full_page';
  /** 변형 A (컨트롤) */
  variantA: {
    pageId: string;
    trafficPercent: number;
  };
  /** 변형 B */
  variantB: {
    pageId: string;
    trafficPercent: number;
  };
  /** 추가 변형 */
  additionalVariants?: {
    pageId: string;
    trafficPercent: number;
  }[];
  /** 목표 지표 */
  goalMetric: 'conversion_rate' | 'add_to_cart' | 'bounce_rate' | 'time_on_page';
  /** 시작일 */
  startDate: Date;
  /** 종료일 */
  endDate?: Date;
  /** 상태 */
  status: 'draft' | 'running' | 'paused' | 'completed';
  /** 결과 */
  results?: ABTestResult;
}

/**
 * A/B 테스트 결과
 */
export interface ABTestResult {
  /** 승자 */
  winner: 'A' | 'B' | 'C' | 'D' | 'inconclusive';
  /** 통계적 유의성 */
  statisticalSignificance: number;
  /** 변형별 성과 */
  variantPerformance: {
    variant: string;
    visitors: number;
    conversions: number;
    conversionRate: number;
    improvement?: number;
  }[];
  /** 권장 사항 */
  recommendation: string;
}

/**
 * 상세페이지 성과 지표
 */
export interface DetailPageMetrics {
  /** 페이지뷰 */
  pageViews: number;
  /** 순 방문자 */
  uniqueVisitors: number;
  /** 평균 체류 시간 (초) */
  avgTimeOnPage: number;
  /** 스크롤 깊이 (%) */
  avgScrollDepth: number;
  /** 이탈률 */
  bounceRate: number;
  /** 장바구니 담기 수 */
  addToCartCount: number;
  /** 장바구니 담기율 */
  addToCartRate: number;
  /** 구매 수 */
  purchaseCount: number;
  /** 전환율 */
  conversionRate: number;
  /** 측정 기간 */
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * 개선 제안
 */
export interface ImprovementSuggestion {
  /** 제안 ID */
  id: string;
  /** 상세페이지 ID */
  pageId: string;
  /** 영역 */
  area: 'headline' | 'images' | 'copy' | 'layout' | 'cta' | 'overall';
  /** 현재 문제 */
  issue: string;
  /** 개선 제안 */
  suggestion: string;
  /** 예상 효과 */
  expectedImpact: 'high' | 'medium' | 'low';
  /** 근거 */
  rationale: string;
  /** 우선순위 */
  priority: number;
}

// =============================================================================
// 에이전트 실행 관련 타입
// =============================================================================

/**
 * DetailPage 에이전트 실행 데이터
 */
export interface DetailPageAgentData {
  /** 상세페이지 목록 */
  pages?: DetailPage[];
  /** 기획안 */
  plans?: DetailPagePlan[];
  /** A/B 테스트 */
  abTests?: ABTest[];
  /** 개선 제안 */
  suggestions?: ImprovementSuggestion[];
  /** 성과 요약 */
  performanceSummary?: {
    totalPages: number;
    avgConversionRate: number;
    topPerformingPages: string[];
    pagesNeedingImprovement: string[];
  };
}

/**
 * DetailPage 에이전트 설정
 */
export interface DetailPageAgentConfig {
  /** 기본 레이아웃 템플릿 ID */
  defaultTemplateId: string;
  /** 자동 SEO 최적화 활성화 */
  autoSeoOptimization: boolean;
  /** A/B 테스트 자동 분석 */
  autoABTestAnalysis: boolean;
  /** 알림 설정 */
  notifications: {
    lowConversionThreshold: number;
    highBounceRateThreshold: number;
  };
}

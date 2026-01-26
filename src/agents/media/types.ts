/**
 * 썬데이허그 AI 에이전트 시스템 - Media Agent 타입 정의
 *
 * 미디어 관리 에이전트에서 사용하는 모든 타입을 정의합니다.
 */

// ===========================================================================
// 열거형 (Enums)
// ===========================================================================

/**
 * 촬영 유형
 */
export enum ShootingType {
  /** 스튜디오 촬영 */
  STUDIO = 'studio',
  /** 로케이션 촬영 */
  LOCATION = 'location',
  /** 모델 촬영 */
  MODEL = 'model',
  /** 제품 촬영 */
  PRODUCT = 'product',
  /** 영상 촬영 */
  VIDEO = 'video',
}

/**
 * 촬영 상태
 */
export enum ShootingStatus {
  /** 기획 중 */
  PLANNING = 'planning',
  /** 예약됨 */
  SCHEDULED = 'scheduled',
  /** 진행 중 */
  IN_PROGRESS = 'in_progress',
  /** 촬영 완료 */
  COMPLETED = 'completed',
  /** 후반작업 중 */
  POST_PRODUCTION = 'post_production',
  /** 취소됨 */
  CANCELLED = 'cancelled',
}

/**
 * 미디어 에셋 유형
 */
export enum AssetType {
  /** 이미지 */
  IMAGE = 'image',
  /** 영상 */
  VIDEO = 'video',
  /** GIF */
  GIF = 'gif',
  /** 벡터 */
  VECTOR = 'vector',
  /** 문서 */
  DOCUMENT = 'document',
}

/**
 * 에셋 상태
 */
export enum AssetStatus {
  /** 원본 */
  RAW = 'raw',
  /** 편집 중 */
  EDITING = 'editing',
  /** 검토 중 */
  REVIEW = 'review',
  /** 승인됨 */
  APPROVED = 'approved',
  /** 게시됨 */
  PUBLISHED = 'published',
  /** 보관됨 */
  ARCHIVED = 'archived',
}

/**
 * 외주 유형
 */
export enum VendorType {
  /** 사진작가 */
  PHOTOGRAPHER = 'photographer',
  /** 영상작가 */
  VIDEOGRAPHER = 'videographer',
  /** 스튜디오 */
  STUDIO = 'studio',
  /** 모델 에이전시 */
  MODEL_AGENCY = 'model_agency',
  /** 그래픽 디자이너 */
  GRAPHIC_DESIGNER = 'graphic_designer',
  /** 편집자 */
  EDITOR = 'editor',
}

/**
 * 편집 작업 유형
 */
export enum EditType {
  /** 리사이징 */
  RESIZE = 'resize',
  /** 크롭 */
  CROP = 'crop',
  /** 색보정 */
  COLOR_CORRECTION = 'color_correction',
  /** 리터칭 */
  RETOUCH = 'retouch',
  /** 배경 제거 */
  BACKGROUND_REMOVAL = 'background_removal',
  /** 워터마크 */
  WATERMARK = 'watermark',
  /** 자막 추가 */
  SUBTITLE = 'subtitle',
  /** 트리밍 */
  TRIM = 'trim',
  /** 썸네일 생성 */
  THUMBNAIL = 'thumbnail',
}

/**
 * 이미지 용도
 */
export enum ImagePurpose {
  /** 상세페이지 메인 */
  DETAIL_MAIN = 'detail_main',
  /** 상세페이지 서브 */
  DETAIL_SUB = 'detail_sub',
  /** 썸네일 */
  THUMBNAIL = 'thumbnail',
  /** SNS 피드 */
  SNS_FEED = 'sns_feed',
  /** SNS 스토리 */
  SNS_STORY = 'sns_story',
  /** 광고용 */
  AD = 'ad',
  /** 배너 */
  BANNER = 'banner',
  /** 카드뉴스 */
  CARD_NEWS = 'card_news',
}

// ===========================================================================
// 인터페이스
// ===========================================================================

/**
 * 촬영 스케줄
 */
export interface ShootingSchedule {
  /** 스케줄 ID */
  id: string;
  /** 제목 */
  title: string;
  /** 촬영 유형 */
  type: ShootingType;
  /** 상태 */
  status: ShootingStatus;
  /** 촬영 일시 */
  scheduledDate: Date;
  /** 촬영 종료 예정 */
  endDate?: Date;
  /** 촬영 장소 */
  location: string;
  /** 촬영 대상 상품 */
  productIds: string[];
  /** 담당 외주업체/사진작가 */
  vendorId?: string;
  /** 촬영 컨셉 */
  concept: string;
  /** 레퍼런스 이미지 */
  referenceImages?: string[];
  /** 예상 촬영 컷 수 */
  expectedShots: number;
  /** 예산 */
  budget?: number;
  /** 비고 */
  notes?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
}

/**
 * 촬영 결과
 */
export interface ShootingResult {
  /** 스케줄 ID */
  scheduleId: string;
  /** 촬영 완료일 */
  completedAt: Date;
  /** 총 촬영 컷 수 */
  totalShots: number;
  /** 선택된 컷 수 */
  selectedShots: number;
  /** 에셋 ID 목록 */
  assetIds: string[];
  /** 실제 비용 */
  actualCost?: number;
  /** 메모 */
  notes?: string;
}

/**
 * 미디어 에셋
 */
export interface MediaAsset {
  /** 에셋 ID */
  id: string;
  /** 파일명 */
  filename: string;
  /** 에셋 유형 */
  type: AssetType;
  /** 상태 */
  status: AssetStatus;
  /** 파일 URL */
  url: string;
  /** 썸네일 URL */
  thumbnailUrl?: string;
  /** 파일 크기 (bytes) */
  fileSize: number;
  /** 이미지 너비 */
  width?: number;
  /** 이미지 높이 */
  height?: number;
  /** 영상 길이 (초) */
  duration?: number;
  /** MIME 타입 */
  mimeType: string;
  /** 관련 상품 */
  productIds?: string[];
  /** 관련 촬영 스케줄 */
  shootingScheduleId?: string;
  /** 태그 */
  tags: string[];
  /** 용도 */
  purposes?: ImagePurpose[];
  /** 메타데이터 */
  metadata?: AssetMetadata;
  /** 버전 */
  version: number;
  /** 원본 에셋 ID (편집본인 경우) */
  originalAssetId?: string;
  /** 생성일 */
  createdAt: Date;
  /** 수정일 */
  updatedAt: Date;
  /** 만료일 */
  expiresAt?: Date;
}

/**
 * 에셋 메타데이터
 */
export interface AssetMetadata {
  /** 카메라 정보 */
  camera?: string;
  /** ISO */
  iso?: number;
  /** 조리개 */
  aperture?: string;
  /** 셔터 스피드 */
  shutterSpeed?: string;
  /** 촬영 날짜 */
  dateTaken?: Date;
  /** GPS 위치 */
  gps?: { lat: number; lng: number };
  /** 색상 프로파일 */
  colorProfile?: string;
  /** DPI */
  dpi?: number;
  /** 비디오 코덱 */
  videoCodec?: string;
  /** 오디오 코덱 */
  audioCodec?: string;
  /** 프레임 레이트 */
  frameRate?: number;
  /** 비트레이트 */
  bitRate?: number;
}

/**
 * 외주업체
 */
export interface Vendor {
  /** 업체 ID */
  id: string;
  /** 업체명/이름 */
  name: string;
  /** 유형 */
  type: VendorType;
  /** 연락처 */
  contact: {
    phone?: string;
    email?: string;
    kakao?: string;
  };
  /** 포트폴리오 URL */
  portfolioUrl?: string;
  /** 전문 분야 */
  specialties: string[];
  /** 평균 가격 */
  averagePrice?: number;
  /** 평점 */
  rating?: number;
  /** 협업 이력 */
  collaborationHistory?: VendorCollaboration[];
  /** 활성 상태 */
  active: boolean;
  /** 비고 */
  notes?: string;
}

/**
 * 외주 협업 기록
 */
export interface VendorCollaboration {
  /** 촬영 스케줄 ID */
  scheduleId: string;
  /** 협업 일자 */
  date: Date;
  /** 비용 */
  cost: number;
  /** 만족도 (1-5) */
  satisfaction?: number;
  /** 피드백 */
  feedback?: string;
}

/**
 * 편집 작업
 */
export interface EditJob {
  /** 작업 ID */
  id: string;
  /** 원본 에셋 ID */
  sourceAssetId: string;
  /** 결과 에셋 ID */
  resultAssetId?: string;
  /** 편집 유형 */
  editType: EditType;
  /** 작업 파라미터 */
  parameters: EditParameters;
  /** 상태 */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** 에러 메시지 */
  errorMessage?: string;
  /** 생성일 */
  createdAt: Date;
  /** 완료일 */
  completedAt?: Date;
}

/**
 * 편집 파라미터
 */
export interface EditParameters {
  /** 리사이징 대상 너비 */
  targetWidth?: number;
  /** 리사이징 대상 높이 */
  targetHeight?: number;
  /** 크롭 영역 */
  cropArea?: { x: number; y: number; width: number; height: number };
  /** 색보정 설정 */
  colorAdjustments?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
  };
  /** 워터마크 설정 */
  watermark?: {
    imageUrl?: string;
    text?: string;
    position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'center';
    opacity: number;
  };
  /** 트리밍 설정 (영상) */
  trim?: {
    startTime: number;
    endTime: number;
  };
  /** 썸네일 시간 (영상) */
  thumbnailTime?: number;
  /** 자막 정보 */
  subtitles?: { text: string; startTime: number; endTime: number }[];
  /** 출력 포맷 */
  outputFormat?: string;
  /** 품질 (1-100) */
  quality?: number;
}

/**
 * 에셋 검색 필터
 */
export interface AssetSearchFilter {
  /** 에셋 유형 */
  type?: AssetType;
  /** 상태 */
  status?: AssetStatus;
  /** 상품 ID */
  productId?: string;
  /** 태그 */
  tags?: string[];
  /** 용도 */
  purpose?: ImagePurpose;
  /** 날짜 범위 시작 */
  dateFrom?: Date;
  /** 날짜 범위 끝 */
  dateTo?: Date;
  /** 키워드 검색 */
  keyword?: string;
}

/**
 * 에셋 라이브러리 통계
 */
export interface AssetLibraryStats {
  /** 총 에셋 수 */
  totalAssets: number;
  /** 유형별 개수 */
  byType: Record<AssetType, number>;
  /** 상태별 개수 */
  byStatus: Record<AssetStatus, number>;
  /** 총 저장 용량 (bytes) */
  totalStorageUsed: number;
  /** 이번 달 업로드 수 */
  thisMonthUploads: number;
  /** 가장 많이 사용된 태그 */
  topTags: { tag: string; count: number }[];
}

/**
 * 채널별 이미지 규격
 */
export interface ChannelImageSpec {
  /** 채널명 */
  channel: string;
  /** 용도 */
  purpose: ImagePurpose;
  /** 권장 너비 */
  width: number;
  /** 권장 높이 */
  height: number;
  /** 최대 파일 크기 (bytes) */
  maxFileSize: number;
  /** 허용 포맷 */
  allowedFormats: string[];
  /** 비고 */
  notes?: string;
}

/**
 * 배치 편집 요청
 */
export interface BatchEditRequest {
  /** 요청 ID */
  id: string;
  /** 원본 에셋 ID 목록 */
  sourceAssetIds: string[];
  /** 편집 유형 */
  editType: EditType;
  /** 공통 파라미터 */
  parameters: EditParameters;
  /** 진행 상황 */
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  /** 상태 */
  status: 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
  /** 생성일 */
  createdAt: Date;
}

/**
 * Media Agent 데이터
 */
export interface MediaAgentData {
  /** 촬영 스케줄 목록 */
  schedules?: ShootingSchedule[];
  /** 에셋 목록 */
  assets?: MediaAsset[];
  /** 외주업체 목록 */
  vendors?: Vendor[];
  /** 편집 작업 목록 */
  editJobs?: EditJob[];
  /** 라이브러리 통계 */
  libraryStats?: AssetLibraryStats;
}

/**
 * API Core Types
 * 공통 API 인프라 타입 정의
 */

import { SalesChannel } from '../../../types';

/**
 * HTTP 메서드
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * HTTP 요청 옵션
 */
export interface HttpRequestOptions {
  /** HTTP 메서드 */
  method?: HttpMethod;
  /** 요청 헤더 */
  headers?: Record<string, string>;
  /** 요청 본문 */
  body?: unknown;
  /** 타임아웃 (밀리초) */
  timeout?: number;
  /** 재시도 횟수 */
  retries?: number;
  /** 쿼리 파라미터 */
  query?: Record<string, string | number | boolean>;
}

/**
 * HTTP 응답
 */
export interface HttpResponse<T = unknown> {
  /** 상태 코드 */
  status: number;
  /** 상태 텍스트 */
  statusText: string;
  /** 응답 데이터 */
  data: T;
  /** 응답 헤더 */
  headers: Record<string, string>;
  /** 요청 URL */
  url: string;
  /** 응답 시간 (밀리초) */
  responseTime: number;
}

/**
 * API 에러
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly code: string;
  public readonly recoverable: boolean;
  public readonly url: string;
  public readonly responseData?: unknown;

  constructor(options: {
    message: string;
    status: number;
    statusText: string;
    code: string;
    url: string;
    recoverable?: boolean;
    responseData?: unknown;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.statusText = options.statusText;
    this.code = options.code;
    this.url = options.url;
    this.recoverable = options.recoverable ?? this.isRecoverableStatus(options.status);
    this.responseData = options.responseData;
  }

  private isRecoverableStatus(status: number): boolean {
    // 429 (Rate Limit), 503 (Service Unavailable), 502 (Bad Gateway), 504 (Gateway Timeout)
    return [429, 503, 502, 504].includes(status);
  }
}

/**
 * 레이트 리미터 설정
 */
export interface RateLimiterConfig {
  /** 윈도우당 최대 요청 수 */
  maxRequests: number;
  /** 윈도우 크기 (밀리초) */
  windowMs: number;
  /** 최대 대기 시간 (밀리초) */
  maxWaitMs?: number;
}

/**
 * 인증 전략 인터페이스
 */
export interface AuthStrategy {
  /** 인증 타입 */
  readonly type: 'hmac' | 'oauth2' | 'api-key' | 'bearer';

  /**
   * 요청에 인증 정보 추가
   * @param url - 요청 URL
   * @param options - 요청 옵션
   * @returns 인증 정보가 추가된 헤더
   */
  authenticate(url: string, options: HttpRequestOptions): Promise<Record<string, string>>;

  /**
   * 토큰 갱신 (OAuth의 경우)
   */
  refreshToken?(): Promise<void>;

  /**
   * 인증 정보 유효성 확인
   */
  isValid(): boolean;
}

/**
 * API 클라이언트 설정
 */
export interface ApiClientConfig {
  /** 기본 URL */
  baseUrl: string;
  /** 판매 채널 */
  channel: SalesChannel;
  /** 기본 타임아웃 (밀리초) */
  timeout?: number;
  /** 기본 재시도 횟수 */
  maxRetries?: number;
  /** 레이트 리미터 설정 */
  rateLimiter?: RateLimiterConfig;
  /** 인증 전략 */
  authStrategy?: AuthStrategy;
}

/**
 * 채널별 자격 증명
 */
export interface CoupangCredentials {
  vendorId: string;
  accessKey: string;
  secretKey: string;
}

export interface NaverCredentials {
  clientId: string;
  clientSecret: string;
  smartStoreId?: string;
}

export interface Cafe24Credentials {
  mallId: string;
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

/**
 * 페이지네이션 응답
 */
export interface PaginatedApiResponse<T> {
  items: T[];
  nextToken?: string;
  hasMore: boolean;
  totalCount?: number;
}

/**
 * 채널 주문 API 응답
 */
export interface ChannelOrdersResponse<T> {
  orders: T[];
  pagination?: {
    nextToken?: string;
    hasMore: boolean;
    totalCount?: number;
  };
}

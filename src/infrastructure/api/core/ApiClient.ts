/**
 * API 클라이언트 추상 클래스
 * 채널별 API 클라이언트의 기반 클래스
 */

import { HttpClient } from './HttpClient';
import { RateLimiter } from './RateLimiter';
import {
  ApiClientConfig,
  HttpRequestOptions,
  HttpResponse,
  AuthStrategy,
} from './types';
import { SalesChannel } from '../../../types';
import { systemLogger } from '../../../utils/logger';

/**
 * 추상 API 클라이언트
 */
export abstract class ApiClient {
  protected readonly baseUrl: string;
  protected readonly channel: SalesChannel;
  protected readonly httpClient: HttpClient;
  protected readonly rateLimiter?: RateLimiter;
  protected readonly authStrategy?: AuthStrategy;
  protected readonly timeout: number;
  protected readonly maxRetries: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // 끝에 슬래시 제거
    this.channel = config.channel;
    this.timeout = config.timeout ?? 30000;
    this.maxRetries = config.maxRetries ?? 3;
    this.authStrategy = config.authStrategy;

    this.httpClient = new HttpClient({
      timeout: this.timeout,
      maxRetries: this.maxRetries,
    });

    if (config.rateLimiter) {
      this.rateLimiter = new RateLimiter(config.rateLimiter);
    }
  }

  /**
   * 인증된 GET 요청
   */
  protected async get<T>(
    path: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('GET', path, options);
  }

  /**
   * 인증된 POST 요청
   */
  protected async post<T>(
    path: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('POST', path, options);
  }

  /**
   * 인증된 PUT 요청
   */
  protected async put<T>(
    path: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', path, options);
  }

  /**
   * 인증된 PATCH 요청
   */
  protected async patch<T>(
    path: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', path, options);
  }

  /**
   * 인증된 DELETE 요청
   */
  protected async delete<T>(
    path: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * 공통 요청 처리
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    // Rate limit 확인
    if (this.rateLimiter) {
      try {
        await this.rateLimiter.acquire();
      } catch (error) {
        systemLogger.warn(`Rate limit exceeded for ${this.channel}`, { path });
        throw error;
      }
    }

    // URL 구성
    const url = this.buildUrl(path);

    // 인증 헤더 추가
    let authHeaders: Record<string, string> = {};
    if (this.authStrategy) {
      authHeaders = await this.authStrategy.authenticate(url, options);
    }

    const mergedOptions: HttpRequestOptions = {
      ...options,
      method,
      headers: {
        ...options.headers,
        ...authHeaders,
      },
    };

    systemLogger.debug(`API Request: ${method} ${url}`, {
      channel: this.channel,
    });

    // HTTP 요청 실행
    const response = await this.httpClient[method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete']<T>(
      url,
      mergedOptions
    );

    systemLogger.debug(`API Response: ${response.status}`, {
      channel: this.channel,
      responseTime: response.responseTime,
    });

    return response;
  }

  /**
   * 전체 URL 생성
   */
  protected buildUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  /**
   * 채널 정보 조회
   */
  getChannel(): SalesChannel {
    return this.channel;
  }

  /**
   * Rate Limiter 상태 조회
   */
  getRateLimiterStatus() {
    return this.rateLimiter?.getStatus();
  }

  /**
   * 연결 테스트 (각 채널에서 구현)
   */
  abstract testConnection(): Promise<boolean>;
}

export default ApiClient;

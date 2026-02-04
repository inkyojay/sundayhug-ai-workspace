/**
 * HTTP 클라이언트
 * 공통 HTTP 요청 처리 및 재시도 로직
 */

import { HttpRequestOptions, HttpResponse, ApiError, HttpMethod } from './types';
import { systemLogger } from '../../../utils/logger';

export interface HttpClientConfig {
  /** 기본 타임아웃 (밀리초) */
  timeout?: number;
  /** 기본 재시도 횟수 */
  maxRetries?: number;
  /** 재시도 지연 시간 (밀리초) */
  retryDelay?: number;
  /** 기본 헤더 */
  defaultHeaders?: Record<string, string>;
}

const DEFAULT_CONFIG: Required<HttpClientConfig> = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

/**
 * HTTP 클라이언트 클래스
 */
export class HttpClient {
  private config: Required<HttpClientConfig>;

  constructor(config?: HttpClientConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      defaultHeaders: {
        ...DEFAULT_CONFIG.defaultHeaders,
        ...config?.defaultHeaders,
      },
    };
  }

  /**
   * GET 요청
   */
  async get<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST 요청
   */
  async post<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST' });
  }

  /**
   * PUT 요청
   */
  async put<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PUT' });
  }

  /**
   * PATCH 요청
   */
  async patch<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'PATCH' });
  }

  /**
   * DELETE 요청
   */
  async delete<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * 공통 요청 처리
   */
  private async request<T>(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const method = options.method || 'GET';
    const timeout = options.timeout ?? this.config.timeout;
    const maxRetries = options.retries ?? this.config.maxRetries;
    const finalUrl = this.buildUrl(url, options.query);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(finalUrl, method, options, timeout);
      } catch (error) {
        lastError = error as Error;

        // ApiError인 경우 복구 가능 여부 확인
        if (error instanceof ApiError) {
          if (!error.recoverable) {
            throw error;
          }
        }

        // 마지막 시도가 아니면 재시도
        if (attempt < maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          systemLogger.debug(`Retrying request (attempt ${attempt + 1}/${maxRetries})`, {
            url: finalUrl,
            delay,
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * 실제 HTTP 요청 실행
   */
  private async executeRequest<T>(
    url: string,
    method: HttpMethod,
    options: HttpRequestOptions,
    timeout: number
  ): Promise<HttpResponse<T>> {
    const startTime = Date.now();

    const headers: Record<string, string> = {
      ...this.config.defaultHeaders,
      ...options.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (options.body && method !== 'GET') {
      fetchOptions.body = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
    }

    // 타임아웃 처리
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const responseHeaders = this.parseHeaders(response.headers);

      // 응답 본문 파싱
      let data: T;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      // 에러 응답 처리
      if (!response.ok) {
        throw new ApiError({
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          code: `HTTP_${response.status}`,
          url,
          responseData: data,
        });
      }

      return {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: responseHeaders,
        url,
        responseTime,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      // AbortError (타임아웃)
      if ((error as Error).name === 'AbortError') {
        throw new ApiError({
          message: `Request timeout after ${timeout}ms`,
          status: 0,
          statusText: 'Timeout',
          code: 'TIMEOUT',
          url,
          recoverable: true,
        });
      }

      // 네트워크 에러
      throw new ApiError({
        message: (error as Error).message || 'Network error',
        status: 0,
        statusText: 'Network Error',
        code: 'NETWORK_ERROR',
        url,
        recoverable: true,
      });
    }
  }

  /**
   * URL에 쿼리 파라미터 추가
   */
  private buildUrl(baseUrl: string, query?: Record<string, string | number | boolean>): string {
    if (!query || Object.keys(query).length === 0) {
      return baseUrl;
    }

    const url = new URL(baseUrl);
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    return url.toString();
  }

  /**
   * 응답 헤더 파싱
   */
  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * 재시도 지연 시간 계산 (지수 백오프)
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.config.retryDelay * Math.pow(2, attempt);
    // 지터 추가 (±20%)
    const jitter = delay * 0.2 * (Math.random() - 0.5) * 2;
    return Math.round(delay + jitter);
  }

  /**
   * 대기
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default HttpClient;

/**
 * 인증 전략 추상 클래스
 * 각 채널별 인증 방식을 구현하는 기반 클래스
 */

import { AuthStrategy, HttpRequestOptions } from './types';

/**
 * 인증 전략 기본 구현
 */
export abstract class BaseAuthStrategy implements AuthStrategy {
  abstract readonly type: 'hmac' | 'oauth2' | 'api-key' | 'bearer';

  abstract authenticate(
    url: string,
    options: HttpRequestOptions
  ): Promise<Record<string, string>>;

  abstract isValid(): boolean;

  refreshToken?(): Promise<void>;
}

/**
 * API Key 인증 전략
 */
export class ApiKeyAuthStrategy extends BaseAuthStrategy {
  readonly type = 'api-key' as const;
  private apiKey: string;
  private headerName: string;

  constructor(apiKey: string, headerName: string = 'X-Api-Key') {
    super();
    this.apiKey = apiKey;
    this.headerName = headerName;
  }

  async authenticate(): Promise<Record<string, string>> {
    return {
      [this.headerName]: this.apiKey,
    };
  }

  isValid(): boolean {
    return !!this.apiKey;
  }
}

/**
 * Bearer Token 인증 전략
 */
export class BearerAuthStrategy extends BaseAuthStrategy {
  readonly type = 'bearer' as const;
  private token: string;

  constructor(token: string) {
    super();
    this.token = token;
  }

  async authenticate(): Promise<Record<string, string>> {
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  isValid(): boolean {
    return !!this.token;
  }

  updateToken(newToken: string): void {
    this.token = newToken;
  }
}

/**
 * OAuth 2.0 기본 클래스
 */
export abstract class OAuth2AuthStrategy extends BaseAuthStrategy {
  readonly type = 'oauth2' as const;
  protected accessToken: string | null = null;
  protected refreshTokenValue: string | null = null;
  protected tokenExpiresAt: Date | null = null;

  abstract refreshToken(): Promise<void>;

  async authenticate(): Promise<Record<string, string>> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.refreshToken();
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  isValid(): boolean {
    return !!this.accessToken && !this.isTokenExpired();
  }

  protected isTokenExpired(): boolean {
    if (!this.tokenExpiresAt) {
      return false;
    }
    // 만료 1분 전에 갱신
    const bufferMs = 60 * 1000;
    return Date.now() > this.tokenExpiresAt.getTime() - bufferMs;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshTokenValue;
  }

  getTokenExpiresAt(): Date | null {
    return this.tokenExpiresAt;
  }
}

/**
 * HMAC 인증 기본 클래스
 */
export abstract class HmacAuthStrategy extends BaseAuthStrategy {
  readonly type = 'hmac' as const;
  protected secretKey: string;

  constructor(secretKey: string) {
    super();
    this.secretKey = secretKey;
  }

  abstract authenticate(
    url: string,
    options: HttpRequestOptions
  ): Promise<Record<string, string>>;

  isValid(): boolean {
    return !!this.secretKey;
  }

  /**
   * HMAC-SHA256 서명 생성 (Web Crypto API 사용)
   */
  protected async createHmacSignature(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.secretKey);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return this.arrayBufferToHex(signature);
  }

  /**
   * ArrayBuffer를 16진수 문자열로 변환
   */
  protected arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * ArrayBuffer를 Base64 문자열로 변환
   */
  protected arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export default {
  BaseAuthStrategy,
  ApiKeyAuthStrategy,
  BearerAuthStrategy,
  OAuth2AuthStrategy,
  HmacAuthStrategy,
};

/**
 * Cafe24 인증 전략
 * OAuth 2.0 (Refresh Token 방식)
 */

import { OAuth2AuthStrategy } from '../../core/AuthStrategy';
import { Cafe24Credentials, Cafe24TokenResponse } from './types';

/**
 * Cafe24 인증 전략
 */
export class Cafe24AuthStrategy extends OAuth2AuthStrategy {
  private readonly mallId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(credentials: Cafe24Credentials) {
    super();
    this.mallId = credentials.mallId;
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;

    if (credentials.accessToken) {
      this.accessToken = credentials.accessToken;
    }
    if (credentials.refreshToken) {
      this.refreshTokenValue = credentials.refreshToken;
    }
    if (credentials.tokenExpiresAt) {
      this.tokenExpiresAt = credentials.tokenExpiresAt;
    }
  }

  /**
   * 토큰 갱신 (Refresh Token 사용)
   */
  async refreshToken(): Promise<void> {
    if (!this.refreshTokenValue) {
      throw new Error('Refresh token is required for Cafe24 authentication');
    }

    const tokenUrl = `${this.getApiBaseUrl()}/api/v2/oauth/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshTokenValue,
    });

    // Basic Auth 헤더 생성
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh Cafe24 token: ${response.status} - ${error}`);
    }

    const data: Cafe24TokenResponse = await response.json();

    this.accessToken = data.access_token;
    this.refreshTokenValue = data.refresh_token;
    this.tokenExpiresAt = new Date(data.expires_at);
  }

  /**
   * Mall ID 조회
   */
  getMallId(): string {
    return this.mallId;
  }

  /**
   * API 기본 URL 생성 (Mall-specific)
   */
  getApiBaseUrl(): string {
    return `https://${this.mallId}.cafe24api.com`;
  }
}

export default Cafe24AuthStrategy;

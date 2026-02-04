/**
 * 네이버 인증 전략
 * OAuth 2.0 Client Credentials 인증
 */

import { OAuth2AuthStrategy } from '../../core/AuthStrategy';
import { NaverCredentials, NaverTokenResponse } from './types';

const NAVER_TOKEN_URL = 'https://api.commerce.naver.com/external/v1/oauth2.0/token';

export class NaverAuthStrategy extends OAuth2AuthStrategy {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly smartStoreId?: string;

  constructor(credentials: NaverCredentials) {
    super();
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.smartStoreId = credentials.smartStoreId;
  }

  /**
   * 토큰 갱신 (Client Credentials 방식)
   */
  async refreshToken(): Promise<void> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'client_credentials',
      type: 'SELF',
    });

    const response = await fetch(NAVER_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch Naver token: ${response.status} - ${error}`);
    }

    const data: NaverTokenResponse = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  }

  /**
   * 자격 증명 유효성 확인
   */
  isValid(): boolean {
    return !!this.accessToken && !this.isTokenExpired();
  }

  /**
   * SmartStore ID 조회
   */
  getSmartStoreId(): string | undefined {
    return this.smartStoreId;
  }
}

export default NaverAuthStrategy;

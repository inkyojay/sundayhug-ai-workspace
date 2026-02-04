/**
 * 쿠팡 인증 전략
 * HMAC-SHA256 서명 기반 인증
 *
 * 쿠팡 API 인증 방식:
 * Authorization: CEA algorithm=HmacSHA256, access-key={ACCESS_KEY}, signed-date={SIGNED_DATE}, signature={SIGNATURE}
 */

import { HmacAuthStrategy } from '../../core/AuthStrategy';
import { HttpRequestOptions } from '../../core/types';
import { CoupangCredentials } from './types';

export class CoupangAuthStrategy extends HmacAuthStrategy {
  private readonly vendorId: string;
  private readonly accessKey: string;

  constructor(credentials: CoupangCredentials) {
    super(credentials.secretKey);
    this.vendorId = credentials.vendorId;
    this.accessKey = credentials.accessKey;
  }

  /**
   * 쿠팡 API 인증 헤더 생성
   */
  async authenticate(
    url: string,
    options: HttpRequestOptions
  ): Promise<Record<string, string>> {
    const method = (options.method || 'GET').toUpperCase();
    const signedDate = this.generateSignedDate();

    // URL 파싱
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname;
    const queryString = this.buildSortedQueryString(parsedUrl.searchParams);

    // 서명 메시지 생성
    const message = this.buildMessageToSign(method, path, queryString, signedDate);

    // HMAC-SHA256 서명 생성
    const signature = await this.createHmacSignature(message);

    // Authorization 헤더 생성
    const authorization = [
      'CEA algorithm=HmacSHA256',
      `access-key=${this.accessKey}`,
      `signed-date=${signedDate}`,
      `signature=${signature}`,
    ].join(', ');

    return {
      Authorization: authorization,
      'Content-Type': 'application/json;charset=UTF-8',
    };
  }

  /**
   * 자격 증명 유효성 확인
   */
  isValid(): boolean {
    return !!(this.vendorId && this.accessKey && this.secretKey);
  }

  /**
   * Vendor ID 조회
   */
  getVendorId(): string {
    return this.vendorId;
  }

  /**
   * 서명 날짜 생성 (yyMMdd'T'HHmmss'Z' 형식)
   */
  private generateSignedDate(): string {
    const now = new Date();
    const year = String(now.getUTCFullYear()).slice(-2);
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * 서명 메시지 생성
   */
  private buildMessageToSign(
    method: string,
    path: string,
    queryString: string,
    signedDate: string
  ): string {
    const parts = [method, path, signedDate];

    if (queryString) {
      parts.push(queryString);
    }

    return parts.join('');
  }

  /**
   * 정렬된 쿼리 문자열 생성
   */
  private buildSortedQueryString(searchParams: URLSearchParams): string {
    const params: Array<[string, string]> = [];
    searchParams.forEach((value, key) => {
      params.push([key, value]);
    });

    if (params.length === 0) {
      return '';
    }

    // 키 기준 정렬
    params.sort((a, b) => a[0].localeCompare(b[0]));

    return params.map(([key, value]) => `${key}=${value}`).join('&');
  }
}

export default CoupangAuthStrategy;

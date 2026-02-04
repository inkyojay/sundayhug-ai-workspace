/**
 * CoupangAuthStrategy 테스트
 * HMAC-SHA256 서명 생성 및 인증 헤더 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoupangAuthStrategy } from '../../../../../src/infrastructure/api/channels/coupang/CoupangAuthStrategy';

describe('CoupangAuthStrategy', () => {
  let authStrategy: CoupangAuthStrategy;
  const mockCredentials = {
    vendorId: 'A00012345',
    accessKey: 'test-access-key-123',
    secretKey: 'test-secret-key-456',
  };

  beforeEach(() => {
    authStrategy = new CoupangAuthStrategy(mockCredentials);
    // 시간 고정
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));
  });

  describe('HMAC Signature', () => {
    it('should have type "hmac"', () => {
      expect(authStrategy.type).toBe('hmac');
    });

    it('should be valid when credentials are provided', () => {
      expect(authStrategy.isValid()).toBe(true);
    });

    it('should be invalid when secret key is empty', () => {
      const invalidAuth = new CoupangAuthStrategy({
        ...mockCredentials,
        secretKey: '',
      });
      expect(invalidAuth.isValid()).toBe(false);
    });
  });

  describe('Authentication Headers', () => {
    it('should generate Authorization header for GET request', async () => {
      const url = 'https://api-gateway.coupang.com/v2/providers/openapi/apis/api/v4/vendors/A00012345/ordersheets';
      const headers = await authStrategy.authenticate(url, { method: 'GET' });

      expect(headers).toHaveProperty('Authorization');
      expect(headers.Authorization).toMatch(/^CEA algorithm=HmacSHA256/);
      expect(headers.Authorization).toContain('access-key=test-access-key-123');
      expect(headers.Authorization).toContain('signed-date=');
      expect(headers.Authorization).toContain('signature=');
    });

    it('should generate Authorization header for POST request', async () => {
      const url = 'https://api-gateway.coupang.com/v2/providers/openapi/apis/api/v4/vendors/A00012345/ordersheets';
      const body = { orderId: 12345 };
      const headers = await authStrategy.authenticate(url, {
        method: 'POST',
        body,
      });

      expect(headers).toHaveProperty('Authorization');
      expect(headers.Authorization).toMatch(/^CEA algorithm=HmacSHA256/);
    });

    it('should include correct signed-date format', async () => {
      const url = 'https://api-gateway.coupang.com/test';
      const headers = await authStrategy.authenticate(url, { method: 'GET' });

      // Extract signed-date from Authorization header
      const signedDateMatch = headers.Authorization.match(/signed-date=(\d{6}T\d{6}Z)/);
      expect(signedDateMatch).toBeTruthy();
      expect(signedDateMatch![1]).toBe('240115T103000Z');
    });

    it('should generate different signatures for different paths', async () => {
      const url1 = 'https://api-gateway.coupang.com/v2/providers/openapi/apis/api/v4/vendors/A00012345/ordersheets';
      const url2 = 'https://api-gateway.coupang.com/v2/providers/openapi/apis/api/v4/vendors/A00012345/returns';

      const headers1 = await authStrategy.authenticate(url1, { method: 'GET' });
      const headers2 = await authStrategy.authenticate(url2, { method: 'GET' });

      // 서명이 달라야 함
      const sig1 = headers1.Authorization.match(/signature=([a-f0-9]+)/);
      const sig2 = headers2.Authorization.match(/signature=([a-f0-9]+)/);

      expect(sig1![1]).not.toBe(sig2![1]);
    });

    it('should generate different signatures for different methods', async () => {
      const url = 'https://api-gateway.coupang.com/test';

      const headersGet = await authStrategy.authenticate(url, { method: 'GET' });
      const headersPost = await authStrategy.authenticate(url, { method: 'POST' });

      const sigGet = headersGet.Authorization.match(/signature=([a-f0-9]+)/);
      const sigPost = headersPost.Authorization.match(/signature=([a-f0-9]+)/);

      expect(sigGet![1]).not.toBe(sigPost![1]);
    });
  });

  describe('Query Parameters', () => {
    it('should include query parameters in signature', async () => {
      const url = 'https://api-gateway.coupang.com/test?page=1&limit=50';
      const headers = await authStrategy.authenticate(url, { method: 'GET' });

      expect(headers.Authorization).toBeTruthy();
    });

    it('should sort query parameters for consistent signature', async () => {
      const url1 = 'https://api-gateway.coupang.com/test?b=2&a=1';
      const url2 = 'https://api-gateway.coupang.com/test?a=1&b=2';

      const headers1 = await authStrategy.authenticate(url1, { method: 'GET' });
      const headers2 = await authStrategy.authenticate(url2, { method: 'GET' });

      const sig1 = headers1.Authorization.match(/signature=([a-f0-9]+)/);
      const sig2 = headers2.Authorization.match(/signature=([a-f0-9]+)/);

      // 정렬된 쿼리 파라미터로 동일한 서명 생성
      expect(sig1![1]).toBe(sig2![1]);
    });
  });
});

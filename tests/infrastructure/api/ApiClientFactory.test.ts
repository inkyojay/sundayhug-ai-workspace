/**
 * ApiClientFactory 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClientFactory, loadCredentialsFromEnv } from '../../../src/infrastructure/api/ApiClientFactory';
import { SalesChannel } from '../../../src/types';

describe('ApiClientFactory', () => {
  let factory: ApiClientFactory;

  beforeEach(() => {
    factory = new ApiClientFactory();
    vi.resetAllMocks();
  });

  afterEach(() => {
    factory.clearAll();
  });

  describe('createClient', () => {
    it('should create Coupang client', () => {
      const client = factory.createClient({
        channel: SalesChannel.COUPANG,
        credentials: {
          vendorId: 'test-vendor',
          accessKey: 'test-access',
          secretKey: 'test-secret',
        },
      });

      expect(client).toBeDefined();
      expect(client.getChannel()).toBe(SalesChannel.COUPANG);
    });

    it('should create Naver client', () => {
      const client = factory.createClient({
        channel: SalesChannel.NAVER,
        credentials: {
          clientId: 'test-client',
          clientSecret: 'test-secret',
        },
      });

      expect(client).toBeDefined();
      expect(client.getChannel()).toBe(SalesChannel.NAVER);
    });

    it('should create Cafe24 client', () => {
      const client = factory.createClient({
        channel: SalesChannel.CAFE24,
        credentials: {
          mallId: 'test-mall',
          clientId: 'test-client',
          clientSecret: 'test-secret',
        },
      });

      expect(client).toBeDefined();
      expect(client.getChannel()).toBe(SalesChannel.CAFE24);
    });

    it('should return existing client on second call', () => {
      const creds = {
        channel: SalesChannel.COUPANG as const,
        credentials: {
          vendorId: 'test-vendor',
          accessKey: 'test-access',
          secretKey: 'test-secret',
        },
      };

      const client1 = factory.createClient(creds);
      const client2 = factory.createClient(creds);

      expect(client1).toBe(client2);
    });
  });

  describe('getClient', () => {
    it('should return undefined for uninitialized channel', () => {
      const client = factory.getClient(SalesChannel.COUPANG);
      expect(client).toBeUndefined();
    });

    it('should return client after creation', () => {
      factory.createClient({
        channel: SalesChannel.COUPANG,
        credentials: {
          vendorId: 'test-vendor',
          accessKey: 'test-access',
          secretKey: 'test-secret',
        },
      });

      const client = factory.getClient(SalesChannel.COUPANG);
      expect(client).toBeDefined();
    });
  });

  describe('clearAll', () => {
    it('should clear all clients', () => {
      factory.createClient({
        channel: SalesChannel.COUPANG,
        credentials: {
          vendorId: 'test-vendor',
          accessKey: 'test-access',
          secretKey: 'test-secret',
        },
      });

      factory.clearAll();

      expect(factory.getClient(SalesChannel.COUPANG)).toBeUndefined();
    });
  });
});

describe('loadCredentialsFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return null when Coupang credentials are missing', () => {
    delete process.env.COUPANG_VENDOR_ID;
    delete process.env.COUPANG_ACCESS_KEY;
    delete process.env.COUPANG_SECRET_KEY;

    const result = loadCredentialsFromEnv(SalesChannel.COUPANG);
    expect(result).toBeNull();
  });

  it('should load Coupang credentials from env', () => {
    process.env.COUPANG_VENDOR_ID = 'vendor123';
    process.env.COUPANG_ACCESS_KEY = 'access123';
    process.env.COUPANG_SECRET_KEY = 'secret123';

    const result = loadCredentialsFromEnv(SalesChannel.COUPANG);

    expect(result).not.toBeNull();
    expect(result?.channel).toBe(SalesChannel.COUPANG);
    if (result?.channel === SalesChannel.COUPANG) {
      expect(result.credentials.vendorId).toBe('vendor123');
    }
  });

  it('should return null when Naver credentials are missing', () => {
    delete process.env.NAVER_CLIENT_ID;
    delete process.env.NAVER_CLIENT_SECRET;

    const result = loadCredentialsFromEnv(SalesChannel.NAVER);
    expect(result).toBeNull();
  });

  it('should load Naver credentials from env', () => {
    process.env.NAVER_CLIENT_ID = 'client123';
    process.env.NAVER_CLIENT_SECRET = 'secret123';
    process.env.NAVER_SMARTSTORE_ID = 'store123';

    const result = loadCredentialsFromEnv(SalesChannel.NAVER);

    expect(result).not.toBeNull();
    expect(result?.channel).toBe(SalesChannel.NAVER);
    if (result?.channel === SalesChannel.NAVER) {
      expect(result.credentials.clientId).toBe('client123');
      expect(result.credentials.smartStoreId).toBe('store123');
    }
  });

  it('should return null when Cafe24 credentials are missing', () => {
    delete process.env.CAFE24_MALL_ID;
    delete process.env.CAFE24_CLIENT_ID;
    delete process.env.CAFE24_CLIENT_SECRET;

    const result = loadCredentialsFromEnv(SalesChannel.CAFE24);
    expect(result).toBeNull();
  });

  it('should load Cafe24 credentials from env', () => {
    process.env.CAFE24_MALL_ID = 'mall123';
    process.env.CAFE24_CLIENT_ID = 'client123';
    process.env.CAFE24_CLIENT_SECRET = 'secret123';
    process.env.CAFE24_ACCESS_TOKEN = 'token123';
    process.env.CAFE24_REFRESH_TOKEN = 'refresh123';

    const result = loadCredentialsFromEnv(SalesChannel.CAFE24);

    expect(result).not.toBeNull();
    expect(result?.channel).toBe(SalesChannel.CAFE24);
    if (result?.channel === SalesChannel.CAFE24) {
      expect(result.credentials.mallId).toBe('mall123');
      expect(result.credentials.accessToken).toBe('token123');
    }
  });

  it('should return null for unsupported channel', () => {
    const result = loadCredentialsFromEnv(SalesChannel.GMARKET);
    expect(result).toBeNull();
  });
});

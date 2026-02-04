/**
 * 테스트 설정 파일
 * 모든 테스트 실행 전에 실행됩니다.
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// 환경 변수 Mock 설정
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
process.env.DASHBOARD_URL = 'http://localhost:3000';
process.env.LOG_LEVEL = 'debug';

// 콘솔 출력 억제 (테스트 시 깔끔한 출력)
const originalConsole = { ...console };

beforeAll(() => {
  // 테스트 환경에서 콘솔 출력 제어
  if (process.env.SILENT_TESTS === 'true') {
    console.log = vi.fn();
    console.info = vi.fn();
    console.debug = vi.fn();
    // error와 warn은 유지
  }
});

afterAll(() => {
  // 콘솔 복원
  Object.assign(console, originalConsole);
});

afterEach(() => {
  // 각 테스트 후 mock 초기화
  vi.clearAllMocks();
});

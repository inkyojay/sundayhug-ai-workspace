/**
 * Feature Flags
 * 실시간 기능 토글 및 롤백 지원
 */

import { SalesChannel } from '../../types';

/**
 * Feature Flag 키
 */
export enum FeatureFlag {
  // API 연동 활성화 플래그
  REAL_COUPANG_API = 'FEATURE_REAL_COUPANG',
  REAL_NAVER_API = 'FEATURE_REAL_NAVER',
  REAL_CAFE24_API = 'FEATURE_REAL_CAFE24',

  // 기타 기능 플래그
  ORDER_SYNC_ENABLED = 'FEATURE_ORDER_SYNC_ENABLED',
  AUTO_SHIPPING_UPDATE = 'FEATURE_AUTO_SHIPPING_UPDATE',
}

/**
 * 기본값 설정
 */
const DEFAULT_VALUES: Record<FeatureFlag, boolean> = {
  [FeatureFlag.REAL_COUPANG_API]: false,
  [FeatureFlag.REAL_NAVER_API]: false,
  [FeatureFlag.REAL_CAFE24_API]: false,
  [FeatureFlag.ORDER_SYNC_ENABLED]: true,
  [FeatureFlag.AUTO_SHIPPING_UPDATE]: false,
};

/**
 * Feature Flags 매니저
 */
export class FeatureFlags {
  private overrides: Map<FeatureFlag, boolean> = new Map();

  /**
   * Feature Flag 값 조회
   */
  isEnabled(flag: FeatureFlag): boolean {
    // 오버라이드 확인
    if (this.overrides.has(flag)) {
      return this.overrides.get(flag)!;
    }

    // 환경 변수 확인
    const envValue = process.env[flag];
    if (envValue !== undefined) {
      return envValue.toLowerCase() === 'true' || envValue === '1';
    }

    // 기본값 반환
    return DEFAULT_VALUES[flag];
  }

  /**
   * 채널별 실제 API 사용 여부 확인
   */
  isRealApiEnabled(channel: SalesChannel): boolean {
    switch (channel) {
      case SalesChannel.COUPANG:
        return this.isEnabled(FeatureFlag.REAL_COUPANG_API);
      case SalesChannel.NAVER:
        return this.isEnabled(FeatureFlag.REAL_NAVER_API);
      case SalesChannel.CAFE24:
        return this.isEnabled(FeatureFlag.REAL_CAFE24_API);
      default:
        return false;
    }
  }

  /**
   * Feature Flag 오버라이드 설정 (테스트/런타임용)
   */
  setOverride(flag: FeatureFlag, value: boolean): void {
    this.overrides.set(flag, value);
  }

  /**
   * 오버라이드 해제
   */
  clearOverride(flag: FeatureFlag): void {
    this.overrides.delete(flag);
  }

  /**
   * 모든 오버라이드 해제
   */
  clearAllOverrides(): void {
    this.overrides.clear();
  }

  /**
   * 현재 모든 플래그 상태 조회
   */
  getAllFlags(): Record<FeatureFlag, boolean> {
    const result: Record<string, boolean> = {};
    for (const flag of Object.values(FeatureFlag)) {
      result[flag] = this.isEnabled(flag);
    }
    return result as Record<FeatureFlag, boolean>;
  }
}

// 싱글톤 인스턴스
export const featureFlags = new FeatureFlags();

export default featureFlags;

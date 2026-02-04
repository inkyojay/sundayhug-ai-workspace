/**
 * 썬데이허그 AI 에이전트 시스템 - 헬스체크 관리자
 *
 * LANE 5: Integration & Orchestration
 * 시스템 구성 요소의 상태를 주기적으로 확인합니다.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  HealthCheckDefinition,
  HealthCheckResult,
  HealthStatus,
  ComponentHealth,
  SystemHealthReport,
} from './types';
import { MetricsCollector, metricsCollector } from './MetricsCollector';
import { systemLogger } from '../utils/logger';

/**
 * 헬스체크 관리자 설정
 */
interface HealthCheckManagerConfig {
  /** 기본 체크 간격 (밀리초) */
  defaultInterval: number;
  /** 기본 타임아웃 (밀리초) */
  defaultTimeout: number;
  /** 연속 실패 시 unhealthy 판정 횟수 */
  unhealthyThreshold: number;
  /** 연속 성공 시 healthy 판정 횟수 */
  healthyThreshold: number;
  /** 이력 보관 수 */
  historySize: number;
}

/**
 * 기본 설정
 */
const defaultConfig: HealthCheckManagerConfig = {
  defaultInterval: 30000, // 30초
  defaultTimeout: 5000, // 5초
  unhealthyThreshold: 3,
  healthyThreshold: 2,
  historySize: 100,
};

/**
 * 헬스체크 상태 추적
 */
interface HealthCheckState {
  /** 정의 ID */
  definitionId: string;
  /** 현재 상태 */
  status: HealthStatus;
  /** 연속 성공 횟수 */
  consecutiveSuccesses: number;
  /** 연속 실패 횟수 */
  consecutiveFailures: number;
  /** 마지막 체크 시간 */
  lastCheckAt?: Date;
  /** 마지막 성공 시간 */
  lastSuccessAt?: Date;
  /** 마지막 실패 시간 */
  lastFailureAt?: Date;
  /** 마지막 결과 */
  lastResult?: HealthCheckResult;
  /** 타이머 */
  timer?: NodeJS.Timeout;
}

/**
 * 헬스체크 함수 타입
 */
type HealthCheckFunction = () => Promise<HealthCheckResult>;

/**
 * 헬스체크 관리자 클래스
 */
export class HealthCheckManager extends EventEmitter {
  private config: HealthCheckManagerConfig;
  private definitions: Map<string, HealthCheckDefinition> = new Map();
  private states: Map<string, HealthCheckState> = new Map();
  private checkers: Map<string, HealthCheckFunction> = new Map();
  private history: Map<string, HealthCheckResult[]> = new Map();
  private metrics: MetricsCollector;
  private isRunning: boolean = false;

  /**
   * HealthCheckManager 생성자
   */
  constructor(config?: Partial<HealthCheckManagerConfig>) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.metrics = metricsCollector;

    systemLogger.info('HealthCheckManager initialized', {
      defaultInterval: this.config.defaultInterval,
      unhealthyThreshold: this.config.unhealthyThreshold,
    });
  }

  // ===========================================================================
  // 헬스체크 등록
  // ===========================================================================

  /**
   * 헬스체크 등록
   */
  registerCheck(
    definition: HealthCheckDefinition,
    checker: HealthCheckFunction
  ): void {
    this.definitions.set(definition.id, definition);
    this.checkers.set(definition.id, checker);
    this.states.set(definition.id, {
      definitionId: definition.id,
      status: HealthStatus.UNKNOWN,
      consecutiveSuccesses: 0,
      consecutiveFailures: 0,
    });
    this.history.set(definition.id, []);

    this.emit('check:registered', { checkId: definition.id });
    systemLogger.info('Health check registered', {
      id: definition.id,
      name: definition.name,
      targetType: definition.targetType,
      interval: definition.interval,
    });

    // 실행 중이면 즉시 시작
    if (this.isRunning && definition.enabled) {
      this.startCheck(definition.id);
    }
  }

  /**
   * 헬스체크 해제
   */
  unregisterCheck(checkId: string): void {
    this.stopCheck(checkId);
    this.definitions.delete(checkId);
    this.checkers.delete(checkId);
    this.states.delete(checkId);
    this.history.delete(checkId);

    this.emit('check:unregistered', { checkId });
  }

  /**
   * 헬스체크 활성화
   */
  enableCheck(checkId: string): void {
    const definition = this.definitions.get(checkId);
    if (definition) {
      definition.enabled = true;
      if (this.isRunning) {
        this.startCheck(checkId);
      }
    }
  }

  /**
   * 헬스체크 비활성화
   */
  disableCheck(checkId: string): void {
    const definition = this.definitions.get(checkId);
    if (definition) {
      definition.enabled = false;
      this.stopCheck(checkId);
    }
  }

  // ===========================================================================
  // 실행 제어
  // ===========================================================================

  /**
   * 모든 헬스체크 시작
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    for (const [checkId, definition] of this.definitions) {
      if (definition.enabled) {
        this.startCheck(checkId);
      }
    }

    systemLogger.info('HealthCheckManager started');
  }

  /**
   * 모든 헬스체크 중지
   */
  stop(): void {
    this.isRunning = false;

    for (const checkId of this.definitions.keys()) {
      this.stopCheck(checkId);
    }

    systemLogger.info('HealthCheckManager stopped');
  }

  /**
   * 개별 체크 시작
   */
  private startCheck(checkId: string): void {
    const definition = this.definitions.get(checkId);
    const state = this.states.get(checkId);

    if (!definition || !state) return;

    // 기존 타이머 정리
    if (state.timer) {
      clearInterval(state.timer);
    }

    const interval = definition.interval || this.config.defaultInterval;

    // 즉시 첫 체크 실행
    this.executeCheck(checkId);

    // 주기적 체크 설정
    state.timer = setInterval(() => {
      this.executeCheck(checkId);
    }, interval);
  }

  /**
   * 개별 체크 중지
   */
  private stopCheck(checkId: string): void {
    const state = this.states.get(checkId);
    if (state?.timer) {
      clearInterval(state.timer);
      state.timer = undefined;
    }
  }

  // ===========================================================================
  // 체크 실행
  // ===========================================================================

  /**
   * 헬스체크 실행
   */
  async executeCheck(checkId: string): Promise<HealthCheckResult | null> {
    const definition = this.definitions.get(checkId);
    const checker = this.checkers.get(checkId);
    const state = this.states.get(checkId);

    if (!definition || !checker || !state) return null;

    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      // 타임아웃 적용
      const timeout = definition.timeout || this.config.defaultTimeout;
      result = await this.executeWithTimeout(checker, timeout);
      result.checkId = checkId;
      result.timestamp = new Date();
      result.responseTime = Date.now() - startTime;
    } catch (error) {
      result = {
        checkId,
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // 상태 업데이트
    this.updateState(checkId, result);

    // 이력 추가
    this.addToHistory(checkId, result);

    // 메트릭 기록
    this.recordMetrics(checkId, result);

    // 이벤트 발생
    this.emit('check:completed', { checkId, result });

    return result;
  }

  /**
   * 타임아웃 적용 실행
   */
  private async executeWithTimeout(
    checker: HealthCheckFunction,
    timeout: number
  ): Promise<HealthCheckResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeout}ms`));
      }, timeout);

      checker()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 상태 업데이트
   */
  private updateState(checkId: string, result: HealthCheckResult): void {
    const state = this.states.get(checkId);
    if (!state) return;

    const previousStatus = state.status;
    state.lastCheckAt = result.timestamp;
    state.lastResult = result;

    if (result.status === HealthStatus.HEALTHY) {
      state.consecutiveSuccesses++;
      state.consecutiveFailures = 0;
      state.lastSuccessAt = result.timestamp;

      // healthy 판정
      if (state.consecutiveSuccesses >= this.config.healthyThreshold) {
        state.status = HealthStatus.HEALTHY;
      }
    } else if (result.status === HealthStatus.UNHEALTHY) {
      state.consecutiveFailures++;
      state.consecutiveSuccesses = 0;
      state.lastFailureAt = result.timestamp;

      // unhealthy 판정
      if (state.consecutiveFailures >= this.config.unhealthyThreshold) {
        state.status = HealthStatus.UNHEALTHY;
      } else if (state.status === HealthStatus.HEALTHY) {
        state.status = HealthStatus.DEGRADED;
      }
    } else if (result.status === HealthStatus.DEGRADED) {
      state.status = HealthStatus.DEGRADED;
    }

    // 상태 변경 이벤트
    if (previousStatus !== state.status) {
      this.emit('status:changed', {
        checkId,
        previousStatus,
        currentStatus: state.status,
      });

      systemLogger.warn('Health check status changed', {
        checkId,
        previousStatus,
        currentStatus: state.status,
      });
    }
  }

  /**
   * 이력 추가
   */
  private addToHistory(checkId: string, result: HealthCheckResult): void {
    const history = this.history.get(checkId);
    if (!history) return;

    history.push(result);

    if (history.length > this.config.historySize) {
      history.shift();
    }
  }

  /**
   * 메트릭 기록
   */
  private recordMetrics(checkId: string, result: HealthCheckResult): void {
    const labels = { checkId };

    // 응답 시간
    if (result.responseTime !== undefined) {
      this.metrics.observeHistogram(
        'health_check_response_time',
        result.responseTime
      );
    }

    // 상태별 카운터
    this.metrics.incCounter('health_check_total', 1, labels);

    if (result.status === HealthStatus.HEALTHY) {
      this.metrics.incCounter('health_check_success', 1, labels);
    } else {
      this.metrics.incCounter('health_check_failure', 1, labels);
    }

    // 현재 상태 게이지
    const statusValue =
      result.status === HealthStatus.HEALTHY
        ? 1
        : result.status === HealthStatus.DEGRADED
          ? 0.5
          : 0;
    this.metrics.setGauge('health_check_status', statusValue, labels);
  }

  // ===========================================================================
  // 조회 메서드
  // ===========================================================================

  /**
   * 모든 컴포넌트 상태 조회
   */
  getAllComponentHealth(): ComponentHealth[] {
    const components: ComponentHealth[] = [];

    for (const [checkId, definition] of this.definitions) {
      const state = this.states.get(checkId);
      if (!state) continue;

      components.push({
        id: definition.id,
        name: definition.name,
        type: definition.targetType,
        status: state.status,
        lastCheckAt: state.lastCheckAt,
        lastSuccessAt: state.lastSuccessAt,
        responseTime: state.lastResult?.responseTime,
        message: state.lastResult?.message,
        metadata: definition.metadata,
      });
    }

    return components;
  }

  /**
   * 특정 컴포넌트 상태 조회
   */
  getComponentHealth(checkId: string): ComponentHealth | undefined {
    const definition = this.definitions.get(checkId);
    const state = this.states.get(checkId);

    if (!definition || !state) return undefined;

    return {
      id: definition.id,
      name: definition.name,
      type: definition.targetType,
      status: state.status,
      lastCheckAt: state.lastCheckAt,
      lastSuccessAt: state.lastSuccessAt,
      responseTime: state.lastResult?.responseTime,
      message: state.lastResult?.message,
      metadata: definition.metadata,
    };
  }

  /**
   * 시스템 전체 상태 리포트 생성
   */
  generateReport(): SystemHealthReport {
    const components = this.getAllComponentHealth();

    // 전체 상태 결정
    let overallStatus = HealthStatus.HEALTHY;

    const unhealthyCount = components.filter(
      (c) => c.status === HealthStatus.UNHEALTHY
    ).length;
    const degradedCount = components.filter(
      (c) => c.status === HealthStatus.DEGRADED
    ).length;
    const unknownCount = components.filter(
      (c) => c.status === HealthStatus.UNKNOWN
    ).length;

    if (unhealthyCount > 0) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (degradedCount > 0 || unknownCount > 0) {
      overallStatus = HealthStatus.DEGRADED;
    }

    // 통계 계산
    const responseTimes = components
      .filter((c) => c.responseTime !== undefined)
      .map((c) => c.responseTime!);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    return {
      timestamp: new Date(),
      status: overallStatus,
      components,
      summary: {
        total: components.length,
        healthy: components.filter((c) => c.status === HealthStatus.HEALTHY)
          .length,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        unknown: unknownCount,
      },
      metrics: {
        avgResponseTime,
        checkCount: this.getTotalCheckCount(),
      },
    };
  }

  /**
   * 총 체크 횟수
   */
  private getTotalCheckCount(): number {
    let total = 0;
    for (const history of this.history.values()) {
      total += history.length;
    }
    return total;
  }

  /**
   * 체크 이력 조회
   */
  getHistory(checkId: string, limit?: number): HealthCheckResult[] {
    const history = this.history.get(checkId);
    if (!history) return [];

    const result = [...history].reverse();
    return limit ? result.slice(0, limit) : result;
  }

  /**
   * 상태별 컴포넌트 필터링
   */
  getComponentsByStatus(status: HealthStatus): ComponentHealth[] {
    return this.getAllComponentHealth().filter((c) => c.status === status);
  }

  /**
   * 등록된 체크 목록
   */
  listChecks(): HealthCheckDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * 체크 상태 조회
   */
  getCheckState(checkId: string): HealthCheckState | undefined {
    return this.states.get(checkId);
  }
}

// ===========================================================================
// 빌트인 헬스체크 팩토리
// ===========================================================================

/**
 * HTTP 엔드포인트 헬스체크 생성
 */
export function createHttpHealthCheck(
  url: string,
  expectedStatus: number = 200
): HealthCheckFunction {
  return async (): Promise<HealthCheckResult> => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (response.status === expectedStatus) {
        return {
          checkId: '',
          status: HealthStatus.HEALTHY,
          timestamp: new Date(),
          message: `HTTP ${response.status}`,
        };
      } else {
        return {
          checkId: '',
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          message: `HTTP ${response.status}`,
          error: `Expected ${expectedStatus}, got ${response.status}`,
        };
      }
    } catch (error) {
      return {
        checkId: '',
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
}

/**
 * 메모리 사용량 헬스체크 생성
 */
export function createMemoryHealthCheck(
  thresholdPercent: number = 90
): HealthCheckFunction {
  return async (): Promise<HealthCheckResult> => {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (heapUsedPercent < thresholdPercent) {
      return {
        checkId: '',
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        message: `Heap usage: ${heapUsedPercent.toFixed(1)}%`,
        details: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
        },
      };
    } else {
      return {
        checkId: '',
        status:
          heapUsedPercent >= 95
            ? HealthStatus.UNHEALTHY
            : HealthStatus.DEGRADED,
        timestamp: new Date(),
        message: `High heap usage: ${heapUsedPercent.toFixed(1)}%`,
        details: {
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          rss: memUsage.rss,
        },
      };
    }
  };
}

/**
 * 에이전트 헬스체크 생성
 */
export function createAgentHealthCheck(
  agentId: string,
  checkFn: () => Promise<boolean>
): HealthCheckFunction {
  return async (): Promise<HealthCheckResult> => {
    try {
      const isHealthy = await checkFn();

      return {
        checkId: '',
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        message: isHealthy ? 'Agent is responsive' : 'Agent is not responsive',
        details: { agentId },
      };
    } catch (error) {
      return {
        checkId: '',
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
        details: { agentId },
      };
    }
  };
}

// 싱글톤 인스턴스 export
export const healthCheckManager = new HealthCheckManager();
export default HealthCheckManager;

/**
 * 썬데이허그 AI 에이전트 시스템 - 메트릭 수집기
 *
 * LANE 5: Integration & Orchestration
 * 시스템 메트릭을 수집하고 저장합니다.
 */

import { EventEmitter } from 'events';
import {
  MetricType,
  MetricDefinition,
  MetricValue,
  MetricSnapshot,
  HistogramValue,
  HistogramBucket,
} from './types';
import { systemLogger } from '../utils/logger';

/**
 * 메트릭 수집기 설정
 */
interface MetricsCollectorConfig {
  /** 수집 간격 (밀리초) */
  collectionInterval: number;
  /** 보관 기간 (시간) */
  retentionHours: number;
  /** 최대 메트릭 수 */
  maxMetrics: number;
}

/**
 * 기본 설정
 */
const defaultConfig: MetricsCollectorConfig = {
  collectionInterval: 60000, // 1분
  retentionHours: 24,
  maxMetrics: 1000,
};

/**
 * 카운터 메트릭
 */
class Counter {
  private value: number = 0;
  private labels: Map<string, number> = new Map();

  inc(amount: number = 1, labels?: Record<string, string>): void {
    if (labels) {
      const key = this.labelKey(labels);
      this.labels.set(key, (this.labels.get(key) || 0) + amount);
    } else {
      this.value += amount;
    }
  }

  get(labels?: Record<string, string>): number {
    if (labels) {
      return this.labels.get(this.labelKey(labels)) || 0;
    }
    return this.value;
  }

  reset(labels?: Record<string, string>): void {
    if (labels) {
      this.labels.delete(this.labelKey(labels));
    } else {
      this.value = 0;
    }
  }

  private labelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }

  getAll(): Map<string, number> {
    const all = new Map<string, number>();
    all.set('', this.value);
    for (const [key, value] of this.labels) {
      all.set(key, value);
    }
    return all;
  }
}

/**
 * 게이지 메트릭
 */
class Gauge {
  private value: number = 0;
  private labels: Map<string, number> = new Map();

  set(value: number, labels?: Record<string, string>): void {
    if (labels) {
      this.labels.set(this.labelKey(labels), value);
    } else {
      this.value = value;
    }
  }

  inc(amount: number = 1, labels?: Record<string, string>): void {
    if (labels) {
      const key = this.labelKey(labels);
      this.labels.set(key, (this.labels.get(key) || 0) + amount);
    } else {
      this.value += amount;
    }
  }

  dec(amount: number = 1, labels?: Record<string, string>): void {
    if (labels) {
      const key = this.labelKey(labels);
      this.labels.set(key, (this.labels.get(key) || 0) - amount);
    } else {
      this.value -= amount;
    }
  }

  get(labels?: Record<string, string>): number {
    if (labels) {
      return this.labels.get(this.labelKey(labels)) || 0;
    }
    return this.value;
  }

  private labelKey(labels: Record<string, string>): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }
}

/**
 * 히스토그램 메트릭
 */
class Histogram {
  private buckets: number[];
  private counts: number[];
  private sum: number = 0;
  private count: number = 0;

  constructor(buckets: number[] = [0.1, 0.5, 1, 2.5, 5, 10]) {
    this.buckets = [...buckets].sort((a, b) => a - b);
    this.counts = new Array(this.buckets.length + 1).fill(0);
  }

  observe(value: number): void {
    this.sum += value;
    this.count++;

    for (let i = 0; i < this.buckets.length; i++) {
      if (value <= this.buckets[i]) {
        this.counts[i]++;
        return;
      }
    }
    this.counts[this.buckets.length]++;
  }

  getBuckets(): HistogramBucket[] {
    const result: HistogramBucket[] = [];
    let cumulative = 0;

    for (let i = 0; i < this.buckets.length; i++) {
      cumulative += this.counts[i];
      result.push({ le: this.buckets[i], count: cumulative });
    }

    cumulative += this.counts[this.buckets.length];
    result.push({ le: Infinity, count: cumulative });

    return result;
  }

  getSum(): number {
    return this.sum;
  }

  getCount(): number {
    return this.count;
  }

  getMean(): number {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  reset(): void {
    this.counts.fill(0);
    this.sum = 0;
    this.count = 0;
  }
}

/**
 * 메트릭 수집기 클래스
 */
export class MetricsCollector extends EventEmitter {
  private config: MetricsCollectorConfig;
  private definitions: Map<string, MetricDefinition> = new Map();
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private history: MetricValue[] = [];
  private collectionTimer?: NodeJS.Timeout;
  private previousValues: Map<string, number> = new Map();

  /**
   * MetricsCollector 생성자
   */
  constructor(config?: Partial<MetricsCollectorConfig>) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.initializeDefaultMetrics();

    systemLogger.info('MetricsCollector initialized', {
      collectionInterval: this.config.collectionInterval,
      retentionHours: this.config.retentionHours,
    });
  }

  /**
   * 기본 메트릭 초기화
   */
  private initializeDefaultMetrics(): void {
    // 에이전트 메트릭
    this.registerMetric({
      name: 'agent_executions_total',
      description: 'Total number of agent executions',
      type: MetricType.COUNTER,
      labels: ['agent_id', 'status'],
    });

    this.registerMetric({
      name: 'agent_execution_duration_seconds',
      description: 'Agent execution duration in seconds',
      type: MetricType.HISTOGRAM,
      unit: 'seconds',
      labels: ['agent_id'],
    });

    this.registerMetric({
      name: 'agents_active',
      description: 'Number of active agents',
      type: MetricType.GAUGE,
    });

    // 워크플로우 메트릭
    this.registerMetric({
      name: 'workflow_executions_total',
      description: 'Total number of workflow executions',
      type: MetricType.COUNTER,
      labels: ['workflow_id', 'status'],
    });

    this.registerMetric({
      name: 'workflow_duration_seconds',
      description: 'Workflow execution duration in seconds',
      type: MetricType.HISTOGRAM,
      unit: 'seconds',
      labels: ['workflow_id'],
    });

    // 스케줄러 메트릭
    this.registerMetric({
      name: 'scheduled_jobs_total',
      description: 'Total number of scheduled job executions',
      type: MetricType.COUNTER,
      labels: ['job_id', 'status'],
    });

    this.registerMetric({
      name: 'queue_size',
      description: 'Current queue size',
      type: MetricType.GAUGE,
      labels: ['queue_name'],
    });

    // 시스템 메트릭
    this.registerMetric({
      name: 'system_uptime_seconds',
      description: 'System uptime in seconds',
      type: MetricType.GAUGE,
      unit: 'seconds',
    });

    this.registerMetric({
      name: 'errors_total',
      description: 'Total number of errors',
      type: MetricType.COUNTER,
      labels: ['source', 'type'],
    });
  }

  /**
   * 메트릭 정의 등록
   */
  registerMetric(definition: MetricDefinition): void {
    this.definitions.set(definition.name, definition);

    switch (definition.type) {
      case MetricType.COUNTER:
        this.counters.set(definition.name, new Counter());
        break;
      case MetricType.GAUGE:
        this.gauges.set(definition.name, new Gauge());
        break;
      case MetricType.HISTOGRAM:
        this.histograms.set(definition.name, new Histogram());
        break;
    }

    systemLogger.debug('Metric registered', { name: definition.name });
  }

  // ===========================================================================
  // 카운터 메서드
  // ===========================================================================

  /**
   * 카운터 증가
   */
  incCounter(name: string, amount: number = 1, labels?: Record<string, string>): void {
    const counter = this.counters.get(name);
    if (counter) {
      counter.inc(amount, labels);
      this.emit('metric:updated', { name, type: 'counter', amount, labels });
    }
  }

  /**
   * 카운터 값 조회
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const counter = this.counters.get(name);
    return counter ? counter.get(labels) : 0;
  }

  // ===========================================================================
  // 게이지 메서드
  // ===========================================================================

  /**
   * 게이지 설정
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.set(value, labels);
      this.emit('metric:updated', { name, type: 'gauge', value, labels });
    }
  }

  /**
   * 게이지 증가
   */
  incGauge(name: string, amount: number = 1, labels?: Record<string, string>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.inc(amount, labels);
    }
  }

  /**
   * 게이지 감소
   */
  decGauge(name: string, amount: number = 1, labels?: Record<string, string>): void {
    const gauge = this.gauges.get(name);
    if (gauge) {
      gauge.dec(amount, labels);
    }
  }

  /**
   * 게이지 값 조회
   */
  getGauge(name: string, labels?: Record<string, string>): number {
    const gauge = this.gauges.get(name);
    return gauge ? gauge.get(labels) : 0;
  }

  // ===========================================================================
  // 히스토그램 메서드
  // ===========================================================================

  /**
   * 히스토그램 관측
   */
  observeHistogram(name: string, value: number): void {
    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.observe(value);
      this.emit('metric:updated', { name, type: 'histogram', value });
    }
  }

  /**
   * 히스토그램 값 조회
   */
  getHistogram(name: string): HistogramValue | undefined {
    const histogram = this.histograms.get(name);
    if (!histogram) return undefined;

    return {
      name,
      buckets: histogram.getBuckets(),
      sum: histogram.getSum(),
      count: histogram.getCount(),
    };
  }

  // ===========================================================================
  // 타이머 유틸리티
  // ===========================================================================

  /**
   * 실행 시간 측정 시작
   */
  startTimer(metricName: string): () => void {
    const start = Date.now();
    return () => {
      const duration = (Date.now() - start) / 1000;
      this.observeHistogram(metricName, duration);
    };
  }

  // ===========================================================================
  // 수집 관리
  // ===========================================================================

  /**
   * 수집 시작
   */
  startCollection(): void {
    if (this.collectionTimer) return;

    this.collectionTimer = setInterval(() => {
      this.collectSnapshot();
    }, this.config.collectionInterval);

    systemLogger.info('Metrics collection started');
  }

  /**
   * 수집 중지
   */
  stopCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }

    systemLogger.info('Metrics collection stopped');
  }

  /**
   * 스냅샷 수집
   */
  private collectSnapshot(): void {
    const timestamp = new Date();

    // 게이지 수집
    for (const [name, gauge] of this.gauges) {
      const value = gauge.get();
      this.addToHistory({ name, value, timestamp });
    }

    // 히스토리 정리
    this.cleanupHistory();

    this.emit('snapshot:collected', { timestamp });
  }

  /**
   * 히스토리에 추가
   */
  private addToHistory(value: MetricValue): void {
    this.history.push(value);

    // 최대 크기 제한
    if (this.history.length > this.config.maxMetrics) {
      this.history.shift();
    }
  }

  /**
   * 히스토리 정리
   */
  private cleanupHistory(): void {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - this.config.retentionHours);

    this.history = this.history.filter((v) => v.timestamp >= cutoff);
  }

  // ===========================================================================
  // 조회 메서드
  // ===========================================================================

  /**
   * 현재 스냅샷 조회
   */
  getSnapshot(): MetricSnapshot[] {
    const snapshots: MetricSnapshot[] = [];
    const now = new Date();

    for (const [name, definition] of this.definitions) {
      let value: number;

      switch (definition.type) {
        case MetricType.COUNTER:
          value = this.getCounter(name);
          break;
        case MetricType.GAUGE:
          value = this.getGauge(name);
          break;
        case MetricType.HISTOGRAM:
          const hist = this.getHistogram(name);
          value = hist ? hist.count : 0;
          break;
        default:
          continue;
      }

      const previousValue = this.previousValues.get(name);
      const delta = previousValue !== undefined ? value - previousValue : undefined;
      const changeRate =
        previousValue !== undefined && previousValue !== 0
          ? ((value - previousValue) / previousValue) * 100
          : undefined;

      snapshots.push({
        name,
        type: definition.type,
        value,
        previousValue,
        delta,
        changeRate,
        timestamp: now,
      });

      this.previousValues.set(name, value);
    }

    return snapshots;
  }

  /**
   * 메트릭 히스토리 조회
   */
  getHistory(
    metricName: string,
    duration?: { hours?: number; minutes?: number }
  ): MetricValue[] {
    let cutoff = new Date(0);

    if (duration) {
      cutoff = new Date();
      if (duration.hours) {
        cutoff.setHours(cutoff.getHours() - duration.hours);
      }
      if (duration.minutes) {
        cutoff.setMinutes(cutoff.getMinutes() - duration.minutes);
      }
    }

    return this.history.filter(
      (v) => v.name === metricName && v.timestamp >= cutoff
    );
  }

  /**
   * 등록된 메트릭 목록 조회
   */
  listMetrics(): MetricDefinition[] {
    return Array.from(this.definitions.values());
  }

  /**
   * 메트릭 정의 조회
   */
  getMetricDefinition(name: string): MetricDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * 메트릭 리셋
   */
  resetMetric(name: string): void {
    const counter = this.counters.get(name);
    if (counter) {
      counter.reset();
      return;
    }

    const histogram = this.histograms.get(name);
    if (histogram) {
      histogram.reset();
    }
  }

  /**
   * 모든 메트릭 리셋
   */
  resetAll(): void {
    for (const counter of this.counters.values()) {
      counter.reset();
    }
    for (const histogram of this.histograms.values()) {
      histogram.reset();
    }
    this.history = [];
    this.previousValues.clear();
  }
}

// 싱글톤 인스턴스 export
export const metricsCollector = new MetricsCollector();
export default MetricsCollector;

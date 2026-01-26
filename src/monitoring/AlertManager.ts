/**
 * 썬데이허그 AI 에이전트 시스템 - 알림 관리자
 *
 * LANE 5: Integration & Orchestration
 * 알림 규칙 관리 및 알림 발송을 담당합니다.
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import {
  AlertRule,
  AlertInstance,
  AlertSeverity,
  AlertCondition,
  AlertChannel,
  MonitoringEvent,
} from './types';
import { MetricsCollector, metricsCollector } from './MetricsCollector';
import { NotificationService, getNotificationService } from '../utils/notification';
import { NotificationPriority } from '../types';
import { systemLogger } from '../utils/logger';

/**
 * 알림 관리자 설정
 */
interface AlertManagerConfig {
  /** 평가 간격 (밀리초) */
  evaluationInterval: number;
  /** 기본 쿨다운 (초) */
  defaultCooldown: number;
  /** 최대 활성 알림 수 */
  maxActiveAlerts: number;
  /** 알림 이력 보관 수 */
  historySize: number;
}

/**
 * 기본 설정
 */
const defaultConfig: AlertManagerConfig = {
  evaluationInterval: 60000, // 1분
  defaultCooldown: 300, // 5분
  maxActiveAlerts: 100,
  historySize: 1000,
};

/**
 * 알림 상태 추적
 */
interface AlertState {
  /** 규칙 ID */
  ruleId: string;
  /** 연속 위반 횟수 */
  consecutiveViolations: number;
  /** 마지막 위반 시간 */
  lastViolationAt?: Date;
  /** 마지막 알림 시간 */
  lastAlertAt?: Date;
  /** 현재 발동 중인 알림 */
  currentAlert?: AlertInstance;
}

/**
 * 알림 관리자 클래스
 */
export class AlertManager extends EventEmitter {
  private config: AlertManagerConfig;
  private rules: Map<string, AlertRule> = new Map();
  private states: Map<string, AlertState> = new Map();
  private activeAlerts: Map<string, AlertInstance> = new Map();
  private history: AlertInstance[] = [];
  private metrics: MetricsCollector;
  private notificationService: NotificationService;
  private evaluationTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  /**
   * AlertManager 생성자
   */
  constructor(config?: Partial<AlertManagerConfig>) {
    super();
    this.config = { ...defaultConfig, ...config };
    this.metrics = metricsCollector;
    this.notificationService = getNotificationService();

    systemLogger.info('AlertManager initialized', {
      evaluationInterval: this.config.evaluationInterval,
      maxActiveAlerts: this.config.maxActiveAlerts,
    });
  }

  // ===========================================================================
  // 규칙 관리
  // ===========================================================================

  /**
   * 알림 규칙 등록
   */
  registerRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    this.states.set(rule.id, {
      ruleId: rule.id,
      consecutiveViolations: 0,
    });

    this.emit('rule:registered', { ruleId: rule.id });
    systemLogger.info('Alert rule registered', {
      id: rule.id,
      name: rule.name,
      metricName: rule.metricName,
    });
  }

  /**
   * 알림 규칙 해제
   */
  unregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.states.delete(ruleId);

    // 활성 알림 해결
    for (const [alertId, alert] of this.activeAlerts) {
      if (alert.ruleId === ruleId) {
        this.resolveAlert(alertId);
      }
    }

    this.emit('rule:unregistered', { ruleId });
  }

  /**
   * 규칙 활성화
   */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  /**
   * 규칙 비활성화
   */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  /**
   * 등록된 규칙 목록 조회
   */
  listRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 규칙 조회
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  // ===========================================================================
  // 평가 및 알림 발송
  // ===========================================================================

  /**
   * 평가 시작
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.evaluationTimer = setInterval(() => {
      this.evaluate();
    }, this.config.evaluationInterval);

    // 즉시 첫 평가
    this.evaluate();

    systemLogger.info('AlertManager started');
  }

  /**
   * 평가 중지
   */
  stop(): void {
    this.isRunning = false;

    if (this.evaluationTimer) {
      clearInterval(this.evaluationTimer);
      this.evaluationTimer = undefined;
    }

    systemLogger.info('AlertManager stopped');
  }

  /**
   * 모든 규칙 평가
   */
  private evaluate(): void {
    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      try {
        this.evaluateRule(rule);
      } catch (error) {
        systemLogger.error('Rule evaluation failed', error as Error, {
          ruleId,
        });
      }
    }
  }

  /**
   * 단일 규칙 평가
   */
  private evaluateRule(rule: AlertRule): void {
    const state = this.states.get(rule.id);
    if (!state) return;

    // 메트릭 값 조회
    const currentValue = this.metrics.getGauge(rule.metricName) ||
                        this.metrics.getCounter(rule.metricName);

    // 조건 평가
    const isViolating = this.evaluateCondition(rule.condition, currentValue);

    if (isViolating) {
      state.consecutiveViolations++;
      state.lastViolationAt = new Date();

      // 연속 위반 횟수 확인
      const requiredViolations = rule.condition.consecutiveViolations || 1;

      if (state.consecutiveViolations >= requiredViolations) {
        // 쿨다운 확인
        const cooldown = rule.cooldown || this.config.defaultCooldown;
        const cooldownMs = cooldown * 1000;

        if (!state.lastAlertAt ||
            Date.now() - state.lastAlertAt.getTime() >= cooldownMs) {
          this.fireAlert(rule, currentValue, state);
        }
      }
    } else {
      // 위반 해소
      if (state.consecutiveViolations > 0) {
        state.consecutiveViolations = 0;

        // 활성 알림 해결
        if (state.currentAlert) {
          this.resolveAlert(state.currentAlert.id);
          state.currentAlert = undefined;
        }
      }
    }
  }

  /**
   * 조건 평가
   */
  private evaluateCondition(condition: AlertCondition, value: number): boolean {
    switch (condition.operator) {
      case 'gt':
        return value > condition.threshold;
      case 'gte':
        return value >= condition.threshold;
      case 'lt':
        return value < condition.threshold;
      case 'lte':
        return value <= condition.threshold;
      case 'eq':
        return value === condition.threshold;
      case 'ne':
        return value !== condition.threshold;
      default:
        return false;
    }
  }

  /**
   * 알림 발동
   */
  private async fireAlert(
    rule: AlertRule,
    currentValue: number,
    state: AlertState
  ): Promise<void> {
    const alertId = uuidv4();

    const alert: AlertInstance = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      metricName: rule.metricName,
      currentValue,
      threshold: rule.condition.threshold,
      status: 'firing',
      firedAt: new Date(),
      message: this.formatAlertMessage(rule, currentValue),
    };

    this.activeAlerts.set(alertId, alert);
    state.currentAlert = alert;
    state.lastAlertAt = new Date();

    this.emit('alert:fired', alert);
    systemLogger.warn('Alert fired', {
      alertId,
      ruleName: rule.name,
      currentValue,
      threshold: rule.condition.threshold,
    });

    // 알림 발송
    await this.sendNotifications(alert, rule.channels);
  }

  /**
   * 알림 해결
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.activeAlerts.delete(alertId);
    this.addToHistory(alert);

    this.emit('alert:resolved', alert);
    systemLogger.info('Alert resolved', {
      alertId,
      ruleName: alert.ruleName,
    });
  }

  /**
   * 알림 확인
   */
  acknowledgeAlert(alertId: string, userId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    this.emit('alert:acknowledged', alert);
    systemLogger.info('Alert acknowledged', {
      alertId,
      userId,
    });
  }

  /**
   * 알림 메시지 포맷
   */
  private formatAlertMessage(rule: AlertRule, value: number): string {
    const operatorText = {
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
      eq: '==',
      ne: '!=',
    };

    return `[${rule.severity.toUpperCase()}] ${rule.name}: ${rule.metricName} = ${value} (${operatorText[rule.condition.operator]} ${rule.condition.threshold})`;
  }

  /**
   * 알림 발송
   */
  private async sendNotifications(
    alert: AlertInstance,
    channels: AlertChannel[]
  ): Promise<void> {
    const priority = this.severityToPriority(alert.severity);

    for (const channel of channels) {
      try {
        await this.notificationService.sendByPriority({
          priority,
          recipientGroup: channel.target,
          title: `[Alert] ${alert.ruleName}`,
          content: alert.message || '',
        });
      } catch (error) {
        systemLogger.error('Failed to send alert notification', error as Error, {
          alertId: alert.id,
          channel: channel.type,
        });
      }
    }
  }

  /**
   * 심각도를 알림 우선순위로 변환
   */
  private severityToPriority(severity: AlertSeverity): NotificationPriority {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return NotificationPriority.URGENT;
      case AlertSeverity.ERROR:
        return NotificationPriority.HIGH;
      case AlertSeverity.WARNING:
        return NotificationPriority.MEDIUM;
      case AlertSeverity.INFO:
      default:
        return NotificationPriority.LOW;
    }
  }

  /**
   * 이력에 추가
   */
  private addToHistory(alert: AlertInstance): void {
    this.history.push(alert);

    if (this.history.length > this.config.historySize) {
      this.history.shift();
    }
  }

  // ===========================================================================
  // 조회 메서드
  // ===========================================================================

  /**
   * 활성 알림 목록 조회
   */
  getActiveAlerts(): AlertInstance[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 활성 알림 조회
   */
  getAlert(alertId: string): AlertInstance | undefined {
    return this.activeAlerts.get(alertId);
  }

  /**
   * 알림 이력 조회
   */
  getHistory(limit?: number): AlertInstance[] {
    const result = [...this.history].reverse();
    return limit ? result.slice(0, limit) : result;
  }

  /**
   * 심각도별 활성 알림 수
   */
  countBySeverity(): Record<AlertSeverity, number> {
    const counts: Record<AlertSeverity, number> = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.ERROR]: 0,
      [AlertSeverity.CRITICAL]: 0,
    };

    for (const alert of this.activeAlerts.values()) {
      counts[alert.severity]++;
    }

    return counts;
  }

  /**
   * 규칙 상태 조회
   */
  getRuleState(ruleId: string): AlertState | undefined {
    return this.states.get(ruleId);
  }

  /**
   * 모든 활성 알림 해결
   */
  resolveAllAlerts(): void {
    for (const alertId of this.activeAlerts.keys()) {
      this.resolveAlert(alertId);
    }
  }
}

// 싱글톤 인스턴스 export
export const alertManager = new AlertManager();
export default AlertManager;

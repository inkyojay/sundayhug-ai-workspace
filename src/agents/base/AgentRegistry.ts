/**
 * 썬데이허그 AI 에이전트 시스템 - AgentRegistry
 *
 * 에이전트 등록, 조회, 상태 관리 및 에이전트 간 통신을 담당합니다.
 * 싱글톤 패턴으로 구현되어 전역에서 접근 가능합니다.
 */

import { EventEmitter } from 'events';
import {
  AgentStatus,
  AgentConfig,
  TaskPayload,
  TaskResult,
  TaskStatus,
} from '../../types';
import { BaseAgent } from './BaseAgent';
import { SubAgent } from './SubAgent';
import { systemLogger } from '../../utils/logger';

/**
 * 에이전트 메타데이터
 */
export interface AgentMetadata {
  /** 에이전트 ID */
  id: string;
  /** 에이전트 이름 */
  name: string;
  /** 에이전트 타입 */
  type: 'base' | 'sub' | 'orchestrator';
  /** 현재 상태 */
  status: AgentStatus;
  /** 등록 시간 */
  registeredAt: Date;
  /** 마지막 활동 시간 */
  lastActiveAt?: Date;
  /** 실행 횟수 */
  executionCount: number;
  /** 성공 횟수 */
  successCount: number;
  /** 실패 횟수 */
  failureCount: number;
  /** 부모 에이전트 ID (SubAgent인 경우) */
  parentId?: string;
  /** 자식 에이전트 ID 목록 */
  childIds: string[];
  /** 태그 */
  tags: string[];
}

/**
 * 에이전트 간 메시지
 */
export interface AgentMessage {
  /** 메시지 ID */
  id: string;
  /** 발신자 에이전트 ID */
  from: string;
  /** 수신자 에이전트 ID */
  to: string;
  /** 메시지 타입 */
  type: 'task' | 'result' | 'notification' | 'command';
  /** 페이로드 */
  payload: unknown;
  /** 생성 시간 */
  createdAt: Date;
  /** 만료 시간 */
  expiresAt?: Date;
}

/**
 * 에이전트 필터 옵션
 */
export interface AgentFilterOptions {
  /** 상태 필터 */
  status?: AgentStatus | AgentStatus[];
  /** 타입 필터 */
  type?: AgentMetadata['type'];
  /** 태그 필터 (하나라도 일치) */
  tags?: string[];
  /** 부모 ID 필터 */
  parentId?: string;
  /** 활성 에이전트만 */
  activeOnly?: boolean;
}

/**
 * AgentRegistry 클래스
 * 에이전트 등록, 조회, 상태 관리 및 에이전트 간 통신을 담당합니다.
 */
class AgentRegistry extends EventEmitter {
  /** 에이전트 맵 */
  private agents: Map<string, BaseAgent> = new Map();

  /** 에이전트 메타데이터 맵 */
  private metadata: Map<string, AgentMetadata> = new Map();

  /** 메시지 큐 */
  private messageQueue: Map<string, AgentMessage[]> = new Map();

  /** 싱글톤 인스턴스 */
  private static instance: AgentRegistry | null = null;

  /**
   * 생성자 (private - 싱글톤)
   */
  private constructor() {
    super();
    this.setupEventHandlers();
    systemLogger.info('AgentRegistry initialized');
  }

  /**
   * 싱글톤 인스턴스 가져오기
   * @returns AgentRegistry 인스턴스
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * 이벤트 핸들러 설정
   */
  private setupEventHandlers(): void {
    // 에이전트 상태 변경 이벤트 처리
    this.on('agent:status_changed', (agentId: string, status: AgentStatus) => {
      this.updateAgentMetadata(agentId, { status, lastActiveAt: new Date() });
    });

    // 에이전트 실행 완료 이벤트 처리
    this.on('agent:execution_completed', (agentId: string, success: boolean) => {
      const meta = this.metadata.get(agentId);
      if (meta) {
        this.updateAgentMetadata(agentId, {
          executionCount: meta.executionCount + 1,
          successCount: success ? meta.successCount + 1 : meta.successCount,
          failureCount: success ? meta.failureCount : meta.failureCount + 1,
          lastActiveAt: new Date(),
        });
      }
    });
  }

  // ===========================================================================
  // 에이전트 등록/해제 메서드
  // ===========================================================================

  /**
   * 에이전트 등록
   * @param agent - 등록할 에이전트
   * @param options - 등록 옵션
   */
  register(
    agent: BaseAgent,
    options?: {
      type?: AgentMetadata['type'];
      parentId?: string;
      tags?: string[];
    }
  ): void {
    const agentId = agent.getId();
    const config = agent.getConfig();

    // 이미 등록된 에이전트인지 확인
    if (this.agents.has(agentId)) {
      systemLogger.warn(`Agent already registered: ${agentId}`);
      return;
    }

    // 에이전트 등록
    this.agents.set(agentId, agent);

    // 메타데이터 생성
    const meta: AgentMetadata = {
      id: agentId,
      name: config.name,
      type: options?.type || (agent instanceof SubAgent ? 'sub' : 'base'),
      status: agent.getStatus(),
      registeredAt: new Date(),
      executionCount: 0,
      successCount: 0,
      failureCount: 0,
      parentId: options?.parentId,
      childIds: [],
      tags: options?.tags || [],
    };

    this.metadata.set(agentId, meta);

    // 부모 에이전트의 childIds 업데이트
    if (options?.parentId) {
      const parentMeta = this.metadata.get(options.parentId);
      if (parentMeta) {
        parentMeta.childIds.push(agentId);
        this.metadata.set(options.parentId, parentMeta);
      }
    }

    // 메시지 큐 초기화
    this.messageQueue.set(agentId, []);

    // 에이전트 이벤트 리스너 등록
    this.attachAgentListeners(agent);

    systemLogger.info(`Agent registered: ${config.name}`, {
      id: agentId,
      type: meta.type,
      parentId: options?.parentId,
    });

    this.emit('agent:registered', agentId, meta);
  }

  /**
   * 에이전트 해제
   * @param agentId - 에이전트 ID
   */
  async unregister(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    const meta = this.metadata.get(agentId);

    if (!agent || !meta) {
      systemLogger.warn(`Agent not found for unregister: ${agentId}`);
      return;
    }

    // 자식 에이전트 먼저 해제
    for (const childId of meta.childIds) {
      await this.unregister(childId);
    }

    // 에이전트 정지
    await agent.stop();

    // 부모의 childIds에서 제거
    if (meta.parentId) {
      const parentMeta = this.metadata.get(meta.parentId);
      if (parentMeta) {
        parentMeta.childIds = parentMeta.childIds.filter((id) => id !== agentId);
        this.metadata.set(meta.parentId, parentMeta);
      }
    }

    // 등록 해제
    this.agents.delete(agentId);
    this.metadata.delete(agentId);
    this.messageQueue.delete(agentId);

    systemLogger.info(`Agent unregistered: ${agentId}`);
    this.emit('agent:unregistered', agentId);
  }

  /**
   * 에이전트 이벤트 리스너 연결
   * @param agent - 에이전트
   */
  private attachAgentListeners(agent: BaseAgent): void {
    agent.on('started', () => {
      this.emit('agent:status_changed', agent.getId(), AgentStatus.RUNNING);
    });

    agent.on('completed', () => {
      this.emit('agent:status_changed', agent.getId(), AgentStatus.IDLE);
      this.emit('agent:execution_completed', agent.getId(), true);
    });

    agent.on('failed', () => {
      this.emit('agent:status_changed', agent.getId(), AgentStatus.ERROR);
      this.emit('agent:execution_completed', agent.getId(), false);
    });

    agent.on('paused', () => {
      this.emit('agent:status_changed', agent.getId(), AgentStatus.PAUSED);
    });

    agent.on('resumed', () => {
      this.emit('agent:status_changed', agent.getId(), AgentStatus.RUNNING);
    });
  }

  // ===========================================================================
  // 에이전트 조회 메서드
  // ===========================================================================

  /**
   * 에이전트 조회
   * @param agentId - 에이전트 ID
   * @returns 에이전트 인스턴스
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * 에이전트 메타데이터 조회
   * @param agentId - 에이전트 ID
   * @returns 에이전트 메타데이터
   */
  getAgentMetadata(agentId: string): AgentMetadata | undefined {
    return this.metadata.get(agentId);
  }

  /**
   * 모든 에이전트 조회
   * @returns 에이전트 맵
   */
  getAllAgents(): Map<string, BaseAgent> {
    return new Map(this.agents);
  }

  /**
   * 모든 에이전트 메타데이터 조회
   * @returns 메타데이터 맵
   */
  getAllMetadata(): Map<string, AgentMetadata> {
    return new Map(this.metadata);
  }

  /**
   * 필터 조건에 맞는 에이전트 조회
   * @param options - 필터 옵션
   * @returns 필터된 에이전트 배열
   */
  findAgents(options: AgentFilterOptions): BaseAgent[] {
    const results: BaseAgent[] = [];

    for (const [agentId, agent] of this.agents) {
      const meta = this.metadata.get(agentId);
      if (!meta) continue;

      // 상태 필터
      if (options.status) {
        const statuses = Array.isArray(options.status) ? options.status : [options.status];
        if (!statuses.includes(meta.status)) continue;
      }

      // 타입 필터
      if (options.type && meta.type !== options.type) continue;

      // 태그 필터
      if (options.tags && options.tags.length > 0) {
        const hasMatchingTag = options.tags.some((tag) => meta.tags.includes(tag));
        if (!hasMatchingTag) continue;
      }

      // 부모 ID 필터
      if (options.parentId !== undefined && meta.parentId !== options.parentId) continue;

      // 활성 에이전트만
      if (options.activeOnly && !agent.getConfig().enabled) continue;

      results.push(agent);
    }

    return results;
  }

  /**
   * 이름으로 에이전트 조회
   * @param name - 에이전트 이름
   * @returns 에이전트 인스턴스
   */
  findByName(name: string): BaseAgent | undefined {
    for (const [, agent] of this.agents) {
      if (agent.getName() === name) {
        return agent;
      }
    }
    return undefined;
  }

  /**
   * 특정 상태의 에이전트 수 조회
   * @param status - 상태
   * @returns 에이전트 수
   */
  countByStatus(status: AgentStatus): number {
    let count = 0;
    for (const meta of this.metadata.values()) {
      if (meta.status === status) count++;
    }
    return count;
  }

  // ===========================================================================
  // 에이전트 상태 관리 메서드
  // ===========================================================================

  /**
   * 에이전트 메타데이터 업데이트
   * @param agentId - 에이전트 ID
   * @param updates - 업데이트할 필드
   */
  private updateAgentMetadata(
    agentId: string,
    updates: Partial<AgentMetadata>
  ): void {
    const meta = this.metadata.get(agentId);
    if (meta) {
      this.metadata.set(agentId, { ...meta, ...updates });
    }
  }

  /**
   * 에이전트 상태 조회
   * @param agentId - 에이전트 ID
   * @returns 에이전트 상태
   */
  getAgentStatus(agentId: string): AgentStatus | undefined {
    return this.metadata.get(agentId)?.status;
  }

  /**
   * 에이전트 활성화
   * @param agentId - 에이전트 ID
   */
  enableAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.enable();
      systemLogger.info(`Agent enabled: ${agentId}`);
    }
  }

  /**
   * 에이전트 비활성화
   * @param agentId - 에이전트 ID
   */
  disableAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.disable();
      systemLogger.info(`Agent disabled: ${agentId}`);
    }
  }

  /**
   * 모든 에이전트 일시 정지
   */
  pauseAll(): void {
    for (const [agentId, agent] of this.agents) {
      if (agent.getStatus() === AgentStatus.RUNNING) {
        agent.pause();
        systemLogger.info(`Agent paused: ${agentId}`);
      }
    }
    this.emit('registry:paused_all');
  }

  /**
   * 모든 에이전트 재개
   */
  resumeAll(): void {
    for (const [agentId, agent] of this.agents) {
      if (agent.getStatus() === AgentStatus.PAUSED) {
        agent.resume();
        systemLogger.info(`Agent resumed: ${agentId}`);
      }
    }
    this.emit('registry:resumed_all');
  }

  /**
   * 모든 에이전트 정지
   */
  async stopAll(): Promise<void> {
    const stopPromises: Promise<void>[] = [];

    for (const [agentId, agent] of this.agents) {
      stopPromises.push(
        agent.stop().catch((error) => {
          systemLogger.error(`Failed to stop agent: ${agentId}`, error);
        })
      );
    }

    await Promise.all(stopPromises);
    this.emit('registry:stopped_all');
    systemLogger.info('All agents stopped');
  }

  // ===========================================================================
  // 에이전트 간 통신 메서드
  // ===========================================================================

  /**
   * 메시지 발송
   * @param message - 메시지
   */
  sendMessage(message: Omit<AgentMessage, 'id' | 'createdAt'>): void {
    const fullMessage: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    const queue = this.messageQueue.get(message.to);
    if (queue) {
      queue.push(fullMessage);
      this.emit('message:sent', fullMessage);
      systemLogger.debug('Message sent', {
        from: message.from,
        to: message.to,
        type: message.type,
      });
    } else {
      systemLogger.warn(`Message queue not found for agent: ${message.to}`);
    }
  }

  /**
   * 메시지 수신
   * @param agentId - 에이전트 ID
   * @returns 메시지 배열
   */
  receiveMessages(agentId: string): AgentMessage[] {
    const queue = this.messageQueue.get(agentId);
    if (!queue) return [];

    const messages = [...queue];
    queue.length = 0; // 큐 비우기

    return messages.filter((msg) => {
      // 만료된 메시지 제외
      if (msg.expiresAt && msg.expiresAt < new Date()) {
        return false;
      }
      return true;
    });
  }

  /**
   * 태스크 전송
   * @param fromAgentId - 발신자 에이전트 ID
   * @param toAgentId - 수신자 에이전트 ID
   * @param task - 태스크 페이로드
   */
  sendTask(fromAgentId: string, toAgentId: string, task: TaskPayload): void {
    this.sendMessage({
      from: fromAgentId,
      to: toAgentId,
      type: 'task',
      payload: task,
      expiresAt: task.expiresAt,
    });
  }

  /**
   * 태스크 결과 전송
   * @param fromAgentId - 발신자 에이전트 ID
   * @param toAgentId - 수신자 에이전트 ID
   * @param result - 태스크 결과
   */
  sendTaskResult(fromAgentId: string, toAgentId: string, result: TaskResult): void {
    this.sendMessage({
      from: fromAgentId,
      to: toAgentId,
      type: 'result',
      payload: result,
    });
  }

  /**
   * 브로드캐스트 메시지
   * @param fromAgentId - 발신자 에이전트 ID
   * @param type - 메시지 타입
   * @param payload - 페이로드
   * @param filter - 수신자 필터
   */
  broadcast(
    fromAgentId: string,
    type: AgentMessage['type'],
    payload: unknown,
    filter?: AgentFilterOptions
  ): void {
    const recipients = filter ? this.findAgents(filter) : Array.from(this.agents.values());

    for (const agent of recipients) {
      if (agent.getId() !== fromAgentId) {
        this.sendMessage({
          from: fromAgentId,
          to: agent.getId(),
          type,
          payload,
        });
      }
    }

    systemLogger.info(`Broadcast sent from ${fromAgentId}`, {
      type,
      recipientCount: recipients.length - 1,
    });
  }

  // ===========================================================================
  // 에이전트 실행 메서드
  // ===========================================================================

  /**
   * 에이전트 실행
   * @param agentId - 에이전트 ID
   * @param data - 실행 데이터
   * @returns 실행 결과
   */
  async executeAgent(
    agentId: string,
    data?: Record<string, unknown>
  ): Promise<TaskResult | null> {
    const agent = this.agents.get(agentId);

    if (!agent) {
      systemLogger.error(`Agent not found: ${agentId}`);
      return null;
    }

    try {
      const result = await agent.execute(data);
      return {
        taskId: crypto.randomUUID(),
        status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
        data: result.data,
        error: result.error,
        completedAt: new Date(),
        executionTime: result.executionTime,
      };
    } catch (error) {
      systemLogger.error(`Agent execution failed: ${agentId}`, error as Error);
      return {
        taskId: crypto.randomUUID(),
        status: TaskStatus.FAILED,
        error: {
          code: 'EXECUTION_ERROR',
          message: (error as Error).message,
          recoverable: false,
        },
        completedAt: new Date(),
        executionTime: 0,
      };
    }
  }

  /**
   * 여러 에이전트 병렬 실행
   * @param agentIds - 에이전트 ID 배열
   * @param data - 실행 데이터
   * @returns 실행 결과 배열
   */
  async executeAgentsParallel(
    agentIds: string[],
    data?: Record<string, unknown>
  ): Promise<Map<string, TaskResult | null>> {
    const results = new Map<string, TaskResult | null>();

    const executions = agentIds.map(async (agentId) => {
      const result = await this.executeAgent(agentId, data);
      results.set(agentId, result);
    });

    await Promise.all(executions);
    return results;
  }

  // ===========================================================================
  // 통계 및 헬스 체크
  // ===========================================================================

  /**
   * 레지스트리 통계 조회
   * @returns 통계 정보
   */
  getStatistics(): {
    totalAgents: number;
    byStatus: Record<AgentStatus, number>;
    byType: Record<string, number>;
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
  } {
    const byStatus: Record<AgentStatus, number> = {
      [AgentStatus.IDLE]: 0,
      [AgentStatus.RUNNING]: 0,
      [AgentStatus.PAUSED]: 0,
      [AgentStatus.ERROR]: 0,
      [AgentStatus.STOPPED]: 0,
    };

    const byType: Record<string, number> = {};
    let totalExecutions = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;

    for (const meta of this.metadata.values()) {
      byStatus[meta.status]++;
      byType[meta.type] = (byType[meta.type] || 0) + 1;
      totalExecutions += meta.executionCount;
      totalSuccesses += meta.successCount;
      totalFailures += meta.failureCount;
    }

    return {
      totalAgents: this.agents.size,
      byStatus,
      byType,
      totalExecutions,
      totalSuccesses,
      totalFailures,
    };
  }

  /**
   * 헬스 체크
   * @returns 헬스 상태
   */
  healthCheck(): {
    healthy: boolean;
    unhealthyAgents: string[];
    details: Record<string, { status: AgentStatus; lastActive?: Date }>;
  } {
    const unhealthyAgents: string[] = [];
    const details: Record<string, { status: AgentStatus; lastActive?: Date }> = {};

    for (const [agentId, meta] of this.metadata) {
      details[agentId] = {
        status: meta.status,
        lastActive: meta.lastActiveAt,
      };

      // 에러 상태이거나 오랫동안 활동이 없는 에이전트 확인
      if (meta.status === AgentStatus.ERROR) {
        unhealthyAgents.push(agentId);
      }
    }

    return {
      healthy: unhealthyAgents.length === 0,
      unhealthyAgents,
      details,
    };
  }

  /**
   * 레지스트리 정리
   */
  async cleanup(): Promise<void> {
    await this.stopAll();
    this.agents.clear();
    this.metadata.clear();
    this.messageQueue.clear();
    this.removeAllListeners();
    systemLogger.info('AgentRegistry cleanup completed');
  }
}

// 싱글톤 인스턴스 export
export const agentRegistry = AgentRegistry.getInstance();
export default agentRegistry;

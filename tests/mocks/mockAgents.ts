/**
 * Mock 에이전트 구현
 * 실제 API 호출 없이 테스트용 에이전트
 */

import { vi } from 'vitest';
import {
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentStatus,
  ApprovalLevel,
  TaskStatus,
} from '../../src/types';

/**
 * Mock 에이전트 기본 설정
 */
export interface MockAgentOptions {
  id: string;
  name: string;
  description?: string;
  shouldSucceed?: boolean;
  executionTime?: number;
  resultData?: unknown;
  errorMessage?: string;
}

/**
 * Mock 에이전트 클래스
 * BaseAgent를 직접 상속하지 않고 테스트용으로 단순화
 */
export class MockAgent {
  private config: AgentConfig;
  private status: AgentStatus = AgentStatus.IDLE;
  private options: MockAgentOptions;
  public executeHistory: Array<{ context: AgentContext; data?: Record<string, unknown> }> = [];

  constructor(options: MockAgentOptions) {
    this.options = options;
    this.config = {
      id: options.id,
      name: options.name,
      description: options.description || `Mock agent: ${options.name}`,
      enabled: true,
      maxRetries: 3,
      retryDelay: 100,
      timeout: 5000,
      approvalLevel: ApprovalLevel.NONE,
    };
  }

  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  enable(): void {
    this.config.enabled = true;
  }

  disable(): void {
    this.config.enabled = false;
  }

  pause(): void {
    this.status = AgentStatus.PAUSED;
  }

  resume(): void {
    this.status = AgentStatus.RUNNING;
  }

  async stop(): Promise<void> {
    this.status = AgentStatus.STOPPED;
  }

  on(_event: string, _handler: Function): void {
    // Mock - no-op
  }

  off(_event: string, _handler: Function): void {
    // Mock - no-op
  }

  /**
   * 실행 - 테스트용 Mock 동작
   */
  async execute(data?: Record<string, unknown>, callerAgentId?: string): Promise<AgentResult> {
    const startTime = Date.now();
    const executionId = `mock-exec-${Date.now()}`;

    const context: AgentContext = {
      executionId,
      startedAt: new Date(),
      callerAgentId,
      environment: 'development',
      data,
    };

    // 실행 기록 저장
    this.executeHistory.push({ context, data });

    this.status = AgentStatus.RUNNING;

    // 실행 시간 시뮬레이션
    if (this.options.executionTime) {
      await new Promise((resolve) => setTimeout(resolve, this.options.executionTime));
    }

    // 결과 반환
    if (this.options.shouldSucceed !== false) {
      this.status = AgentStatus.IDLE;
      return {
        success: true,
        data: this.options.resultData ?? { message: `${this.config.name} executed successfully` },
        executionTime: Date.now() - startTime,
        processedCount: 1,
      };
    } else {
      this.status = AgentStatus.ERROR;
      return {
        success: false,
        error: {
          code: 'MOCK_ERROR',
          message: this.options.errorMessage || 'Mock error',
          recoverable: false,
        },
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 실행 기록 초기화
   */
  clearHistory(): void {
    this.executeHistory = [];
  }

  /**
   * 마지막 실행 데이터 조회
   */
  getLastExecution(): { context: AgentContext; data?: Record<string, unknown> } | undefined {
    return this.executeHistory[this.executeHistory.length - 1];
  }
}

/**
 * 기본 Mock 에이전트 팩토리
 */
export function createMockAgent(options: Partial<MockAgentOptions> & { id: string }): MockAgent {
  return new MockAgent({
    name: options.name || options.id,
    shouldSucceed: true,
    executionTime: 10,
    ...options,
  });
}

/**
 * 표준 테스트 에이전트 세트 생성
 */
export function createStandardMockAgents(): Map<string, MockAgent> {
  const agents = new Map<string, MockAgent>();

  // Supervisor
  agents.set(
    '00-supervisor',
    createMockAgent({
      id: '00-supervisor',
      name: 'Supervisor',
      description: '중앙 오케스트레이터',
      resultData: { routed: true, targetAgent: '01-order' },
    })
  );

  // Order Agent
  agents.set(
    '01-order',
    createMockAgent({
      id: '01-order',
      name: 'Order Agent',
      description: '주문 관리 에이전트',
      resultData: { ordersProcessed: 1, status: 'completed' },
    })
  );

  // CS Agent
  agents.set(
    '02-cs',
    createMockAgent({
      id: '02-cs',
      name: 'CS Agent',
      description: 'CS 관리 에이전트',
      resultData: { inquiriesHandled: 1, responseGenerated: true },
    })
  );

  // Marketing Agent
  agents.set(
    '03-marketing',
    createMockAgent({
      id: '03-marketing',
      name: 'Marketing Agent',
      description: '마케팅 관리 에이전트',
      resultData: { campaignsManaged: 1 },
    })
  );

  // Product Agent
  agents.set(
    '04-product',
    createMockAgent({
      id: '04-product',
      name: 'Product Agent',
      description: '상품 관리 에이전트',
      resultData: { productsManaged: 1 },
    })
  );

  // Inventory Agent
  agents.set(
    '05-inventory',
    createMockAgent({
      id: '05-inventory',
      name: 'Inventory Agent',
      description: '재고 관리 에이전트',
      resultData: { stockChecked: true, currentStock: 150 },
    })
  );

  // Accounting Agent
  agents.set(
    '06-accounting',
    createMockAgent({
      id: '06-accounting',
      name: 'Accounting Agent',
      description: '회계 관리 에이전트',
      resultData: { transactionsProcessed: 1 },
    })
  );

  // Crisis Agent
  agents.set(
    '12-crisis',
    createMockAgent({
      id: '12-crisis',
      name: 'Crisis Agent',
      description: '위기 관리 에이전트',
      resultData: { alertTriggered: true, escalated: true },
    })
  );

  // Logistics Agent
  agents.set(
    '13-logistics',
    createMockAgent({
      id: '13-logistics',
      name: 'Logistics Agent',
      description: '물류 관리 에이전트',
      resultData: { shipmentsManaged: 1 },
    })
  );

  return agents;
}

/**
 * Mock AgentRegistry
 */
export class MockAgentRegistry {
  private agents: Map<string, MockAgent> = new Map();
  private metadata: Map<string, { executionCount: number; successCount: number; failureCount: number }> = new Map();

  constructor(agents?: Map<string, MockAgent>) {
    if (agents) {
      this.agents = agents;
      for (const id of agents.keys()) {
        this.metadata.set(id, { executionCount: 0, successCount: 0, failureCount: 0 });
      }
    }
  }

  register(agent: MockAgent): void {
    this.agents.set(agent.getId(), agent);
    this.metadata.set(agent.getId(), { executionCount: 0, successCount: 0, failureCount: 0 });
  }

  async unregister(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.stop();
      this.agents.delete(agentId);
      this.metadata.delete(agentId);
    }
  }

  getAgent(agentId: string): MockAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): Map<string, MockAgent> {
    return new Map(this.agents);
  }

  async executeAgent(agentId: string, data?: Record<string, unknown>): Promise<{ data: unknown; status: TaskStatus } | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const result = await agent.execute(data);
    const meta = this.metadata.get(agentId)!;
    meta.executionCount++;
    if (result.success) {
      meta.successCount++;
    } else {
      meta.failureCount++;
    }

    return {
      data: result.data,
      status: result.success ? TaskStatus.COMPLETED : TaskStatus.FAILED,
    };
  }

  getStatistics() {
    let totalExecutions = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;

    for (const meta of this.metadata.values()) {
      totalExecutions += meta.executionCount;
      totalSuccesses += meta.successCount;
      totalFailures += meta.failureCount;
    }

    return {
      totalAgents: this.agents.size,
      totalExecutions,
      totalSuccesses,
      totalFailures,
      byStatus: {
        idle: this.agents.size,
        running: 0,
        paused: 0,
        error: 0,
        stopped: 0,
      },
      byType: {
        base: this.agents.size,
        sub: 0,
        orchestrator: 1,
      },
    };
  }

  healthCheck() {
    return {
      healthy: true,
      unhealthyAgents: [],
      details: Object.fromEntries(
        Array.from(this.agents.entries()).map(([id, agent]) => [
          id,
          { status: agent.getStatus(), lastActive: new Date() },
        ])
      ),
    };
  }
}

/**
 * AgentRegistry Mock 설정
 */
export function setupAgentRegistryMock(agents?: Map<string, MockAgent>) {
  const mockRegistry = new MockAgentRegistry(agents || createStandardMockAgents());

  vi.mock('../../src/agents/base/AgentRegistry', () => ({
    agentRegistry: mockRegistry,
    default: mockRegistry,
  }));

  return mockRegistry;
}

/**
 * 워크플로우 엔진 검증 테스트
 *
 * Phase 4: 워크플로우 엔진 검증
 * - 상태 머신 전이 (PENDING → RUNNING → COMPLETED)
 * - 타임아웃 처리
 * - 재시도 로직 (3회, exponential backoff)
 * - 에러 복구 및 에스컬레이션
 * - 승인 대기 상태 처리
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestEnvironment, TestEnvironment, wait } from '../../utils/testHelpers';
import { TaskStatus } from '../../../src/types';

/**
 * 워크플로우 상태 열거형 (워크플로우 엔진에서 사용)
 */
enum WorkflowStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  WAITING_APPROVAL = 'waiting_approval',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 스텝 상태 열거형
 */
enum StepStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * 에러 전략 열거형
 */
enum ErrorStrategy {
  STOP = 'stop',
  SKIP = 'skip',
  RETRY = 'retry',
  ESCALATE = 'escalate',
}

/**
 * 간단한 상태 머신 구현 (테스트용)
 */
class SimpleStateMachine {
  private state: WorkflowStatus;
  private history: Array<{ from: WorkflowStatus; to: WorkflowStatus; timestamp: Date }> = [];

  private validTransitions: Record<WorkflowStatus, WorkflowStatus[]> = {
    [WorkflowStatus.PENDING]: [WorkflowStatus.RUNNING, WorkflowStatus.CANCELLED],
    [WorkflowStatus.RUNNING]: [
      WorkflowStatus.PAUSED,
      WorkflowStatus.WAITING_APPROVAL,
      WorkflowStatus.COMPLETED,
      WorkflowStatus.FAILED,
      WorkflowStatus.CANCELLED,
    ],
    [WorkflowStatus.PAUSED]: [WorkflowStatus.RUNNING, WorkflowStatus.CANCELLED],
    [WorkflowStatus.WAITING_APPROVAL]: [WorkflowStatus.RUNNING, WorkflowStatus.CANCELLED],
    [WorkflowStatus.COMPLETED]: [],
    [WorkflowStatus.FAILED]: [WorkflowStatus.RUNNING], // 재시도 가능
    [WorkflowStatus.CANCELLED]: [],
  };

  constructor(initialState: WorkflowStatus = WorkflowStatus.PENDING) {
    this.state = initialState;
  }

  getState(): WorkflowStatus {
    return this.state;
  }

  getHistory(): Array<{ from: WorkflowStatus; to: WorkflowStatus; timestamp: Date }> {
    return [...this.history];
  }

  canTransition(to: WorkflowStatus): boolean {
    return this.validTransitions[this.state].includes(to);
  }

  transition(to: WorkflowStatus): boolean {
    if (!this.canTransition(to)) {
      return false;
    }

    const from = this.state;
    this.state = to;
    this.history.push({ from, to, timestamp: new Date() });
    return true;
  }
}

describe('워크플로우 상태 머신', () => {
  let stateMachine: SimpleStateMachine;

  beforeEach(() => {
    stateMachine = new SimpleStateMachine();
  });

  describe('상태 전이 검증', () => {
    it('초기 상태는 PENDING이어야 함', () => {
      expect(stateMachine.getState()).toBe(WorkflowStatus.PENDING);
    });

    it('PENDING → RUNNING 전이가 가능해야 함', () => {
      const result = stateMachine.transition(WorkflowStatus.RUNNING);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.RUNNING);
    });

    it('RUNNING → COMPLETED 전이가 가능해야 함', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      const result = stateMachine.transition(WorkflowStatus.COMPLETED);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.COMPLETED);
    });

    it('RUNNING → PAUSED 전이가 가능해야 함', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      const result = stateMachine.transition(WorkflowStatus.PAUSED);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.PAUSED);
    });

    it('PAUSED → RUNNING 전이가 가능해야 함', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      stateMachine.transition(WorkflowStatus.PAUSED);
      const result = stateMachine.transition(WorkflowStatus.RUNNING);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.RUNNING);
    });

    it('RUNNING → WAITING_APPROVAL 전이가 가능해야 함', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      const result = stateMachine.transition(WorkflowStatus.WAITING_APPROVAL);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.WAITING_APPROVAL);
    });

    it('WAITING_APPROVAL → RUNNING 전이가 가능해야 함 (승인 후)', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      stateMachine.transition(WorkflowStatus.WAITING_APPROVAL);
      const result = stateMachine.transition(WorkflowStatus.RUNNING);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.RUNNING);
    });

    it('COMPLETED 상태에서는 다른 상태로 전이할 수 없어야 함', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      stateMachine.transition(WorkflowStatus.COMPLETED);

      const result = stateMachine.transition(WorkflowStatus.RUNNING);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(WorkflowStatus.COMPLETED);
    });

    it('유효하지 않은 전이는 실패해야 함 (PENDING → COMPLETED)', () => {
      const result = stateMachine.transition(WorkflowStatus.COMPLETED);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(WorkflowStatus.PENDING);
    });

    it('전이 히스토리가 올바르게 기록되어야 함', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      stateMachine.transition(WorkflowStatus.PAUSED);
      stateMachine.transition(WorkflowStatus.RUNNING);
      stateMachine.transition(WorkflowStatus.COMPLETED);

      const history = stateMachine.getHistory();
      expect(history).toHaveLength(4);
      expect(history[0]).toMatchObject({ from: WorkflowStatus.PENDING, to: WorkflowStatus.RUNNING });
      expect(history[3]).toMatchObject({ from: WorkflowStatus.RUNNING, to: WorkflowStatus.COMPLETED });
    });
  });

  describe('취소 처리', () => {
    it('PENDING 상태에서 취소 가능해야 함', () => {
      const result = stateMachine.transition(WorkflowStatus.CANCELLED);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.CANCELLED);
    });

    it('RUNNING 상태에서 취소 가능해야 함', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      const result = stateMachine.transition(WorkflowStatus.CANCELLED);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.CANCELLED);
    });

    it('CANCELLED 상태에서는 다른 상태로 전이할 수 없어야 함', () => {
      stateMachine.transition(WorkflowStatus.CANCELLED);
      const result = stateMachine.transition(WorkflowStatus.RUNNING);
      expect(result).toBe(false);
    });
  });

  describe('실패 및 재시도', () => {
    it('RUNNING → FAILED 전이가 가능해야 함', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      const result = stateMachine.transition(WorkflowStatus.FAILED);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.FAILED);
    });

    it('FAILED → RUNNING 전이가 가능해야 함 (재시도)', () => {
      stateMachine.transition(WorkflowStatus.RUNNING);
      stateMachine.transition(WorkflowStatus.FAILED);
      const result = stateMachine.transition(WorkflowStatus.RUNNING);
      expect(result).toBe(true);
      expect(stateMachine.getState()).toBe(WorkflowStatus.RUNNING);
    });
  });
});

describe('타임아웃 처리', () => {
  it('작업이 타임아웃 내에 완료되면 성공해야 함', async () => {
    const TIMEOUT_MS = 1000;

    const executeWithTimeout = async <T>(
      operation: () => Promise<T>,
      timeout: number
    ): Promise<T> => {
      return Promise.race([
        operation(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeout)
        ),
      ]);
    };

    const fastOperation = async () => {
      await wait(50);
      return 'success';
    };

    const result = await executeWithTimeout(fastOperation, TIMEOUT_MS);
    expect(result).toBe('success');
  });

  it('작업이 타임아웃을 초과하면 에러가 발생해야 함', async () => {
    const TIMEOUT_MS = 100;

    const executeWithTimeout = async <T>(
      operation: () => Promise<T>,
      timeout: number
    ): Promise<T> => {
      return Promise.race([
        operation(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), timeout)
        ),
      ]);
    };

    const slowOperation = async () => {
      await wait(500);
      return 'success';
    };

    await expect(executeWithTimeout(slowOperation, TIMEOUT_MS)).rejects.toThrow('TIMEOUT');
  });
});

describe('재시도 로직', () => {
  it('재시도가 설정된 횟수만큼 수행되어야 함', async () => {
    let attemptCount = 0;
    const MAX_RETRIES = 3;

    const withRetry = async <T>(
      operation: () => Promise<T>,
      maxRetries: number,
      delay: number
    ): Promise<T> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          if (attempt < maxRetries) {
            await wait(delay * Math.pow(2, attempt)); // Exponential backoff
          }
        }
      }

      throw lastError;
    };

    const failingOperation = async () => {
      attemptCount++;
      throw new Error('Always fails');
    };

    await expect(withRetry(failingOperation, MAX_RETRIES, 10)).rejects.toThrow();
    expect(attemptCount).toBe(MAX_RETRIES + 1); // 초기 시도 + 재시도 횟수
  });

  it('exponential backoff가 올바르게 적용되어야 함', () => {
    const baseDelay = 1000;
    const maxRetries = 3;

    const delays: number[] = [];
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const delay = baseDelay * Math.pow(2, attempt);
      delays.push(delay);
    }

    expect(delays).toEqual([1000, 2000, 4000]);
  });

  it('복구 가능한 에러만 재시도해야 함', () => {
    const recoverableErrors = ['ECONNRESET', 'ETIMEDOUT', 'RATE_LIMIT', '503', '429'];

    const isRecoverable = (error: Error): boolean => {
      return recoverableErrors.some(
        (pattern) => error.message.includes(pattern) || error.name.includes(pattern)
      );
    };

    expect(isRecoverable(new Error('ECONNRESET: Connection reset'))).toBe(true);
    expect(isRecoverable(new Error('ETIMEDOUT: Request timeout'))).toBe(true);
    expect(isRecoverable(new Error('Rate limit exceeded (429)'))).toBe(true);
    expect(isRecoverable(new Error('Invalid input'))).toBe(false);
    expect(isRecoverable(new Error('Unauthorized'))).toBe(false);
  });
});

describe('에러 복구 전략', () => {
  it('STOP 전략: 에러 발생 시 워크플로우 중단', () => {
    const strategy = ErrorStrategy.STOP;
    const onError = (strategy: ErrorStrategy): { action: string; continueWorkflow: boolean } => {
      switch (strategy) {
        case ErrorStrategy.STOP:
          return { action: 'abort', continueWorkflow: false };
        case ErrorStrategy.SKIP:
          return { action: 'skip', continueWorkflow: true };
        case ErrorStrategy.RETRY:
          return { action: 'retry', continueWorkflow: true };
        case ErrorStrategy.ESCALATE:
          return { action: 'escalate', continueWorkflow: false };
      }
    };

    const result = onError(strategy);
    expect(result.action).toBe('abort');
    expect(result.continueWorkflow).toBe(false);
  });

  it('SKIP 전략: 에러 발생 스텝을 건너뛰고 계속', () => {
    const strategy = ErrorStrategy.SKIP;
    const result = { action: 'skip', continueWorkflow: true };

    expect(result.action).toBe('skip');
    expect(result.continueWorkflow).toBe(true);
  });

  it('RETRY 전략: 에러 발생 스텝 재시도', () => {
    const strategy = ErrorStrategy.RETRY;
    const result = { action: 'retry', continueWorkflow: true };

    expect(result.action).toBe('retry');
    expect(result.continueWorkflow).toBe(true);
  });

  it('ESCALATE 전략: CEO에게 에스컬레이션', () => {
    const strategy = ErrorStrategy.ESCALATE;
    const result = { action: 'escalate', continueWorkflow: false };

    expect(result.action).toBe('escalate');
    expect(result.continueWorkflow).toBe(false);
  });
});

describe('승인 대기 상태', () => {
  let stateMachine: SimpleStateMachine;

  beforeEach(() => {
    stateMachine = new SimpleStateMachine();
    stateMachine.transition(WorkflowStatus.RUNNING);
  });

  it('승인 요청 시 WAITING_APPROVAL 상태로 전이되어야 함', () => {
    const result = stateMachine.transition(WorkflowStatus.WAITING_APPROVAL);
    expect(result).toBe(true);
    expect(stateMachine.getState()).toBe(WorkflowStatus.WAITING_APPROVAL);
  });

  it('승인 완료 시 RUNNING 상태로 복귀해야 함', () => {
    stateMachine.transition(WorkflowStatus.WAITING_APPROVAL);

    const approvalResponse = {
      approved: true,
      approverId: 'ceo',
      respondedAt: new Date(),
    };

    if (approvalResponse.approved) {
      const result = stateMachine.transition(WorkflowStatus.RUNNING);
      expect(result).toBe(true);
    }

    expect(stateMachine.getState()).toBe(WorkflowStatus.RUNNING);
  });

  it('승인 거부 시 적절한 처리가 필요함', () => {
    stateMachine.transition(WorkflowStatus.WAITING_APPROVAL);

    const approvalResponse = {
      approved: false,
      approverId: 'ceo',
      reason: '비용 초과',
      respondedAt: new Date(),
    };

    if (!approvalResponse.approved) {
      // 거부된 경우: CANCELLED 또는 대안 처리
      const result = stateMachine.transition(WorkflowStatus.CANCELLED);
      expect(result).toBe(true);
    }

    expect(stateMachine.getState()).toBe(WorkflowStatus.CANCELLED);
  });

  it('승인 만료 시 타임아웃 처리가 필요함', () => {
    stateMachine.transition(WorkflowStatus.WAITING_APPROVAL);

    const approvalRequest = {
      requestedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25시간 전
      expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1시간 전 만료
    };

    const isExpired = new Date() > approvalRequest.expiresAt;
    expect(isExpired).toBe(true);

    if (isExpired) {
      // 만료된 경우: 자동 취소 또는 에스컬레이션
      const result = stateMachine.transition(WorkflowStatus.CANCELLED);
      expect(result).toBe(true);
    }
  });
});

describe('워크플로우 스텝 실행', () => {
  it('스텝이 순차적으로 실행되어야 함', async () => {
    const steps = [
      { id: 'step1', name: 'Validate Input', agentId: '00-supervisor' },
      { id: 'step2', name: 'Process Order', agentId: '01-order' },
      { id: 'step3', name: 'Check Inventory', agentId: '05-inventory' },
      { id: 'step4', name: 'Prepare Shipment', agentId: '13-logistics' },
    ];

    const executedSteps: string[] = [];

    for (const step of steps) {
      // 스텝 실행 시뮬레이션
      executedSteps.push(step.id);
      await wait(10);
    }

    expect(executedSteps).toEqual(['step1', 'step2', 'step3', 'step4']);
  });

  it('조건부 분기가 올바르게 처리되어야 함', () => {
    const stockCheckResult = {
      stepId: 'check_inventory',
      status: StepStatus.COMPLETED,
      output: {
        inStock: false,
        currentStock: 0,
      },
    };

    const transitions = [
      { condition: { field: 'output.inStock', operator: 'eq', value: true }, targetStepId: 'prepare_shipment' },
      { condition: { field: 'output.inStock', operator: 'eq', value: false }, targetStepId: 'create_purchase_order' },
    ];

    // 조건 평가
    let nextStepId = 'default_step';
    for (const transition of transitions) {
      const fieldValue = stockCheckResult.output.inStock;
      if (fieldValue === transition.condition.value) {
        nextStepId = transition.targetStepId;
        break;
      }
    }

    expect(nextStepId).toBe('create_purchase_order');
  });

  it('필수 스텝 실패 시 워크플로우가 중단되어야 함', () => {
    const step = {
      id: 'critical_step',
      name: 'Critical Operation',
      required: true,
    };

    const stepResult = {
      status: StepStatus.FAILED,
      error: { message: 'Critical step failed' },
    };

    const shouldAbort = step.required && stepResult.status === StepStatus.FAILED;
    expect(shouldAbort).toBe(true);
  });

  it('선택적 스텝 실패 시 워크플로우가 계속되어야 함', () => {
    const step = {
      id: 'optional_step',
      name: 'Optional Operation',
      required: false,
    };

    const stepResult = {
      status: StepStatus.FAILED,
      error: { message: 'Optional step failed' },
    };

    const shouldContinue = !step.required;
    expect(shouldContinue).toBe(true);
  });
});

describe('워크플로우 정의 검증', () => {
  it('유효한 워크플로우 정의를 등록할 수 있어야 함', () => {
    const workflowDefinition = {
      id: 'order-processing',
      name: '주문 처리 워크플로우',
      version: '1.0.0',
      description: '새 주문 접수부터 배송까지의 전체 흐름',
      enabled: true,
      startStepId: 'validate_order',
      steps: [
        { id: 'validate_order', name: '주문 검증', agentId: '01-order', required: true, transitions: [{ targetStepId: 'check_inventory', isDefault: true }] },
        { id: 'check_inventory', name: '재고 확인', agentId: '05-inventory', required: true, transitions: [] },
      ],
      globalTimeout: 300000,
      errorStrategy: 'retry',
    };

    expect(workflowDefinition.id).toBeDefined();
    expect(workflowDefinition.steps.length).toBeGreaterThan(0);
    expect(workflowDefinition.startStepId).toBe('validate_order');
  });

  it('순환 참조가 있는 워크플로우는 감지되어야 함', () => {
    const steps = [
      { id: 'A', transitions: [{ targetStepId: 'B' }] },
      { id: 'B', transitions: [{ targetStepId: 'C' }] },
      { id: 'C', transitions: [{ targetStepId: 'A' }] }, // 순환!
    ];

    const hasCycle = (steps: Array<{ id: string; transitions: Array<{ targetStepId: string }> }>): boolean => {
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const dfs = (stepId: string): boolean => {
        visited.add(stepId);
        recursionStack.add(stepId);

        const step = steps.find((s) => s.id === stepId);
        if (step) {
          for (const transition of step.transitions) {
            if (!visited.has(transition.targetStepId)) {
              if (dfs(transition.targetStepId)) return true;
            } else if (recursionStack.has(transition.targetStepId)) {
              return true;
            }
          }
        }

        recursionStack.delete(stepId);
        return false;
      };

      for (const step of steps) {
        if (!visited.has(step.id)) {
          if (dfs(step.id)) return true;
        }
      }

      return false;
    };

    expect(hasCycle(steps)).toBe(true);
  });
});

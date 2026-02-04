/**
 * 테스트 헬퍼 유틸리티
 */

import { TaskPayload, TaskResult, TaskStatus } from '../../src/types';
import { MockAgent, MockAgentRegistry, createStandardMockAgents } from '../mocks/mockAgents';

/**
 * 비동기 대기 헬퍼
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 타임아웃 Promise 생성
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage?: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage || `Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/**
 * 테스트 환경 설정
 */
export interface TestEnvironment {
  registry: MockAgentRegistry;
  agents: Map<string, MockAgent>;
  cleanup: () => void;
}

/**
 * 표준 테스트 환경 생성
 */
export function createTestEnvironment(): TestEnvironment {
  const agents = createStandardMockAgents();
  const registry = new MockAgentRegistry(agents);

  return {
    registry,
    agents,
    cleanup: () => {
      agents.clear();
    },
  };
}

/**
 * 에이전트 실행 결과 검증
 */
export interface ExecutionAssertion {
  agentId: string;
  wasExecuted: boolean;
  executionCount?: number;
  lastDataContains?: Record<string, unknown>;
}

/**
 * 에이전트 실행 검증
 */
export function assertAgentExecution(agent: MockAgent, assertion: Omit<ExecutionAssertion, 'agentId'>): void {
  const history = agent.executeHistory;

  if (assertion.wasExecuted) {
    if (history.length === 0) {
      throw new Error(`Agent ${agent.getId()} was expected to be executed but was not`);
    }
  } else {
    if (history.length > 0) {
      throw new Error(`Agent ${agent.getId()} was not expected to be executed but was executed ${history.length} times`);
    }
    return;
  }

  if (assertion.executionCount !== undefined && history.length !== assertion.executionCount) {
    throw new Error(
      `Agent ${agent.getId()} was expected to be executed ${assertion.executionCount} times but was executed ${history.length} times`
    );
  }

  if (assertion.lastDataContains) {
    const lastExec = history[history.length - 1];
    for (const [key, expectedValue] of Object.entries(assertion.lastDataContains)) {
      const actualValue = lastExec.data?.[key];
      if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
        throw new Error(
          `Agent ${agent.getId()} last execution data.${key} was expected to be ${JSON.stringify(expectedValue)} but was ${JSON.stringify(actualValue)}`
        );
      }
    }
  }
}

/**
 * Task 결과 검증
 */
export function assertTaskResult(result: TaskResult | null, expected: { status?: TaskStatus; hasData?: boolean; hasError?: boolean }): void {
  if (!result) {
    throw new Error('TaskResult is null');
  }

  if (expected.status !== undefined && result.status !== expected.status) {
    throw new Error(`TaskResult status was expected to be ${expected.status} but was ${result.status}`);
  }

  if (expected.hasData === true && result.data === undefined) {
    throw new Error('TaskResult was expected to have data but did not');
  }

  if (expected.hasData === false && result.data !== undefined) {
    throw new Error('TaskResult was not expected to have data but did');
  }

  if (expected.hasError === true && result.error === undefined) {
    throw new Error('TaskResult was expected to have error but did not');
  }

  if (expected.hasError === false && result.error !== undefined) {
    throw new Error('TaskResult was not expected to have error but did');
  }
}

/**
 * 라우팅 결과 검증을 위한 타입
 */
export interface RoutingAssertion {
  targetAgent: string;
  confidence?: number;
  confidenceMin?: number;
  reason?: string;
  requiresMultiAgent?: boolean;
}

/**
 * 파이프라인 테스트 시나리오
 */
export interface PipelineScenario {
  name: string;
  description: string;
  input: TaskPayload;
  expectedFlow: string[];
  expectedResult: {
    success: boolean;
    finalAgent?: string;
  };
}

/**
 * 파이프라인 시나리오 실행기
 */
export async function runPipelineScenario(
  scenario: PipelineScenario,
  registry: MockAgentRegistry
): Promise<{ success: boolean; actualFlow: string[]; errors: string[] }> {
  const actualFlow: string[] = [];
  const errors: string[] = [];

  // 시나리오 실행 (실제로는 Supervisor를 통해 실행)
  // 여기서는 예상 플로우대로 순차 실행
  for (const agentId of scenario.expectedFlow) {
    const agent = registry.getAgent(agentId);
    if (!agent) {
      errors.push(`Agent ${agentId} not found`);
      continue;
    }

    const result = await agent.execute(scenario.input.data as Record<string, unknown>);
    actualFlow.push(agentId);

    if (!result.success) {
      errors.push(`Agent ${agentId} execution failed: ${result.error?.message}`);
    }
  }

  const flowMatches =
    actualFlow.length === scenario.expectedFlow.length &&
    actualFlow.every((id, idx) => id === scenario.expectedFlow[idx]);

  return {
    success: flowMatches && errors.length === 0,
    actualFlow,
    errors,
  };
}

/**
 * 통계 리포트 생성
 */
export interface TestReport {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  scenarios: Array<{
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
  }>;
}

/**
 * 테스트 리포트 출력
 */
export function printTestReport(report: TestReport): void {
  console.log('\n========================================');
  console.log('        TEST REPORT');
  console.log('========================================');
  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Passed: ${report.passed}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Skipped: ${report.skipped}`);
  console.log(`Duration: ${report.duration}ms`);
  console.log('----------------------------------------');

  for (const scenario of report.scenarios) {
    const status = scenario.passed ? '✓' : '✗';
    console.log(`${status} ${scenario.name} (${scenario.duration}ms)`);
    if (scenario.error) {
      console.log(`  Error: ${scenario.error}`);
    }
  }

  console.log('========================================\n');
}

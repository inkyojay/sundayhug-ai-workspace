/**
 * 썬데이허그 AI 에이전트 시스템 - Supervisor 모듈
 *
 * Supervisor 시스템의 모든 컴포넌트를 내보냅니다.
 * 이 모듈은 에이전트의 "교통 경찰" 역할을 수행합니다.
 *
 * @module supervisor
 *
 * @example
 * ```typescript
 * import {
 *   getSupervisorAgent,
 *   getIntentClassifier,
 *   getAgentRouter,
 *   getWorkflowOrchestrator,
 * } from './agents/supervisor';
 *
 * // Supervisor를 통한 요청 처리
 * const supervisor = getSupervisorAgent();
 * const response = await supervisor.processRequest({
 *   requestId: 'req-001',
 *   rawInput: '주문번호 ORD-2024-001 환불해줘',
 *   normalizedInput: '주문번호 ord-2024-001 환불해줘',
 *   timestamp: new Date(),
 * });
 *
 * // 직접 의도 분류
 * const classifier = getIntentClassifier();
 * const intent = await classifier.classify('재고 확인해줘');
 *
 * // 직접 라우팅
 * const router = getAgentRouter();
 * const decision = await router.route(request);
 *
 * // 워크플로우 실행
 * const orchestrator = getWorkflowOrchestrator();
 * const result = await orchestrator.execute('workflow-full-refund', { orderId: 'ORD-001' });
 * ```
 */

// =============================================================================
// 타입 내보내기
// =============================================================================

export * from './types';

// =============================================================================
// 클래스 내보내기
// =============================================================================

export { IntentClassifier, getIntentClassifier } from './IntentClassifier';
export { AgentRouter, getAgentRouter } from './AgentRouter';
export { WorkflowOrchestrator, getWorkflowOrchestrator } from './WorkflowOrchestrator';
export { SupervisorAgent, getSupervisorAgent } from './SupervisorAgent';

// =============================================================================
// 키워드 매핑 내보내기
// =============================================================================

export {
  AGENT_REGISTRY,
  KEYWORD_AGENT_MAP,
  AMBIGUOUS_KEYWORD_RULES,
  PRIORITY_BOOST_KEYWORDS,
  PREDEFINED_WORKFLOWS,
  getAgentInfo,
  getAgentsByCategory,
  getAgentsByKeyword,
  getAmbiguousRule,
  getWorkflowByTrigger,
  getPriorityBoost,
} from './KeywordMapping';

// =============================================================================
// 워크플로우 이벤트 타입 내보내기
// =============================================================================

export type {
  WorkflowEventType,
  WorkflowEventListener,
} from './WorkflowOrchestrator';

// =============================================================================
// 기본 내보내기
// =============================================================================

import { getSupervisorAgent } from './SupervisorAgent';
export default getSupervisorAgent;

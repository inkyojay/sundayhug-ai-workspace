/**
 * 썬데이허그 AI 에이전트 시스템 - 상태 머신
 *
 * LANE 5: Integration & Orchestration
 * 워크플로우 상태 전이를 관리하는 상태 머신입니다.
 */

import { EventEmitter } from 'events';
import {
  StateMachineState,
  StateTransitionRule,
  WorkflowContext,
  WorkflowStatus,
  StepStatus,
} from './types';
import { systemLogger } from '../utils/logger';

/**
 * 상태 머신 설정
 */
interface StateMachineConfig {
  /** 초기 상태 */
  initialState: string;
  /** 상태 전이 규칙 */
  transitions: StateTransitionRule[];
  /** 최종 상태 목록 */
  finalStates: string[];
}

/**
 * 상태 머신 이벤트
 */
interface StateMachineEvent {
  /** 이벤트 타입 */
  type: string;
  /** 이전 상태 */
  from: string;
  /** 새 상태 */
  to: string;
  /** 타임스탬프 */
  timestamp: Date;
  /** 컨텍스트 */
  context?: WorkflowContext;
}

/**
 * 상태 머신 클래스
 * FSM(Finite State Machine) 패턴을 구현합니다.
 */
export class StateMachine extends EventEmitter {
  private config: StateMachineConfig;
  private state: StateMachineState;
  private history: StateMachineState[] = [];
  private context: WorkflowContext;

  /**
   * StateMachine 생성자
   * @param config - 상태 머신 설정
   * @param context - 초기 컨텍스트
   */
  constructor(config: StateMachineConfig, context: WorkflowContext) {
    super();
    this.config = config;
    this.context = context;
    this.state = {
      current: config.initialState,
      enteredAt: new Date(),
    };

    systemLogger.debug('StateMachine initialized', {
      initialState: config.initialState,
      transitionCount: config.transitions.length,
    });
  }

  /**
   * 현재 상태 조회
   * @returns 현재 상태
   */
  getCurrentState(): string {
    return this.state.current;
  }

  /**
   * 현재 상태 정보 조회
   * @returns 상태 정보
   */
  getStateInfo(): StateMachineState {
    return { ...this.state };
  }

  /**
   * 상태 이력 조회
   * @returns 상태 이력 배열
   */
  getHistory(): StateMachineState[] {
    return [...this.history];
  }

  /**
   * 컨텍스트 조회
   * @returns 현재 컨텍스트
   */
  getContext(): WorkflowContext {
    return { ...this.context };
  }

  /**
   * 컨텍스트 업데이트
   * @param updates - 업데이트할 컨텍스트 필드
   */
  updateContext(updates: Partial<WorkflowContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * 이벤트 발생 및 상태 전이
   * @param event - 발생한 이벤트
   * @returns 전이 성공 여부
   */
  async transition(event: string): Promise<boolean> {
    const currentState = this.state.current;

    // 현재 상태에서 해당 이벤트로 전이 가능한 규칙 찾기
    const rule = this.findTransitionRule(currentState, event);

    if (!rule) {
      systemLogger.warn('No transition rule found', {
        currentState,
        event,
      });
      return false;
    }

    // 가드 조건 확인
    if (rule.guard && !rule.guard(this.context)) {
      systemLogger.debug('Transition guard blocked', {
        currentState,
        event,
        targetState: rule.to,
      });
      return false;
    }

    // 상태 전이 실행
    const previousState = this.state.current;

    // 이전 상태 저장
    this.history.push({ ...this.state });

    // 새 상태로 전이
    this.state = {
      current: rule.to,
      previous: previousState,
      enteredAt: new Date(),
    };

    // 전이 액션 실행
    if (rule.action) {
      try {
        await rule.action(this.context);
      } catch (error) {
        systemLogger.error('Transition action failed', error as Error, {
          from: previousState,
          to: rule.to,
          event,
        });
      }
    }

    // 이벤트 발생
    const machineEvent: StateMachineEvent = {
      type: event,
      from: previousState,
      to: rule.to,
      timestamp: new Date(),
      context: this.context,
    };

    this.emit('transition', machineEvent);
    this.emit(`state:${rule.to}`, machineEvent);

    systemLogger.debug('State transition completed', {
      from: previousState,
      to: rule.to,
      event,
    });

    // 최종 상태 도달 확인
    if (this.isFinalState()) {
      this.emit('final', machineEvent);
    }

    return true;
  }

  /**
   * 전이 규칙 찾기
   * @param currentState - 현재 상태
   * @param event - 이벤트
   * @returns 전이 규칙 또는 undefined
   */
  private findTransitionRule(
    currentState: string,
    event: string
  ): StateTransitionRule | undefined {
    return this.config.transitions.find((rule) => {
      const fromStates = Array.isArray(rule.from) ? rule.from : [rule.from];
      return fromStates.includes(currentState) && rule.event === event;
    });
  }

  /**
   * 특정 이벤트로 전이 가능 여부 확인
   * @param event - 이벤트
   * @returns 전이 가능 여부
   */
  canTransition(event: string): boolean {
    const rule = this.findTransitionRule(this.state.current, event);
    if (!rule) return false;
    if (rule.guard && !rule.guard(this.context)) return false;
    return true;
  }

  /**
   * 가능한 이벤트 목록 조회
   * @returns 현재 상태에서 가능한 이벤트 목록
   */
  getAvailableEvents(): string[] {
    return this.config.transitions
      .filter((rule) => {
        const fromStates = Array.isArray(rule.from) ? rule.from : [rule.from];
        return fromStates.includes(this.state.current);
      })
      .filter((rule) => !rule.guard || rule.guard(this.context))
      .map((rule) => rule.event);
  }

  /**
   * 최종 상태 여부 확인
   * @returns 최종 상태 여부
   */
  isFinalState(): boolean {
    return this.config.finalStates.includes(this.state.current);
  }

  /**
   * 상태 머신 리셋
   */
  reset(): void {
    this.history.push({ ...this.state });
    this.state = {
      current: this.config.initialState,
      enteredAt: new Date(),
    };
    this.emit('reset', { previousState: this.state.previous });
  }

  /**
   * 상태 직접 설정 (복구 용도)
   * @param state - 설정할 상태
   */
  setState(state: string): void {
    if (!this.isValidState(state)) {
      throw new Error(`Invalid state: ${state}`);
    }

    this.history.push({ ...this.state });
    this.state = {
      current: state,
      previous: this.state.current,
      enteredAt: new Date(),
    };
  }

  /**
   * 유효한 상태인지 확인
   * @param state - 확인할 상태
   * @returns 유효 여부
   */
  private isValidState(state: string): boolean {
    const allStates = new Set<string>();
    allStates.add(this.config.initialState);
    this.config.finalStates.forEach((s) => allStates.add(s));
    this.config.transitions.forEach((rule) => {
      const fromStates = Array.isArray(rule.from) ? rule.from : [rule.from];
      fromStates.forEach((s) => allStates.add(s));
      allStates.add(rule.to);
    });
    return allStates.has(state);
  }
}

/**
 * 워크플로우 상태 머신 생성
 * 워크플로우 실행을 위한 기본 상태 머신을 생성합니다.
 */
export function createWorkflowStateMachine(context: WorkflowContext): StateMachine {
  const config: StateMachineConfig = {
    initialState: WorkflowStatus.PENDING,
    transitions: [
      // 시작 전이
      {
        from: WorkflowStatus.PENDING,
        to: WorkflowStatus.RUNNING,
        event: 'start',
      },
      // 일시 정지
      {
        from: WorkflowStatus.RUNNING,
        to: WorkflowStatus.PAUSED,
        event: 'pause',
      },
      // 재개
      {
        from: WorkflowStatus.PAUSED,
        to: WorkflowStatus.RUNNING,
        event: 'resume',
      },
      // 완료
      {
        from: WorkflowStatus.RUNNING,
        to: WorkflowStatus.COMPLETED,
        event: 'complete',
      },
      // 실패
      {
        from: [WorkflowStatus.RUNNING, WorkflowStatus.PAUSED],
        to: WorkflowStatus.FAILED,
        event: 'fail',
      },
      // 취소
      {
        from: [WorkflowStatus.PENDING, WorkflowStatus.RUNNING, WorkflowStatus.PAUSED],
        to: WorkflowStatus.CANCELLED,
        event: 'cancel',
      },
      // 승인 대기
      {
        from: WorkflowStatus.RUNNING,
        to: WorkflowStatus.WAITING_APPROVAL,
        event: 'wait_approval',
      },
      // 승인 후 재개
      {
        from: WorkflowStatus.WAITING_APPROVAL,
        to: WorkflowStatus.RUNNING,
        event: 'approval_received',
      },
      // 승인 거부
      {
        from: WorkflowStatus.WAITING_APPROVAL,
        to: WorkflowStatus.CANCELLED,
        event: 'approval_rejected',
      },
    ],
    finalStates: [
      WorkflowStatus.COMPLETED,
      WorkflowStatus.FAILED,
      WorkflowStatus.CANCELLED,
    ],
  };

  return new StateMachine(config, context);
}

/**
 * 스텝 상태 머신 생성
 * 개별 스텝 실행을 위한 상태 머신을 생성합니다.
 */
export function createStepStateMachine(context: WorkflowContext): StateMachine {
  const config: StateMachineConfig = {
    initialState: StepStatus.PENDING,
    transitions: [
      // 시작
      {
        from: StepStatus.PENDING,
        to: StepStatus.RUNNING,
        event: 'start',
      },
      // 대기 (외부 의존성)
      {
        from: StepStatus.RUNNING,
        to: StepStatus.WAITING,
        event: 'wait',
      },
      // 대기 후 재개
      {
        from: StepStatus.WAITING,
        to: StepStatus.RUNNING,
        event: 'resume',
      },
      // 완료
      {
        from: [StepStatus.RUNNING, StepStatus.WAITING],
        to: StepStatus.COMPLETED,
        event: 'complete',
      },
      // 실패
      {
        from: [StepStatus.RUNNING, StepStatus.WAITING],
        to: StepStatus.FAILED,
        event: 'fail',
      },
      // 스킵
      {
        from: [StepStatus.PENDING, StepStatus.RUNNING],
        to: StepStatus.SKIPPED,
        event: 'skip',
      },
      // 재시도
      {
        from: StepStatus.FAILED,
        to: StepStatus.PENDING,
        event: 'retry',
      },
    ],
    finalStates: [StepStatus.COMPLETED, StepStatus.FAILED, StepStatus.SKIPPED],
  };

  return new StateMachine(config, context);
}

export default StateMachine;

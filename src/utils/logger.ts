/**
 * 썬데이허그 AI 에이전트 시스템 - 로깅 유틸리티
 *
 * 에이전트별 로그 포맷과 다양한 로그 레벨을 지원합니다.
 * 구조화된 로깅을 통해 디버깅과 모니터링을 용이하게 합니다.
 */

import { LogLevel, LogEntry } from '../types';

/**
 * 로거 설정 인터페이스
 */
interface LoggerConfig {
  /** 최소 로그 레벨 */
  minLevel: LogLevel;
  /** 콘솔 출력 여부 */
  console: boolean;
  /** 파일 출력 여부 */
  file: boolean;
  /** 파일 경로 */
  filePath?: string;
  /** JSON 형식 출력 여부 */
  json: boolean;
  /** 색상 사용 여부 (콘솔) */
  colors: boolean;
}

/**
 * 기본 로거 설정
 */
const defaultConfig: LoggerConfig = {
  minLevel: LogLevel.INFO,
  console: true,
  file: false,
  json: process.env.NODE_ENV === 'production',
  colors: process.env.NODE_ENV !== 'production',
};

/**
 * 로그 레벨 우선순위 맵
 */
const levelPriority: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4,
};

/**
 * 콘솔 색상 코드
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  // 로그 레벨별 색상
  debug: '\x1b[36m',   // cyan
  info: '\x1b[32m',    // green
  warn: '\x1b[33m',    // yellow
  error: '\x1b[31m',   // red
  fatal: '\x1b[35m',   // magenta
  // 추가 색상
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

/**
 * 레벨별 색상 매핑
 */
const levelColors: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: colors.debug,
  [LogLevel.INFO]: colors.info,
  [LogLevel.WARN]: colors.warn,
  [LogLevel.ERROR]: colors.error,
  [LogLevel.FATAL]: colors.fatal,
};

/**
 * 레벨별 라벨
 */
const levelLabels: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO ',
  [LogLevel.WARN]: 'WARN ',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

/**
 * 로거 클래스
 * 에이전트별 로깅을 담당합니다.
 */
export class Logger {
  private agentId: string;
  private executionId?: string;
  private config: LoggerConfig;

  /**
   * Logger 생성자
   * @param agentId - 에이전트 ID
   * @param config - 로거 설정 (선택)
   */
  constructor(agentId: string, config?: Partial<LoggerConfig>) {
    this.agentId = agentId;
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 실행 ID 설정
   * @param executionId - 실행 ID
   */
  setExecutionId(executionId: string): void {
    this.executionId = executionId;
  }

  /**
   * 실행 ID 초기화
   */
  clearExecutionId(): void {
    this.executionId = undefined;
  }

  /**
   * 로그 레벨 설정
   * @param level - 최소 로그 레벨
   */
  setLevel(level: LogLevel): void {
    this.config.minLevel = level;
  }

  /**
   * 로그 출력 가능 여부 확인
   * @param level - 확인할 로그 레벨
   * @returns 출력 가능 여부
   */
  private shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[this.config.minLevel];
  }

  /**
   * 타임스탬프 포맷
   * @param date - 날짜
   * @returns 포맷된 타임스탬프
   */
  private formatTimestamp(date: Date): string {
    return date.toISOString();
  }

  /**
   * 로그 엔트리 생성
   * @param level - 로그 레벨
   * @param message - 메시지
   * @param data - 추가 데이터
   * @param error - 에러 객체
   * @returns 로그 엔트리
   */
  private createEntry(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      agentId: this.agentId,
      message,
    };

    if (this.executionId) {
      entry.executionId = this.executionId;
    }

    if (data) {
      entry.data = data;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  /**
   * 콘솔용 포맷 (색상 지원)
   * @param entry - 로그 엔트리
   * @returns 포맷된 문자열
   */
  private formatConsole(entry: LogEntry): string {
    const { timestamp, level, agentId, executionId, message, data, error } = entry;
    const useColors = this.config.colors;

    const timestampStr = this.formatTimestamp(timestamp);
    const levelLabel = levelLabels[level];
    const levelColor = levelColors[level];

    let output = '';

    if (useColors) {
      output += `${colors.gray}${timestampStr}${colors.reset} `;
      output += `${levelColor}${colors.bright}[${levelLabel}]${colors.reset} `;
      output += `${colors.bright}[${agentId}]${colors.reset}`;
      if (executionId) {
        output += `${colors.dim}(${executionId.slice(0, 8)})${colors.reset}`;
      }
      output += ` ${message}`;
    } else {
      output += `${timestampStr} [${levelLabel}] [${agentId}]`;
      if (executionId) {
        output += `(${executionId.slice(0, 8)})`;
      }
      output += ` ${message}`;
    }

    if (data && Object.keys(data).length > 0) {
      output += `\n  ${useColors ? colors.dim : ''}Data: ${JSON.stringify(data, null, 2).replace(/\n/g, '\n  ')}${useColors ? colors.reset : ''}`;
    }

    if (error) {
      output += `\n  ${useColors ? colors.error : ''}Error: ${error.name}: ${error.message}${useColors ? colors.reset : ''}`;
      if (error.stack) {
        output += `\n  ${useColors ? colors.dim : ''}${error.stack}${useColors ? colors.reset : ''}`;
      }
    }

    return output;
  }

  /**
   * JSON 포맷
   * @param entry - 로그 엔트리
   * @returns JSON 문자열
   */
  private formatJson(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  /**
   * 로그 출력
   * @param entry - 로그 엔트리
   */
  private output(entry: LogEntry): void {
    if (this.config.console) {
      const formatted = this.config.json
        ? this.formatJson(entry)
        : this.formatConsole(entry);

      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formatted);
          break;
      }
    }

    // TODO: 파일 출력 구현
    // if (this.config.file && this.config.filePath) {
    //   // 비동기 파일 쓰기 구현
    // }
  }

  /**
   * 로그 기록
   * @param level - 로그 레벨
   * @param message - 메시지
   * @param data - 추가 데이터
   * @param error - 에러 객체
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createEntry(level, message, data, error);
    this.output(entry);
  }

  /**
   * DEBUG 레벨 로그
   * @param message - 메시지
   * @param data - 추가 데이터
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * INFO 레벨 로그
   * @param message - 메시지
   * @param data - 추가 데이터
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * WARN 레벨 로그
   * @param message - 메시지
   * @param data - 추가 데이터
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * ERROR 레벨 로그
   * @param message - 메시지
   * @param error - 에러 객체
   * @param data - 추가 데이터
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  /**
   * FATAL 레벨 로그
   * @param message - 메시지
   * @param error - 에러 객체
   * @param data - 추가 데이터
   */
  fatal(message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, data, error);
  }

  /**
   * 작업 시작 로그
   * @param taskName - 작업 이름
   * @param data - 추가 데이터
   */
  taskStart(taskName: string, data?: Record<string, unknown>): void {
    this.info(`Task started: ${taskName}`, { task: taskName, ...data });
  }

  /**
   * 작업 완료 로그
   * @param taskName - 작업 이름
   * @param duration - 소요 시간 (밀리초)
   * @param data - 추가 데이터
   */
  taskComplete(taskName: string, duration: number, data?: Record<string, unknown>): void {
    this.info(`Task completed: ${taskName}`, {
      task: taskName,
      duration: `${duration}ms`,
      ...data,
    });
  }

  /**
   * 작업 실패 로그
   * @param taskName - 작업 이름
   * @param error - 에러 객체
   * @param data - 추가 데이터
   */
  taskFailed(taskName: string, error: Error, data?: Record<string, unknown>): void {
    this.error(`Task failed: ${taskName}`, error, { task: taskName, ...data });
  }

  /**
   * 성능 측정 시작
   * @param label - 측정 라벨
   * @returns 종료 함수
   */
  startTimer(label: string): () => void {
    const start = Date.now();
    this.debug(`Timer started: ${label}`);

    return () => {
      const duration = Date.now() - start;
      this.debug(`Timer ended: ${label}`, { duration: `${duration}ms` });
    };
  }

  /**
   * 자식 로거 생성
   * 같은 설정을 공유하는 새로운 로거를 생성합니다.
   * @param subAgentId - 하위 에이전트 ID
   * @returns 새로운 Logger 인스턴스
   */
  child(subAgentId: string): Logger {
    const childLogger = new Logger(`${this.agentId}/${subAgentId}`, this.config);
    if (this.executionId) {
      childLogger.setExecutionId(this.executionId);
    }
    return childLogger;
  }
}

/**
 * 전역 로거 팩토리
 * 에이전트 ID로 로거를 생성합니다.
 * @param agentId - 에이전트 ID
 * @param config - 로거 설정
 * @returns Logger 인스턴스
 */
export function createLogger(agentId: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger(agentId, config);
}

/**
 * 시스템 로거 (전역 사용)
 */
export const systemLogger = new Logger('system', {
  minLevel: process.env.LOG_LEVEL as LogLevel || LogLevel.INFO,
});

export default Logger;

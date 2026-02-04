/**
 * 썬데이허그 AI 에이전트 시스템 - Supabase 유틸리티
 *
 * Supabase 클라이언트 초기화 및 공통 쿼리 헬퍼를 제공합니다.
 * 모든 에이전트가 일관된 방식으로 데이터베이스에 접근할 수 있도록 합니다.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PaginationParams, PaginatedResult, DateRange } from '../types';
import { systemLogger } from './logger';

/**
 * Supabase 설정 인터페이스
 */
interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

/**
 * 환경 변수에서 Supabase 설정 로드
 */
function loadConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
    );
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}

/**
 * Supabase 클라이언트 싱글톤
 */
let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

/**
 * Supabase 클라이언트 초기화 (일반 권한)
 * @returns Supabase 클라이언트
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const config = loadConfig();
    supabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });
    systemLogger.info('Supabase client initialized');
  }
  return supabaseClient;
}

/**
 * Supabase Admin 클라이언트 초기화 (서비스 역할 권한)
 * 주의: RLS를 우회하므로 신중하게 사용해야 합니다.
 * @returns Supabase Admin 클라이언트
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    const config = loadConfig();

    if (!config.serviceRoleKey) {
      throw new Error(
        'Admin client requires SUPABASE_SERVICE_ROLE_KEY environment variable.'
      );
    }

    supabaseAdminClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    systemLogger.info('Supabase admin client initialized');
  }
  return supabaseAdminClient;
}

/**
 * 쿼리 결과 타입
 */
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
  count?: number;
}

/**
 * 데이터베이스 헬퍼 클래스
 * 공통 쿼리 패턴을 추상화합니다.
 */
export class DatabaseHelper {
  private client: SupabaseClient;
  private tableName: string;

  /**
   * DatabaseHelper 생성자
   * @param tableName - 테이블 이름
   * @param useAdmin - Admin 클라이언트 사용 여부
   */
  constructor(tableName: string, useAdmin: boolean = false) {
    this.client = useAdmin ? getSupabaseAdminClient() : getSupabaseClient();
    this.tableName = tableName;
  }

  /**
   * 단일 레코드 조회
   * @param id - 레코드 ID
   * @param columns - 조회할 컬럼 (기본값: 모든 컬럼)
   * @returns 조회 결과
   */
  async findById<T>(id: string, columns: string = '*'): Promise<QueryResult<T>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(columns)
        .eq('id', id)
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 조건에 맞는 레코드 조회
   * @param conditions - 조회 조건 (key-value 쌍)
   * @param columns - 조회할 컬럼
   * @returns 조회 결과 배열
   */
  async findByConditions<T>(
    conditions: Record<string, unknown>,
    columns: string = '*'
  ): Promise<QueryResult<T[]>> {
    try {
      let query = this.client.from(this.tableName).select(columns);

      // 조건 적용
      for (const [key, value] of Object.entries(conditions)) {
        if (value === null) {
          query = query.is(key, null);
        } else if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T[], error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 페이지네이션이 적용된 조회
   * @param params - 페이지네이션 파라미터
   * @param conditions - 조회 조건
   * @param columns - 조회할 컬럼
   * @returns 페이지네이션 결과
   */
  async findWithPagination<T>(
    params: PaginationParams,
    conditions?: Record<string, unknown>,
    columns: string = '*'
  ): Promise<QueryResult<PaginatedResult<T>>> {
    try {
      const { page, limit, sortBy, sortOrder } = params;
      const offset = (page - 1) * limit;

      // 전체 개수 조회를 위한 쿼리
      let countQuery = this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // 데이터 조회를 위한 쿼리
      let dataQuery = this.client
        .from(this.tableName)
        .select(columns)
        .range(offset, offset + limit - 1);

      // 조건 적용
      if (conditions) {
        for (const [key, value] of Object.entries(conditions)) {
          if (value === null) {
            countQuery = countQuery.is(key, null);
            dataQuery = dataQuery.is(key, null);
          } else if (Array.isArray(value)) {
            countQuery = countQuery.in(key, value);
            dataQuery = dataQuery.in(key, value);
          } else {
            countQuery = countQuery.eq(key, value);
            dataQuery = dataQuery.eq(key, value);
          }
        }
      }

      // 정렬 적용
      if (sortBy) {
        dataQuery = dataQuery.order(sortBy, {
          ascending: sortOrder !== 'desc',
        });
      }

      // 병렬 실행
      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) {
        return { data: null, error: new Error(countResult.error.message) };
      }

      if (dataResult.error) {
        return { data: null, error: new Error(dataResult.error.message) };
      }

      const total = countResult.count || 0;
      const totalPages = Math.ceil(total / limit);

      const result: PaginatedResult<T> = {
        items: dataResult.data as T[],
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return { data: result, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 날짜 범위로 조회
   * @param dateField - 날짜 필드명
   * @param range - 날짜 범위
   * @param columns - 조회할 컬럼
   * @returns 조회 결과
   */
  async findByDateRange<T>(
    dateField: string,
    range: DateRange,
    columns: string = '*'
  ): Promise<QueryResult<T[]>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .select(columns)
        .gte(dateField, range.start.toISOString())
        .lte(dateField, range.end.toISOString())
        .order(dateField, { ascending: false });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T[], error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 레코드 생성
   * @param data - 생성할 데이터
   * @returns 생성된 레코드
   */
  async create<T>(data: Partial<T>): Promise<QueryResult<T>> {
    try {
      const { data: result, error } = await this.client
        .from(this.tableName)
        .insert(data)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: result as T, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 여러 레코드 일괄 생성
   * @param items - 생성할 데이터 배열
   * @returns 생성된 레코드 배열
   */
  async createMany<T>(items: Partial<T>[]): Promise<QueryResult<T[]>> {
    try {
      const { data, error } = await this.client
        .from(this.tableName)
        .insert(items)
        .select();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T[], error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 레코드 업데이트
   * @param id - 레코드 ID
   * @param data - 업데이트할 데이터
   * @returns 업데이트된 레코드
   */
  async update<T>(id: string, data: Partial<T>): Promise<QueryResult<T>> {
    try {
      const { data: result, error } = await this.client
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: result as T, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 조건에 맞는 레코드 일괄 업데이트
   * @param conditions - 조건
   * @param data - 업데이트할 데이터
   * @returns 업데이트된 레코드 배열
   */
  async updateByConditions<T>(
    conditions: Record<string, unknown>,
    data: Partial<T>
  ): Promise<QueryResult<T[]>> {
    try {
      let query = this.client.from(this.tableName).update(data);

      for (const [key, value] of Object.entries(conditions)) {
        if (value === null) {
          query = query.is(key, null);
        } else if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }

      const { data: result, error } = await query.select();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: result as T[], error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 레코드 삭제 (소프트 삭제)
   * @param id - 레코드 ID
   * @returns 삭제 결과
   */
  async softDelete(id: string): Promise<QueryResult<boolean>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 레코드 삭제 (하드 삭제)
   * 주의: 이 작업은 되돌릴 수 없습니다.
   * @param id - 레코드 ID
   * @returns 삭제 결과
   */
  async hardDelete(id: string): Promise<QueryResult<boolean>> {
    try {
      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: true, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * Upsert (있으면 업데이트, 없으면 생성)
   * @param data - 데이터
   * @param conflictColumns - 충돌 확인 컬럼
   * @returns Upsert 결과
   */
  async upsert<T>(
    data: Partial<T>,
    conflictColumns?: string[]
  ): Promise<QueryResult<T>> {
    try {
      const options = conflictColumns
        ? { onConflict: conflictColumns.join(',') }
        : undefined;

      const { data: result, error } = await this.client
        .from(this.tableName)
        .upsert(data, options)
        .select()
        .single();

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: result as T, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * 레코드 개수 조회
   * @param conditions - 조회 조건
   * @returns 개수
   */
  async count(conditions?: Record<string, unknown>): Promise<QueryResult<number>> {
    try {
      let query = this.client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (conditions) {
        for (const [key, value] of Object.entries(conditions)) {
          if (value === null) {
            query = query.is(key, null);
          } else if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }
      }

      const { count, error } = await query;

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: count || 0, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * Raw SQL 쿼리 실행 (RPC 사용)
   * @param functionName - Supabase 함수 이름
   * @param params - 함수 파라미터
   * @returns 실행 결과
   */
  async rpc<T>(
    functionName: string,
    params?: Record<string, unknown>
  ): Promise<QueryResult<T>> {
    try {
      const { data, error } = await this.client.rpc(functionName, params);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: data as T, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }
}

/**
 * 테이블별 헬퍼 팩토리
 * @param tableName - 테이블 이름
 * @param useAdmin - Admin 클라이언트 사용 여부
 * @returns DatabaseHelper 인스턴스
 */
export function createDatabaseHelper(
  tableName: string,
  useAdmin: boolean = false
): DatabaseHelper {
  return new DatabaseHelper(tableName, useAdmin);
}

/**
 * 트랜잭션 실행 헬퍼
 * Supabase는 네이티브 트랜잭션을 지원하지 않으므로,
 * RPC를 통한 트랜잭션 처리가 필요합니다.
 * @param operations - 실행할 작업들
 * @returns 트랜잭션 결과
 */
export async function executeTransaction<T>(
  operations: () => Promise<T>
): Promise<QueryResult<T>> {
  try {
    // Supabase에서는 트랜잭션을 위해 DB 함수를 사용해야 합니다.
    // 여기서는 간단한 try-catch 래퍼를 제공합니다.
    const result = await operations();
    return { data: result, error: null };
  } catch (err) {
    systemLogger.error('Transaction failed', err as Error);
    return { data: null, error: err as Error };
  }
}

export default {
  getSupabaseClient,
  getSupabaseAdminClient,
  createDatabaseHelper,
  executeTransaction,
  DatabaseHelper,
};

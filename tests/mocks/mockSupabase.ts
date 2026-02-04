/**
 * Supabase Mock
 * 데이터베이스 연동을 Mock으로 대체
 */

import { vi } from 'vitest';

interface MockRecord {
  id: string;
  [key: string]: unknown;
}

/**
 * Mock 데이터 저장소
 */
class MockDataStore {
  private tables: Map<string, Map<string, MockRecord>> = new Map();

  /**
   * 테이블 가져오기 (없으면 생성)
   */
  private getTable(tableName: string): Map<string, MockRecord> {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }
    return this.tables.get(tableName)!;
  }

  /**
   * 레코드 삽입
   */
  insert(tableName: string, record: MockRecord): MockRecord {
    const table = this.getTable(tableName);
    const id = record.id || `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newRecord = { ...record, id, created_at: new Date().toISOString() };
    table.set(id, newRecord);
    return newRecord;
  }

  /**
   * 레코드 조회 (ID)
   */
  findById(tableName: string, id: string): MockRecord | null {
    const table = this.getTable(tableName);
    return table.get(id) || null;
  }

  /**
   * 레코드 조회 (조건)
   */
  findByConditions(tableName: string, conditions: Record<string, unknown>): MockRecord[] {
    const table = this.getTable(tableName);
    const results: MockRecord[] = [];

    for (const record of table.values()) {
      let matches = true;
      for (const [key, value] of Object.entries(conditions)) {
        if (record[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        results.push(record);
      }
    }

    return results;
  }

  /**
   * 모든 레코드 조회
   */
  findAll(tableName: string): MockRecord[] {
    const table = this.getTable(tableName);
    return Array.from(table.values());
  }

  /**
   * 레코드 업데이트
   */
  update(tableName: string, id: string, updates: Partial<MockRecord>): MockRecord | null {
    const table = this.getTable(tableName);
    const existing = table.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    table.set(id, updated);
    return updated;
  }

  /**
   * 레코드 삭제
   */
  delete(tableName: string, id: string): boolean {
    const table = this.getTable(tableName);
    return table.delete(id);
  }

  /**
   * 테이블 초기화
   */
  clearTable(tableName: string): void {
    this.tables.delete(tableName);
  }

  /**
   * 전체 초기화
   */
  clearAll(): void {
    this.tables.clear();
  }
}

// 싱글톤 인스턴스
export const mockDataStore = new MockDataStore();

/**
 * Supabase Query Builder Mock
 */
class MockQueryBuilder {
  private tableName: string;
  private selectColumns: string = '*';
  private conditions: Array<{ type: string; column: string; value: unknown }> = [];
  private orderByColumn: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;
  private offsetCount: number = 0;
  private isSingle: boolean = false;
  private isCount: boolean = false;
  private isHead: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    this.selectColumns = columns;
    if (options?.count === 'exact') {
      this.isCount = true;
    }
    if (options?.head) {
      this.isHead = true;
    }
    return this;
  }

  eq(column: string, value: unknown) {
    this.conditions.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.conditions.push({ type: 'neq', column, value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.conditions.push({ type: 'gt', column, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.conditions.push({ type: 'gte', column, value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.conditions.push({ type: 'lt', column, value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.conditions.push({ type: 'lte', column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.conditions.push({ type: 'in', column, value: values });
    return this;
  }

  is(column: string, value: unknown) {
    this.conditions.push({ type: 'is', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderByColumn = column;
    this.orderAscending = options?.ascending !== false;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  private applyConditions(records: MockRecord[]): MockRecord[] {
    return records.filter((record) => {
      for (const condition of this.conditions) {
        const value = record[condition.column];
        switch (condition.type) {
          case 'eq':
            if (value !== condition.value) return false;
            break;
          case 'neq':
            if (value === condition.value) return false;
            break;
          case 'gt':
            if (!(value > (condition.value as number))) return false;
            break;
          case 'gte':
            if (!(value >= (condition.value as number))) return false;
            break;
          case 'lt':
            if (!(value < (condition.value as number))) return false;
            break;
          case 'lte':
            if (!(value <= (condition.value as number))) return false;
            break;
          case 'in':
            if (!(condition.value as unknown[]).includes(value)) return false;
            break;
          case 'is':
            if (value !== condition.value) return false;
            break;
        }
      }
      return true;
    });
  }

  async then(resolve: (result: { data: unknown; error: null; count?: number }) => void) {
    let records = mockDataStore.findAll(this.tableName);

    // 조건 적용
    records = this.applyConditions(records);

    // 정렬
    if (this.orderByColumn) {
      records.sort((a, b) => {
        const aVal = a[this.orderByColumn!];
        const bVal = b[this.orderByColumn!];
        if (aVal < bVal) return this.orderAscending ? -1 : 1;
        if (aVal > bVal) return this.orderAscending ? 1 : -1;
        return 0;
      });
    }

    // 페이지네이션
    if (this.offsetCount > 0) {
      records = records.slice(this.offsetCount);
    }
    if (this.limitCount !== null) {
      records = records.slice(0, this.limitCount);
    }

    // 결과 반환
    if (this.isHead) {
      resolve({ data: null, error: null, count: records.length });
    } else if (this.isSingle) {
      resolve({ data: records[0] || null, error: null });
    } else {
      resolve({ data: records, error: null, count: this.isCount ? records.length : undefined });
    }
  }
}

/**
 * Supabase Insert Builder Mock
 */
class MockInsertBuilder {
  private tableName: string;
  private data: MockRecord | MockRecord[];
  private shouldSelect: boolean = false;
  private isSingle: boolean = false;

  constructor(tableName: string, data: MockRecord | MockRecord[]) {
    this.tableName = tableName;
    this.data = data;
  }

  select() {
    this.shouldSelect = true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async then(resolve: (result: { data: unknown; error: null }) => void) {
    const records = Array.isArray(this.data) ? this.data : [this.data];
    const inserted = records.map((record) => mockDataStore.insert(this.tableName, record));

    if (this.shouldSelect) {
      resolve({ data: this.isSingle ? inserted[0] : inserted, error: null });
    } else {
      resolve({ data: null, error: null });
    }
  }
}

/**
 * Supabase Update Builder Mock
 */
class MockUpdateBuilder {
  private tableName: string;
  private updates: Partial<MockRecord>;
  private conditions: Array<{ type: string; column: string; value: unknown }> = [];
  private shouldSelect: boolean = false;
  private isSingle: boolean = false;

  constructor(tableName: string, updates: Partial<MockRecord>) {
    this.tableName = tableName;
    this.updates = updates;
  }

  eq(column: string, value: unknown) {
    this.conditions.push({ type: 'eq', column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.conditions.push({ type: 'in', column, value: values });
    return this;
  }

  is(column: string, value: unknown) {
    this.conditions.push({ type: 'is', column, value });
    return this;
  }

  select() {
    this.shouldSelect = true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async then(resolve: (result: { data: unknown; error: null }) => void) {
    // ID 조건으로 업데이트
    const idCondition = this.conditions.find((c) => c.type === 'eq' && c.column === 'id');
    if (idCondition) {
      const updated = mockDataStore.update(this.tableName, idCondition.value as string, this.updates);
      resolve({ data: this.shouldSelect ? (this.isSingle ? updated : [updated]) : null, error: null });
    } else {
      resolve({ data: null, error: null });
    }
  }
}

/**
 * Supabase Delete Builder Mock
 */
class MockDeleteBuilder {
  private tableName: string;
  private conditions: Array<{ type: string; column: string; value: unknown }> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  eq(column: string, value: unknown) {
    this.conditions.push({ type: 'eq', column, value });
    return this;
  }

  async then(resolve: (result: { error: null }) => void) {
    const idCondition = this.conditions.find((c) => c.type === 'eq' && c.column === 'id');
    if (idCondition) {
      mockDataStore.delete(this.tableName, idCondition.value as string);
    }
    resolve({ error: null });
  }
}

/**
 * Supabase Upsert Builder Mock
 */
class MockUpsertBuilder {
  private tableName: string;
  private data: MockRecord | MockRecord[];
  private options?: { onConflict?: string };
  private shouldSelect: boolean = false;
  private isSingle: boolean = false;

  constructor(tableName: string, data: MockRecord | MockRecord[], options?: { onConflict?: string }) {
    this.tableName = tableName;
    this.data = data;
    this.options = options;
  }

  select() {
    this.shouldSelect = true;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  async then(resolve: (result: { data: unknown; error: null }) => void) {
    const records = Array.isArray(this.data) ? this.data : [this.data];
    const results: MockRecord[] = [];

    for (const record of records) {
      const existing = record.id ? mockDataStore.findById(this.tableName, record.id) : null;
      if (existing) {
        const updated = mockDataStore.update(this.tableName, record.id, record);
        if (updated) results.push(updated);
      } else {
        results.push(mockDataStore.insert(this.tableName, record));
      }
    }

    resolve({ data: this.shouldSelect ? (this.isSingle ? results[0] : results) : null, error: null });
  }
}

/**
 * Mock Supabase Client
 */
export const mockSupabaseClient = {
  from: (tableName: string) => ({
    select: (columns?: string, options?: { count?: 'exact'; head?: boolean }) => {
      const builder = new MockQueryBuilder(tableName);
      return builder.select(columns, options);
    },
    insert: (data: MockRecord | MockRecord[]) => new MockInsertBuilder(tableName, data),
    update: (data: Partial<MockRecord>) => new MockUpdateBuilder(tableName, data),
    delete: () => new MockDeleteBuilder(tableName),
    upsert: (data: MockRecord | MockRecord[], options?: { onConflict?: string }) =>
      new MockUpsertBuilder(tableName, data, options),
  }),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
};

/**
 * Supabase 클라이언트 Mock 적용
 */
export function setupSupabaseMock() {
  vi.mock('../../src/utils/supabase', () => ({
    getSupabaseClient: () => mockSupabaseClient,
    getSupabaseAdminClient: () => mockSupabaseClient,
    createDatabaseHelper: (tableName: string) => ({
      findById: async (id: string) => {
        const data = mockDataStore.findById(tableName, id);
        return { data, error: null };
      },
      findByConditions: async (conditions: Record<string, unknown>) => {
        const data = mockDataStore.findByConditions(tableName, conditions);
        return { data, error: null };
      },
      create: async (record: MockRecord) => {
        const data = mockDataStore.insert(tableName, record);
        return { data, error: null };
      },
      update: async (id: string, updates: Partial<MockRecord>) => {
        const data = mockDataStore.update(tableName, id, updates);
        return { data, error: null };
      },
      delete: async (id: string) => {
        const result = mockDataStore.delete(tableName, id);
        return { data: result, error: null };
      },
    }),
  }));
}

/**
 * Mock 데이터 초기화
 */
export function clearMockData() {
  mockDataStore.clearAll();
}

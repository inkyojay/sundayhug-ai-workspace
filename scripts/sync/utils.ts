/**
 * Sync Utils - Supabase 연결 및 공통 유틸리티
 *
 * 마크다운 파일을 Supabase에 동기화하기 위한 유틸리티 함수들
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// .env 파일 로드 (루트 디렉토리에서)
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// 환경 변수 검증
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file'
  );
}

// Supabase 클라이언트 생성 (Service Role Key 사용 - 서버 사이드용)
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 에이전트 카테고리 타입
export type AgentCategory =
  | 'marketing'
  | 'product'
  | 'customer'
  | 'operations'
  | 'analytics'
  | 'system';

// 에이전트 상태 타입
export type AgentStatus = 'active' | 'inactive' | 'maintenance' | 'error';

// 에이전트 데이터 타입 (Supabase Insert용)
export interface AgentData {
  agent_code: string;
  name: string;
  description: string | null;
  category: AgentCategory;
  parent_agent_id: string | null;
  is_main_agent: boolean;
  capabilities: Record<string, unknown>;
  mcp_tools: Record<string, unknown>;
  status: AgentStatus;
  version: string;
}

// 파싱된 에이전트 정보 타입
export interface ParsedAgentInfo {
  agentId: string;
  agentCode: string;
  name: string;
  koreanName: string;
  type: 'main' | 'sub';
  parentAgent: string | null;
  version: string;
  lastModified: string;
  domain: string;
  layer: string;
  automationLevel: string;
  criticality: string;
  responsibilities: string[];
  subAgents: SubAgentInfo[];
  kpis: KPIInfo[];
  filePath: string;
}

export interface SubAgentInfo {
  id: string;
  name: string;
  role: string;
  automationLevel: string;
}

export interface KPIInfo {
  name: string;
  target: string;
  measurementCycle: string;
}

// 콘솔 로깅 유틸리티
export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  success: (message: string, ...args: unknown[]) => {
    console.log(`[SUCCESS] ${message}`, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },
};

// 도메인을 카테고리로 매핑
export function mapDomainToCategory(domain: string): AgentCategory {
  const domainMap: Record<string, AgentCategory> = {
    marketing: 'marketing',
    product: 'product',
    customer: 'customer',
    operations: 'operations',
    analytics: 'analytics',
    system: 'system',
  };

  return domainMap[domain.toLowerCase()] || 'operations';
}

// 에이전트 코드 생성 (예: 01 -> AGENT-01)
export function generateAgentCode(agentId: string): string {
  return `AGENT-${agentId.padStart(2, '0')}`;
}

// 파일 경로에서 에이전트 ID 추출
export function extractAgentIdFromPath(filePath: string): string | null {
  // docs/agents/01-order/main.md -> 01
  const match = filePath.match(/(\d+)-[\w-]+\/main\.md$/);
  return match ? match[1] : null;
}

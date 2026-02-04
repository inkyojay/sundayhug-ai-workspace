/**
 * Sync Agents - 에이전트 마크다운 -> Supabase 동기화
 *
 * docs/agents/ 폴더의 마크다운 파일을 스캔하고
 * Supabase agents 테이블에 upsert합니다.
 */

import * as path from 'path';
import {
  supabase,
  AgentData,
  ParsedAgentInfo,
  logger,
  mapDomainToCategory,
} from './utils';
import { parseAllAgentMarkdowns, parseAgentMarkdown } from './parsers/markdown';

// 프로젝트 루트 경로
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const AGENTS_DIR = path.join(PROJECT_ROOT, 'docs/agents');

/**
 * ParsedAgentInfo를 Supabase AgentData로 변환
 */
function convertToAgentData(parsed: ParsedAgentInfo): AgentData {
  // 서브 에이전트 정보를 capabilities에 포함
  const capabilities = {
    responsibilities: parsed.responsibilities,
    sub_agents: parsed.subAgents.map((sub) => ({
      id: sub.id,
      name: sub.name,
      role: sub.role,
      automation_level: sub.automationLevel,
    })),
    kpis: parsed.kpis.map((kpi) => ({
      name: kpi.name,
      target: kpi.target,
      measurement_cycle: kpi.measurementCycle,
    })),
    classification: {
      layer: parsed.layer,
      automation_level: parsed.automationLevel,
      criticality: parsed.criticality,
    },
  };

  return {
    agent_code: parsed.agentCode,
    name: parsed.name,
    description: `${parsed.koreanName} - ${parsed.domain} 도메인`,
    category: mapDomainToCategory(parsed.domain),
    parent_agent_id: null, // 추후 상위 에이전트 ID 조회 로직 추가 가능
    is_main_agent: parsed.type === 'main',
    capabilities,
    mcp_tools: {}, // 추후 MCP 도구 정보 추가
    status: 'active',
    version: parsed.version,
  };
}

/**
 * 단일 에이전트 Supabase에 upsert
 */
async function upsertAgent(agentData: AgentData): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('agents')
      .upsert(agentData, {
        onConflict: 'agent_code',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      logger.error(`Failed to upsert agent ${agentData.agent_code}:`, error.message);
      return false;
    }

    logger.success(`Upserted agent: ${agentData.agent_code} (${agentData.name})`);
    return true;
  } catch (error) {
    logger.error(`Error upserting agent ${agentData.agent_code}:`, error);
    return false;
  }
}

/**
 * 모든 에이전트 동기화
 */
export async function syncAllAgents(): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  logger.info('Starting agent synchronization...');
  logger.info(`Agents directory: ${AGENTS_DIR}`);

  const parsedAgents = parseAllAgentMarkdowns(AGENTS_DIR);
  logger.info(`Found ${parsedAgents.length} agent markdown files`);

  let success = 0;
  let failed = 0;

  for (const parsed of parsedAgents) {
    const agentData = convertToAgentData(parsed);
    const result = await upsertAgent(agentData);

    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  logger.info('');
  logger.info('=== Synchronization Complete ===');
  logger.info(`Total: ${parsedAgents.length}`);
  logger.info(`Success: ${success}`);
  logger.info(`Failed: ${failed}`);

  return {
    success,
    failed,
    total: parsedAgents.length,
  };
}

/**
 * 특정 에이전트 파일만 동기화
 */
export async function syncAgentFile(filePath: string): Promise<boolean> {
  logger.info(`Syncing single file: ${filePath}`);

  const parsed = parseAgentMarkdown(filePath);
  if (!parsed) {
    logger.error(`Failed to parse file: ${filePath}`);
    return false;
  }

  const agentData = convertToAgentData(parsed);
  return upsertAgent(agentData);
}

/**
 * 변경된 에이전트 파일들만 동기화
 * (Git diff에서 변경된 파일 목록을 받아서 처리)
 */
export async function syncChangedAgents(changedFiles: string[]): Promise<{
  success: number;
  failed: number;
  total: number;
}> {
  // agents 폴더의 main.md 파일만 필터링
  const agentFiles = changedFiles.filter(
    (file) => file.includes('docs/agents/') && file.endsWith('main.md')
  );

  logger.info(`Found ${agentFiles.length} changed agent files`);

  let success = 0;
  let failed = 0;

  for (const file of agentFiles) {
    const fullPath = path.resolve(PROJECT_ROOT, file);
    const result = await syncAgentFile(fullPath);

    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return {
    success,
    failed,
    total: agentFiles.length,
  };
}

// 직접 실행 시 모든 에이전트 동기화
if (require.main === module) {
  syncAllAgents()
    .then((result) => {
      if (result.failed > 0) {
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error('Synchronization failed:', error);
      process.exit(1);
    });
}

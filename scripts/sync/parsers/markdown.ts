/**
 * Markdown Parser - 에이전트 마크다운 파일 파싱
 *
 * gray-matter를 사용하여 front-matter를 파싱하고,
 * 마크다운 본문에서 에이전트 정보를 추출합니다.
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import {
  ParsedAgentInfo,
  SubAgentInfo,
  KPIInfo,
  logger,
} from '../utils';

/**
 * 마크다운 파일에서 에이전트 정보 파싱
 */
export function parseAgentMarkdown(filePath: string): ParsedAgentInfo | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontMatter, content: body } = matter(content);

    // 기본 정보 추출
    const basicInfo = extractBasicInfo(body);
    const classification = extractClassification(body);
    const responsibilities = extractResponsibilities(body);
    const subAgents = extractSubAgents(body);
    const kpis = extractKPIs(body);

    if (!basicInfo.agentId) {
      logger.warn(`Could not extract agent ID from ${filePath}`);
      return null;
    }

    return {
      agentId: basicInfo.agentId,
      agentCode: `AGENT-${basicInfo.agentId.padStart(2, '0')}`,
      name: basicInfo.name || '',
      koreanName: basicInfo.koreanName || '',
      type: basicInfo.type as 'main' | 'sub' || 'main',
      parentAgent: basicInfo.parentAgent || null,
      version: basicInfo.version || '1.0.0',
      lastModified: basicInfo.lastModified || new Date().toISOString().split('T')[0],
      domain: classification.domain || 'operations',
      layer: classification.layer || 'core',
      automationLevel: classification.automationLevel || 'L1',
      criticality: classification.criticality || 'normal',
      responsibilities,
      subAgents,
      kpis,
      filePath,
      ...frontMatter, // front-matter 데이터 병합
    };
  } catch (error) {
    logger.error(`Failed to parse markdown file: ${filePath}`, error);
    return null;
  }
}

/**
 * 기본 정보 테이블에서 정보 추출
 */
function extractBasicInfo(content: string): {
  agentId: string;
  name: string;
  koreanName: string;
  type: string;
  parentAgent: string;
  version: string;
  lastModified: string;
} {
  const result = {
    agentId: '',
    name: '',
    koreanName: '',
    type: 'main',
    parentAgent: '',
    version: '1.0.0',
    lastModified: '',
  };

  // Agent ID 추출: | **Agent ID** | `01` |
  const idMatch = content.match(/\*\*Agent ID\*\*\s*\|\s*`?(\d+)`?/i);
  if (idMatch) {
    result.agentId = idMatch[1];
  }

  // Agent Name 추출: | **Agent Name** | `OrderAgent` |
  const nameMatch = content.match(/\*\*Agent Name\*\*\s*\|\s*`?(\w+)`?/i);
  if (nameMatch) {
    result.name = nameMatch[1];
  }

  // 한글명 추출: | **한글명** | 주문 에이전트 |
  const koreanNameMatch = content.match(/\*\*한글명\*\*\s*\|\s*([^|]+)/);
  if (koreanNameMatch) {
    result.koreanName = koreanNameMatch[1].trim();
  }

  // 유형 추출: | **유형** | `main` |
  const typeMatch = content.match(/\*\*유형\*\*\s*\|\s*`?(\w+)`?/i);
  if (typeMatch) {
    result.type = typeMatch[1].toLowerCase();
  }

  // 상위 에이전트 추출: | **상위 에이전트** | `00-Supervisor` |
  const parentMatch = content.match(/\*\*상위 에이전트\*\*\s*\|\s*`?([^|`]+)`?/);
  if (parentMatch) {
    result.parentAgent = parentMatch[1].trim();
  }

  // 버전 추출: | **버전** | `1.0.0` |
  const versionMatch = content.match(/\*\*버전\*\*\s*\|\s*`?([^|`]+)`?/);
  if (versionMatch) {
    result.version = versionMatch[1].trim();
  }

  // 최종 수정일 추출: | **최종 수정일** | `2025-01-26` |
  const dateMatch = content.match(/\*\*최종 수정일\*\*\s*\|\s*`?([^|`]+)`?/);
  if (dateMatch) {
    result.lastModified = dateMatch[1].trim();
  }

  return result;
}

/**
 * 분류 정보 (YAML 블록)에서 정보 추출
 */
function extractClassification(content: string): {
  domain: string;
  layer: string;
  automationLevel: string;
  criticality: string;
} {
  const result = {
    domain: 'operations',
    layer: 'core',
    automationLevel: 'L1',
    criticality: 'normal',
  };

  // YAML 블록에서 classification 추출
  const yamlMatch = content.match(/```yaml\s*\n([\s\S]*?)```/);
  if (yamlMatch) {
    const yamlContent = yamlMatch[1];

    const domainMatch = yamlContent.match(/domain:\s*["']?(\w+)["']?/);
    if (domainMatch) result.domain = domainMatch[1];

    const layerMatch = yamlContent.match(/layer:\s*["']?(\w+)["']?/);
    if (layerMatch) result.layer = layerMatch[1];

    const autoMatch = yamlContent.match(/automation_level:\s*["']?([^"'\n]+)["']?/);
    if (autoMatch) result.automationLevel = autoMatch[1].trim();

    const critMatch = yamlContent.match(/criticality:\s*["']?(\w+)["']?/);
    if (critMatch) result.criticality = critMatch[1];
  }

  return result;
}

/**
 * 책임 목록 추출
 */
function extractResponsibilities(content: string): string[] {
  const responsibilities: string[] = [];

  // "주요 책임" 섹션에서 테이블 파싱
  const responsibilitiesSection = content.match(
    /### \d+\.\d+ 주요 책임[\s\S]*?\n\|([\s\S]*?)(?=\n###|\n---|\n## |$)/
  );

  if (responsibilitiesSection) {
    const tableContent = responsibilitiesSection[1];
    const rows = tableContent.split('\n').filter((row) => row.includes('|'));

    // 헤더와 구분선 제외하고 데이터 행만 추출
    rows.forEach((row, index) => {
      if (index > 1 && row.trim()) {
        // 첫 번째 열(책임명)만 추출
        const cells = row.split('|').filter((cell) => cell.trim());
        if (cells.length > 0) {
          responsibilities.push(cells[0].trim());
        }
      }
    });
  }

  return responsibilities;
}

/**
 * 서브 에이전트 목록 추출
 */
function extractSubAgents(content: string): SubAgentInfo[] {
  const subAgents: SubAgentInfo[] = [];

  // "서브 에이전트 목록" 섹션에서 테이블 파싱
  const subAgentsSection = content.match(
    /### \d+\.\d+ 서브 에이전트 목록[\s\S]*?\n\|([\s\S]*?)(?=\n###|\n---|\n## |$)/
  );

  if (subAgentsSection) {
    const tableContent = subAgentsSection[1];
    const rows = tableContent.split('\n').filter((row) => row.includes('|'));

    // 헤더와 구분선 제외하고 데이터 행만 추출
    rows.forEach((row, index) => {
      if (index > 1 && row.trim()) {
        const cells = row.split('|').filter((cell) => cell.trim());
        if (cells.length >= 4) {
          subAgents.push({
            id: cells[0].trim(),
            name: cells[1].trim(),
            role: cells[2].trim(),
            automationLevel: cells[3].trim(),
          });
        }
      }
    });
  }

  return subAgents;
}

/**
 * KPI 목록 추출
 */
function extractKPIs(content: string): KPIInfo[] {
  const kpis: KPIInfo[] = [];

  // "주요 KPI" 섹션에서 테이블 파싱
  const kpisSection = content.match(
    /### \d+\.\d+ 주요 KPI[\s\S]*?\n\|([\s\S]*?)(?=\n###|\n---|\n## |$)/
  );

  if (kpisSection) {
    const tableContent = kpisSection[1];
    const rows = tableContent.split('\n').filter((row) => row.includes('|'));

    // 헤더와 구분선 제외하고 데이터 행만 추출
    rows.forEach((row, index) => {
      if (index > 1 && row.trim()) {
        const cells = row.split('|').filter((cell) => cell.trim());
        if (cells.length >= 4) {
          kpis.push({
            name: cells[0].trim(),
            target: cells[2].trim(),
            measurementCycle: cells[3].trim(),
          });
        }
      }
    });
  }

  return kpis;
}

/**
 * 디렉토리에서 모든 에이전트 마크다운 파일 찾기
 */
export function findAgentMarkdownFiles(agentsDir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(agentsDir)) {
    logger.warn(`Agents directory not found: ${agentsDir}`);
    return files;
  }

  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const mainMdPath = path.join(agentsDir, entry.name, 'main.md');
      if (fs.existsSync(mainMdPath)) {
        files.push(mainMdPath);
      }
    }
  }

  return files.sort();
}

/**
 * 모든 에이전트 마크다운 파일 파싱
 */
export function parseAllAgentMarkdowns(agentsDir: string): ParsedAgentInfo[] {
  const files = findAgentMarkdownFiles(agentsDir);
  const agents: ParsedAgentInfo[] = [];

  for (const file of files) {
    const agent = parseAgentMarkdown(file);
    if (agent) {
      agents.push(agent);
    }
  }

  return agents;
}

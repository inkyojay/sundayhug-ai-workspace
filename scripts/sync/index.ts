#!/usr/bin/env tsx
/**
 * Sync Index - 메인 동기화 스크립트
 *
 * 사용법:
 *   npm run sync              # 모든 에이전트 동기화
 *   npm run sync -- --all     # 모든 에이전트 동기화 (명시적)
 *   npm run sync -- --changed # 변경된 에이전트만 동기화 (Git 기반)
 *   npm run sync -- --file <path>  # 특정 파일만 동기화
 */

import { execSync } from 'child_process';
import { syncAllAgents, syncAgentFile, syncChangedAgents } from './sync-agents';
import { logger } from './utils';

// 커맨드 라인 인자 파싱
function parseArgs(): {
  mode: 'all' | 'changed' | 'file';
  filePath?: string;
} {
  const args = process.argv.slice(2);

  if (args.includes('--changed')) {
    return { mode: 'changed' };
  }

  if (args.includes('--file')) {
    const fileIndex = args.indexOf('--file');
    const filePath = args[fileIndex + 1];
    if (!filePath) {
      logger.error('--file option requires a file path');
      process.exit(1);
    }
    return { mode: 'file', filePath };
  }

  // 기본값: 모든 에이전트 동기화
  return { mode: 'all' };
}

/**
 * Git에서 변경된 파일 목록 가져오기
 */
function getChangedFiles(): string[] {
  try {
    // 마지막 커밋에서 변경된 파일들
    const output = execSync('git diff --name-only HEAD~1 HEAD', {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    logger.warn('Could not get changed files from git, syncing all');
    return [];
  }
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  console.log('');
  console.log('========================================');
  console.log('   Sundayhug AI Agent Sync System');
  console.log('========================================');
  console.log('');

  const { mode, filePath } = parseArgs();

  let result: { success: number; failed: number; total: number };

  switch (mode) {
    case 'file':
      if (!filePath) {
        logger.error('File path is required');
        process.exit(1);
      }
      logger.info(`Mode: Single file sync`);
      const fileResult = await syncAgentFile(filePath);
      result = {
        success: fileResult ? 1 : 0,
        failed: fileResult ? 0 : 1,
        total: 1,
      };
      break;

    case 'changed':
      logger.info(`Mode: Changed files sync (Git-based)`);
      const changedFiles = getChangedFiles();
      if (changedFiles.length === 0) {
        logger.info('No changed files found, running full sync');
        result = await syncAllAgents();
      } else {
        logger.info(`Changed files: ${changedFiles.join(', ')}`);
        result = await syncChangedAgents(changedFiles);
      }
      break;

    case 'all':
    default:
      logger.info(`Mode: Full sync`);
      result = await syncAllAgents();
      break;
  }

  console.log('');
  console.log('========================================');
  console.log('   Sync Summary');
  console.log('========================================');
  console.log(`   Total:   ${result.total}`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Failed:  ${result.failed}`);
  console.log('========================================');
  console.log('');

  if (result.failed > 0) {
    process.exit(1);
  }
}

// 실행
main().catch((error) => {
  logger.error('Sync failed with error:', error);
  process.exit(1);
});

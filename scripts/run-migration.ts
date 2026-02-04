/**
 * Supabase 마이그레이션 실행 스크립트
 *
 * 사용법: npx tsx scripts/run-migration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env 로드
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🚀 LANE 5 테이블 마이그레이션 시작...\n');

  // SQL 파일 읽기
  const sqlPath = path.resolve(__dirname, '../database/migrations/003_lane5_tables.sql');

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL 파일을 찾을 수 없습니다: ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  // SQL을 개별 명령으로 분리 (세미콜론 기준, 하지만 INSERT는 하나로)
  const statements = sqlContent
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📄 ${statements.length}개의 SQL 명령 발견\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';

    try {
      // Supabase RPC로 SQL 실행
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

      if (error) {
        // RPC 함수가 없으면 직접 테이블 조작 시도
        if (error.message.includes('exec_sql')) {
          console.log(`⚠️  RPC 함수 없음, 직접 실행 시도...`);
          // 테이블 생성은 Supabase Dashboard에서 실행해야 함
          throw new Error('RPC 함수가 없어 직접 실행이 필요합니다.');
        }
        throw error;
      }

      console.log(`✅ [${i + 1}/${statements.length}] ${preview}`);
      successCount++;
    } catch (err) {
      console.log(`❌ [${i + 1}/${statements.length}] ${preview}`);
      console.log(`   오류: ${err instanceof Error ? err.message : String(err)}`);
      errorCount++;
    }
  }

  console.log(`\n📊 결과: 성공 ${successCount}개, 실패 ${errorCount}개`);

  if (errorCount > 0) {
    console.log('\n💡 Supabase Dashboard에서 직접 SQL을 실행해주세요:');
    console.log('   1. https://supabase.com/dashboard 접속');
    console.log('   2. 프로젝트 선택 → SQL Editor');
    console.log(`   3. ${sqlPath} 파일 내용 복사 후 실행`);
  }
}

// 대안: REST API로 직접 실행 시도
async function runMigrationDirect() {
  console.log('🚀 LANE 5 테이블 생성 (직접 API 호출)...\n');

  // 1. agents 테이블 존재 여부 확인
  const { data: existingAgents, error: checkError } = await supabase
    .from('agents')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('✅ agents 테이블이 이미 존재합니다.');

    // 데이터 개수 확인
    const { count } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true });

    console.log(`   현재 ${count}개의 에이전트가 있습니다.`);

    if (count === 0) {
      console.log('\n📥 더미 데이터를 삽입합니다...');
      await insertDummyData();
    }
    return;
  }

  // 테이블이 없으면 생성 필요
  console.log('⚠️  agents 테이블이 없습니다. Supabase Dashboard에서 SQL을 실행해주세요.\n');

  // SQL 파일 경로 출력
  const sqlPath = path.resolve(__dirname, '../database/migrations/003_lane5_tables.sql');
  console.log(`📄 SQL 파일: ${sqlPath}`);
  console.log('\n실행 방법:');
  console.log('1. Supabase Dashboard (https://supabase.com/dashboard) 접속');
  console.log('2. 프로젝트 선택 → SQL Editor 클릭');
  console.log('3. 위 SQL 파일의 내용을 복사하여 붙여넣기');
  console.log('4. Run 버튼 클릭\n');

  // SQL 내용 일부 출력
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
  console.log('='.repeat(60));
  console.log('SQL 내용 (처음 50줄):');
  console.log('='.repeat(60));
  console.log(sqlContent.split('\n').slice(0, 50).join('\n'));
  console.log('...\n');
}

// 더미 데이터 삽입
async function insertDummyData() {
  const agents = [
    { agent_code: 'supervisor', name: 'Supervisor Agent', description: '전체 에이전트 오케스트레이션', category: 'system', status: 'active', version: '1.0.0', file_path: 'docs/agents/00-supervisor/main.md' },
    { agent_code: 'order', name: 'Order Agent', description: '주문 처리 및 관리', category: 'operations', status: 'active', version: '1.0.0', file_path: 'docs/agents/01-order/main.md' },
    { agent_code: 'cs', name: 'CS Agent', description: '고객 문의 응대', category: 'customer', status: 'active', version: '1.0.0', file_path: 'docs/agents/02-cs/main.md' },
    { agent_code: 'marketing', name: 'Marketing Agent', description: '마케팅 캠페인 관리', category: 'marketing', status: 'active', version: '1.0.0', file_path: 'docs/agents/03-marketing/main.md' },
    { agent_code: 'inventory', name: 'Inventory Agent', description: '재고 관리', category: 'operations', status: 'active', version: '1.0.0', file_path: 'docs/agents/05-inventory/main.md' },
    { agent_code: 'detail_page', name: 'Detail Page Agent', description: '상품 상세페이지 생성', category: 'product', status: 'active', version: '1.0.0', file_path: 'docs/agents/04-detail-page/main.md' },
    { agent_code: 'analytics', name: 'Analytics Agent', description: '데이터 분석', category: 'analytics', status: 'active', version: '1.0.0', file_path: 'docs/agents/11-analytics/main.md' },
  ];

  for (const agent of agents) {
    const { error } = await supabase.from('agents').upsert(agent, { onConflict: 'agent_code' });
    if (error) {
      console.log(`   ❌ ${agent.name}: ${error.message}`);
    } else {
      console.log(`   ✅ ${agent.name}`);
    }
  }
}

// 실행
runMigrationDirect().catch(console.error);

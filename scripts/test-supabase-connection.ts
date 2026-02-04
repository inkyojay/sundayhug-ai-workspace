/**
 * Supabase 연결 테스트 스크립트
 * 환경변수가 올바르게 설정되었는지 확인합니다.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testConnection() {
  console.log('='.repeat(50));
  console.log('Supabase 연결 테스트');
  console.log('='.repeat(50));

  // 환경변수 확인
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('\n📋 환경변수 상태:');
  console.log(`  SUPABASE_URL: ${url ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`  SUPABASE_ANON_KEY: ${anonKey ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✅ 설정됨' : '❌ 미설정'}`);

  if (!url || !anonKey) {
    console.error('\n❌ 필수 환경변수가 설정되지 않았습니다.');
    console.error('   .env 파일에 SUPABASE_URL과 SUPABASE_ANON_KEY를 설정해주세요.');
    process.exit(1);
  }

  console.log(`\n🔗 연결 대상: ${url}`);

  // Anon 클라이언트 테스트
  console.log('\n1️⃣ Anon 클라이언트 연결 테스트...');
  try {
    const anonClient = createClient(url, anonKey);

    // 간단한 쿼리로 연결 테스트
    const { error } = await anonClient.from('_test_connection').select('*').limit(1);

    if (error && !error.message.includes('does not exist')) {
      // 테이블이 없는 것은 정상, 다른 에러만 문제
      if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
        console.log('  ❌ API 키가 유효하지 않습니다.');
      } else {
        console.log('  ✅ Anon 클라이언트 연결 성공');
        console.log(`     (참고: ${error.message})`);
      }
    } else {
      console.log('  ✅ Anon 클라이언트 연결 성공');
    }
  } catch (err) {
    console.error('  ❌ Anon 클라이언트 연결 실패:', (err as Error).message);
  }

  // Service Role 클라이언트 테스트
  if (serviceRoleKey) {
    console.log('\n2️⃣ Service Role 클라이언트 연결 테스트...');
    try {
      const adminClient = createClient(url, serviceRoleKey);

      const { error } = await adminClient.from('_test_connection').select('*').limit(1);

      if (error && !error.message.includes('does not exist')) {
        if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
          console.log('  ❌ Service Role 키가 유효하지 않습니다.');
        } else {
          console.log('  ✅ Service Role 클라이언트 연결 성공');
          console.log(`     (참고: ${error.message})`);
        }
      } else {
        console.log('  ✅ Service Role 클라이언트 연결 성공');
      }
    } catch (err) {
      console.error('  ❌ Service Role 클라이언트 연결 실패:', (err as Error).message);
    }
  }

  // 테이블 목록 조회 시도
  console.log('\n3️⃣ 데이터베이스 스키마 확인...');
  try {
    const adminClient = createClient(url, serviceRoleKey || anonKey);

    // information_schema에서 테이블 목록 조회
    const { data, error } = await adminClient
      .rpc('get_tables_info')
      .select('*');

    if (error) {
      // RPC 함수가 없으면 직접 쿼리
      console.log('  ℹ️  RPC 함수 미설정 - 기본 테이블 확인 중...');

      // 몇 가지 예상 테이블 확인
      const expectedTables = ['orders', 'customers', 'products', 'cs_inquiries', 'inventory'];

      for (const table of expectedTables) {
        const { error: tableError } = await adminClient
          .from(table)
          .select('*')
          .limit(1);

        if (tableError?.message.includes('does not exist')) {
          console.log(`     📋 ${table}: ❌ 미생성`);
        } else if (tableError) {
          console.log(`     📋 ${table}: ⚠️ 접근 제한 (${tableError.message.substring(0, 30)}...)`);
        } else {
          console.log(`     📋 ${table}: ✅ 존재`);
        }
      }
    } else {
      console.log('  ✅ 테이블 정보 조회 성공');
      if (data) {
        console.log(`     총 ${(data as unknown[]).length}개 테이블`);
      }
    }
  } catch (err) {
    console.log('  ℹ️  스키마 확인 건너뜀:', (err as Error).message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Supabase 연결 테스트 완료');
  console.log('='.repeat(50));
  console.log('\n다음 단계:');
  console.log('  1. 테이블이 없다면 database/schema.sql을 실행해주세요');
  console.log('  2. npm run test로 전체 테스트를 실행하세요');
}

testConnection().catch(console.error);

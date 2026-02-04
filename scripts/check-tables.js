const { Client } = require('pg');

const connectionString = 'postgresql://postgres.unybnarbrlmteamwvdql:Wpdlzhvm0339@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function checkTables() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Supabase 연결 성공\n');

    // 테이블 목록 확인
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📋 생성된 테이블 목록 (' + tablesResult.rows.length + '개):');
    console.log('─'.repeat(40));
    tablesResult.rows.forEach((row, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${row.table_name}`);
    });

    // ENUM 타입 확인
    const enumsResult = await client.query(`
      SELECT t.typname as enum_name
      FROM pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typtype = 'e'
      AND n.nspname = 'public'
      ORDER BY t.typname
    `);

    console.log('\n📋 생성된 ENUM 타입 (' + enumsResult.rows.length + '개):');
    console.log('─'.repeat(40));
    enumsResult.rows.forEach((row, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${row.enum_name}`);
    });

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();

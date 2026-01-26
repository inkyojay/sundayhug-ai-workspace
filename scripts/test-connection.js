require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
  console.log('🔌 Supabase 연결 테스트\n');
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('');

  // Supabase pooler 연결 문자열
  const connectionString = 'postgresql://postgres.unybnarbrlmteamwvdql:Wpdlzhvm0339@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ 데이터베이스 연결 성공!\n');

    // 테이블 수 확인
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    `);
    console.log('📊 총 테이블 수:', tablesResult.rows[0].count + '개');

    // 에이전트 테이블 확인
    const agentsResult = await client.query('SELECT COUNT(*) as count FROM agents');
    console.log('🤖 등록된 에이전트:', agentsResult.rows[0].count + '개');

    // 워크플로우 테이블 확인
    const workflowsResult = await client.query('SELECT COUNT(*) as count FROM workflows');
    console.log('📋 등록된 워크플로우:', workflowsResult.rows[0].count + '개');

    console.log('\n🎉 시스템 준비 완료!');

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await client.end();
  }
}

testConnection();

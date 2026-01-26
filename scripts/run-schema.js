const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.unybnarbrlmteamwvdql:Wpdlzhvm0339@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function runSchema() {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Supabase 연결 중...');
    await client.connect();
    console.log('✅ 연결 성공!\n');

    // 연결 테스트
    const versionResult = await client.query('SELECT version()');
    console.log('📊 PostgreSQL 버전:', versionResult.rows[0].version.split(',')[0]);
    console.log('');

    // 메인 스키마 실행
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    console.log('📄 메인 스키마 로드:', schemaPath);

    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('⏳ 스키마 실행 중... (약 30초 소요)');

    await client.query(schema);
    console.log('✅ 메인 스키마 실행 완료!\n');

    // LANE 2 마이그레이션
    const lane2Path = path.join(__dirname, '..', 'database', 'migrations', '002_lane2_tables.sql');
    if (fs.existsSync(lane2Path)) {
      console.log('📄 LANE 2 마이그레이션 로드:', lane2Path);
      const lane2 = fs.readFileSync(lane2Path, 'utf8');
      await client.query(lane2);
      console.log('✅ LANE 2 마이그레이션 완료!\n');
    }

    // LANE 4 마이그레이션
    const lane4Path = path.join(__dirname, '..', 'database', 'migrations', '002_lane4_tables.sql');
    if (fs.existsSync(lane4Path)) {
      console.log('📄 LANE 4 마이그레이션 로드:', lane4Path);
      const lane4 = fs.readFileSync(lane4Path, 'utf8');
      await client.query(lane4);
      console.log('✅ LANE 4 마이그레이션 완료!\n');
    }

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

    console.log('\n🎉 모든 스키마 실행 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.detail) console.error('   상세:', error.detail);
    if (error.hint) console.error('   힌트:', error.hint);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 연결 종료');
  }
}

runSchema();

#!/usr/bin/env node
/**
 * RLS Check Test
 * Проверява RLS статуса и политиките в Supabase базата данни чрез SQL заявки
 * Използва се чрез Supabase MCP или директно чрез Supabase клиент
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Зареждане на environment variables от .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
}

// function loadEnv() {
//   const envPath = path.join(__dirname, '..', '..', '.env.local');
//   if (fs.existsSync(envPath)) {
//     const envFile = fs.readFileSync(envPath, 'utf8');
//     envFile.split('\n').forEach(line => {
//       const match = line.match(/^([^=:#]+)=(.*)$/);
//       if (match) {
//         const key = match[1].trim();
//         const value = match[2].trim().replace(/^["']|["']$/g, '');
//         if (!process.env[key]) {
//           process.env[key] = value;
//         }
//       }
//     });
//   }
// }

// loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQL заявки за проверка на RLS
const RLS_CHECK_QUERIES = {
  // 1. Проверка на RLS статус
  checkRLSStatus: `
    SELECT 
      tablename,
      rowsecurity as rls_enabled,
      CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
      END as status
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `,

  // 2. Детайлен списък на политиките
  listPolicies: `
    SELECT 
      tablename,
      policyname,
      cmd as command_type,
      qual as using_expression,
      with_check as with_check_expression
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, cmd, policyname;
  `,

  // 3. Брой политики по таблица
  countPolicies: `
    SELECT 
      tablename,
      cmd as command_type,
      COUNT(*) as policy_count,
      STRING_AGG(policyname, ', ' ORDER BY policyname) as policy_names
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename, cmd
    ORDER BY tablename, 
      CASE cmd 
        WHEN 'SELECT' THEN 1
        WHEN 'INSERT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
        ELSE 5
      END;
  `,

  // 4. Таблици с проблеми
  checkProblems: `
    SELECT 
      t.tablename,
      CASE 
        WHEN t.rowsecurity THEN 'RLS Enabled'
        ELSE 'RLS Disabled ❌'
      END as rls_status,
      COALESCE(p.policy_count, 0) as total_policies,
      CASE 
        WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN '⚠️ No Policies'
        WHEN NOT t.rowsecurity THEN '❌ RLS Not Enabled'
        ELSE '✅ OK'
      END as status
    FROM pg_tables t
    LEFT JOIN (
      SELECT tablename, COUNT(*) as policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
      GROUP BY tablename
    ) p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
    ORDER BY 
      CASE 
        WHEN NOT t.rowsecurity THEN 1
        WHEN COALESCE(p.policy_count, 0) = 0 THEN 2
        ELSE 3
      END,
      t.tablename;
  `
};

async function executeSQL(query, description) {
  try {
    // Използваме Supabase Management API за изпълнение на SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      // Опитваме се да използваме Supabase Management API директно
      const managementUrl = supabaseUrl.replace('https://', 'https://api.supabase.com/v1/projects/');
      const projectRef = supabaseUrl.split('//')[1].split('.')[0];
      
      const mgmtResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({ query })
      });

      if (!mgmtResponse.ok) {
        console.debug(`⚠️  ${description}: Не мога да изпълня директно SQL`);
        console.debug(`   Използвайте Supabase MCP или SQL Editor\n`);
        return null;
      }

      const result = await mgmtResponse.json();
      return result.data || result;
    }

    const result = await response.json();
    return result.data || result;
  } catch (err) {
    console.debug(`⚠️  ${description}: ${err.message}`);
    console.debug(`   Използвайте Supabase MCP или SQL Editor за изпълнение\n`);
    return null;
  }
}

async function checkRLS() {
  console.debug('🔍 Проверка на RLS политиките...\n');
  console.debug('═'.repeat(60));

  // 1. Проверка на RLS статус
  console.debug('\n1️⃣ Проверка на RLS статус за всички таблици:\n');
  const rlsStatus = await executeSQL(RLS_CHECK_QUERIES.checkRLSStatus, 'RLS Status Check');
  
  if (rlsStatus) {
    console.table(rlsStatus);
  } else {
    console.debug('💡 Използвайте Supabase MCP или SQL Editor за изпълнение на заявката\n');
    console.debug(RLS_CHECK_QUERIES.checkRLSStatus);
  }

  // 2. Детайлен списък на политиките
  console.debug('\n2️⃣ Детайлен списък на RLS политики:\n');
  const policies = await executeSQL(RLS_CHECK_QUERIES.listPolicies, 'Policies List');
  
  if (policies) {
    console.table(policies);
  } else {
    console.debug('💡 Използвайте Supabase MCP или SQL Editor за изпълнение на заявката\n');
  }

  // 3. Брой политики по таблица
  console.debug('\n3️⃣ Брой политики по таблица и команда:\n');
  const policyCount = await executeSQL(RLS_CHECK_QUERIES.countPolicies, 'Policy Count');
  
  if (policyCount) {
    console.table(policyCount);
  } else {
    console.debug('💡 Използвайте Supabase MCP или SQL Editor за изпълнение на заявката\n');
  }

  // 4. Таблици с проблеми
  console.debug('\n4️⃣ Таблици с проблеми:\n');
  const problems = await executeSQL(RLS_CHECK_QUERIES.checkProblems, 'Problems Check');
  
  if (problems) {
    const issues = problems.filter(p => !p.status.includes('✅'));
    if (issues.length > 0) {
      console.table(issues);
      console.debug('\n⚠️  Намерени проблеми! Поправете ги преди да продължите.\n');
    } else {
      console.debug('✅ Всички таблици са конфигурирани правилно!\n');
    }
  } else {
    console.debug('💡 Използвайте Supabase MCP или SQL Editor за изпълнение на заявката\n');
  }

  console.debug('═'.repeat(60));
  console.debug('\n✅ Проверката е завършена!');
  console.debug('\n💡 За пълна проверка използвайте Supabase MCP в Cursor или SQL Editor в Dashboard\n');
}

// Изпълнение на теста
if (require.main === module) {
  checkRLS().catch(error => {
    console.error('❌ Грешка при изпълнение на теста:', error);
    process.exit(1);
  });
}

module.exports = { checkRLS, RLS_CHECK_QUERIES };

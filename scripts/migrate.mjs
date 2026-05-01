import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.env.SUPABASE_USER_ID;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !USER_ID) {
  console.error('缺少环境变量，请检查 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_USER_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const backup = JSON.parse(readFileSync(resolve(__dirname, '../backup.json'), 'utf-8'));
const appState = backup.appState;

console.log('准备迁移数据：');
console.log('  资产数量:', appState.assets?.length ?? 0);
console.log('  账户数量:', appState.brokerageAccounts?.length ?? 0);
console.log('  负债数量:', appState.liabilities?.length ?? 0);
console.log('  历史记录:', appState.history?.length ?? 0);
console.log('  目标用户:', USER_ID);
console.log('');

const { error } = await supabase
  .from('states')
  .upsert(
    { user_id: USER_ID, app_state: appState, last_updated: new Date().toISOString() },
    { onConflict: 'user_id' }
  );

if (error) {
  console.error('迁移失败:', error.message);
  process.exit(1);
}

console.log('✓ 迁移成功！');

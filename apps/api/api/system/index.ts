import { Hono } from 'hono';
import { supabaseAdmin } from '../../lib/env';

const system = new Hono();

system.get('/', async (c) => {
  const { data: runtimeSettings } = await supabaseAdmin.from('runtime_settings').select('*');
  const settings: Record<string, any> = {};
  runtimeSettings?.forEach((s: any) => { settings[s.key] = s.value; });
  return c.json({ status: 'ok', settings });
});

system.get('/health', async (c) => {
  return c.json({ status: 'healthy', timestamp: Date.now() });
});

export default system;
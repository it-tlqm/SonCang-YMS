const { createClient } = require('@supabase/supabase-js');
const url = 'https://euswzyespwaxyrjkfkrq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3d6eWVzcHdheHlyamtma3JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcxMjI0NSwiZXhwIjoyMTA3Mjg4MjQ1fQ.XGJfrft4TDzNSklhXDreXNCFoNXQ-TlOHEyjS_t2hrk';

const supabase = createClient(url, key);

async function cleanProperly() {
  const oldVehIds = ['698316a5-f642-40da-b88d-68e9cc4cf052', 'ab7c63ec-57e2-4b6a-9bbf-dceb466a6570', '0608c41a-075f-48b3-af39-d68608b86419'];
  const oldContId = 'd041c122-c69a-482d-9dc9-0fa66ea7ca8e';

  // 1. Delete payments
  await supabase.from('app_payments').delete().in('vehicle_visit_id', oldVehIds);
  // 2. Delete charges
  await supabase.from('app_charges').delete().in('vehicle_visit_id', oldVehIds);
  await supabase.from('app_charges').delete().eq('container_visit_id', oldContId);
  // 3. Delete reefer power sessions
  await supabase.from('app_reefer_power_sessions').delete().eq('container_visit_id', oldContId);
  // 4. Delete container
  await supabase.from('app_container_visits').delete().eq('id', oldContId);
  // 5. Delete vehicles
  await supabase.from('app_vehicle_visits').delete().in('id', oldVehIds);

  const { data: vCount } = await supabase.from('app_vehicle_visits').select('status');
  console.log('Final in_yard vehicles in Supabase:', vCount.filter(v => v.status === 'IN_YARD').length);

  const { data: cCount } = await supabase.from('app_container_visits').select('status');
  console.log('Final in_yard containers in Supabase:', cCount.filter(c => c.status === 'IN_YARD').length);
}

cleanProperly();

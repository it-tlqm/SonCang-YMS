/**
 * Facade / Service quản lý dữ liệu Bến bãi Sơn Cảng
 * Điều phối giữa DemoRepository và SupabaseRepository tùy theo AuthMode của người dùng.
 */

import { IYardRepository } from './repository-interface';
import { demoRepository, SEED_VEHICLE_TYPES_V5 } from './demo-repository';
import { supabaseRepository } from './supabase-repository';

export { SEED_VEHICLE_TYPES_V5 };
export { demoRepository, supabaseRepository };
export type { IYardRepository };

/**
 * Trả về repository tương ứng với chế độ người dùng
 */
export function getYardRepository(mode: 'DEMO' | 'SUPABASE' = 'DEMO'): IYardRepository {
  if (mode === 'SUPABASE') {
    return supabaseRepository;
  }
  return demoRepository;
}

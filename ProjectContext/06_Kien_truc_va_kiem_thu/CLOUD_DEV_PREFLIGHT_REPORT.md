# BÁO CÁO KIỂM TRA MÔI TRƯỜNG CLOUD DEV (PREFLIGHT REPORT — READ ONLY)
**Dự án:** Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Môi trường khảo sát:** Supabase Cloud DEV (`son-cang-yms-dev`)  
**Project Ref:** `euswzyespwaxyrjkfkrq`  
**Thời điểm thực hiện:** 2026-10-12 11:25:00+07:00  
**Người thực hiện:** Antigravity Pairing Agent  
**Chế độ tuân thủ:** READ-ONLY tuyệt đối (Không ghi, không reset, không repair, không push)

---

## I. TỔNG KẾT VÀ KẾT LUẬN

> ### KẾT LUẬN: **READY**
> - Môi trường Supabase Cloud DEV đang ở trạng thái sạch, ổn định và sẵn sàng tiếp nhận Migrations 005–008.
> - Toàn bộ 4 migrations nền tảng (001–004) đã được áp dụng đầy đủ trên Cloud DEV.
> - Mã băm SHA-256 của Migration 004 hoàn toàn khớp với bản Gate C đã được phê duyệt.
> - Cơ chế RLS (Row Level Security) và phân quyền RBAC V5 đang bảo vệ hệ thống chặt chẽ, từ chối mọi truy cập ẩn danh (`anon`).
> - Kết quả `supabase db push --dry-run --linked` xác nhận không có bất kỳ xung đột (migration drift) nào giữa Local và Cloud DEV.

---

## II. CHI TIẾT KIỂM TRA LỊCH SỬ MIGRATION

Lệnh thực thi: `npx supabase migration list --linked`

| Migration ID | Tên File | Môi trường Local | Môi trường Remote Cloud DEV | Trạng thái |
|---|---|---|---|---|
| `20261011000001` | `foundation_rbac.sql` | 2026-10-11 16:54:00 | 2026-10-11 16:54:00 | **ĐÃ ÁP DỤNG** |
| `20261011000002` | `seed_rbac_v5.sql` | 2026-10-11 17:42:00 | 2026-10-11 17:42:00 | **ĐÃ ÁP DỤNG** |
| `20261011000003` | `rbac_security_functions_rls.sql` | 2026-10-11 18:00:00 | 2026-10-11 18:00:00 | **ĐÃ ÁP DỤNG** |
| `20261011000004` | `domain_vehicles_containers.sql` | 2026-10-11 22:17:00 | 2026-10-11 22:17:00 | **ĐÃ ÁP DỤNG** |
| `20261012000005` | `gate_ticket_atomic_guard.sql` | 2026-10-12 10:57:00 | *(Chưa có)* | **CHỜ DUYỆT PUSH** |
| `20261012000006` | `domain_reefer_power.sql` | 2026-10-12 10:57:00 | *(Chưa có)* | **CHỜ DUYỆT PUSH** |
| `20261012000007` | `domain_financial_ledger.sql` | 2026-10-12 10:58:00 | *(Chưa có)* | **CHỜ DUYỆT PUSH** |
| `20261012000008` | `domain_exit_clearance.sql` | 2026-10-12 11:07:00 | *(Chưa có)* | **CHỜ DUYỆT PUSH** |

### Xác minh SHA-256 Migration 004
- Mã SHA-256 Migration 004 tại Gate C: `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0`
- Trạng thái kiểm tra: **TRÙNG KHỚP 100%**.

---

## III. KẾT QUẢ KIỂM TRA KHẢ NĂNG TRIỂN KHAI (DRY-RUN)

Lệnh thực thi: `npx supabase db push --dry-run --linked`

```
Connecting to remote database...
Scanning supabase/migrations...
Found 4 migrations to apply:
  - 20261012000005_gate_ticket_atomic_guard.sql
  - 20261012000006_domain_reefer_power.sql
  - 20261012000007_domain_financial_ledger.sql
  - 20261012000008_domain_exit_clearance.sql
Dry run complete. No errors found. Remote database is clean.
```

Đánh giá:
1. Không có migration bị bỏ sót hoặc áp dụng sai thứ tự.
2. Không có lỗi phân kỳ lịch sử (remote history drift).
3. 4 file migration sẵn sàng để đẩy lên Cloud DEV trong 1 transaction an toàn ngay khi có lệnh.

---

## IV. ĐỐI CHIẾU DANH MỤC VÀ TRẠNG THÁI BẢNG THỰC TẾ

| Bảng dữ liệu | Trạng thái Cloud DEV | HTTP / Mã lỗi REST | Đánh giá an toàn |
|---|---|---|---|
| `app_yards` | Đã tồn tại (001) | `42501 (Permission Denied)` | **ĐẠT** — RLS chặn anon |
| `app_roles` | Đã tồn tại (001) | `42501 (Permission Denied)` | **ĐẠT** — RLS chặn anon |
| `app_permissions` | Đã tồn tại (001) | `42501 (Permission Denied)` | **ĐẠT** — RLS chặn anon |
| `app_vehicle_types` | Đã tồn tại (004) | `42501 (Permission Denied)` | **ĐẠT** — 7 loại xe V5 được bảo vệ |
| `app_vehicle_visits` | Đã tồn tại (004) | `42501 (Permission Denied)` | **ĐẠT** — RLS an ninh cổng |
| `app_container_visits` | Đã tồn tại (004) | `42501 (Permission Denied)` | **ĐẠT** — RLS quản lý cont |
| `app_tariffs` | Chưa tồn tại | `PGRST205 (Could not find table)` | Đúng với việc 007 chưa push |
| `app_charges` | Chưa tồn tại | `PGRST205 (Could not find table)` | Đúng với việc 007 chưa push |
| `app_payments` | Chưa tồn tại | `PGRST205 (Could not find table)` | Đúng với việc 007 chưa push |
| `app_reefer_power_sessions` | Chưa tồn tại | `PGRST205 (Could not find table)` | Đúng với việc 006 chưa push |
| `app_yard_billing_settings` | Chưa tồn tại | `PGRST205 (Could not find table)` | Đúng với việc 005 chưa push |

---

## V. ĐIỀU KIỆN TIÊN QUYẾT ĐỂ TRIỂN KHAI CLOUD DEV

Trước khi thực hiện `supabase db push --linked` để đẩy 005–008 lên Cloud DEV, bắt buộc:
1. **Có phê duyệt chính thức bằng văn bản từ Chủ dự án.**
2. Chuẩn bị kế hoạch rollback dự phòng.
3. Chạy smoke test các RPC ngay sau khi push (bằng tài khoản service / test script có quyền xác thực).
4. Không thực hiện bất kỳ thao tác reset database nào trên môi trường Cloud DEV.

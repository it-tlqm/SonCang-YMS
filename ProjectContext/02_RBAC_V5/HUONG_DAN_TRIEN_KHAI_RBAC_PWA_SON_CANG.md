# HƯỚNG DẪN CÀI ĐẶT ROLE & PERMISSION — PWA SƠN CẢNG (V5)

**Trạng thái:** Thiết kế triển khai/seed khởi tạo để Antigravity xây dựng; cần test quyền/RLS trước môi trường production. Đọc song song `PROJECT_CONTEXT.md` và workbook V5.

## 1. Kiến trúc được lựa chọn

**Không viết `if (role === 'AN_NINH') ...` trên từng trang.** Thay bằng một permission registry và các ánh xạ quản trị được trong DB. UI chỉ hiển thị action được phép; backend/RLS bảo vệ việc đọc, tạo, sửa và xuất báo cáo.

```text
Auth user (Supabase Auth)
       |
user_role_assignments (user + role + yard + department + thời hạn)
       |
app_roles  ---> role_permissions (role + action + scope) ---> app_permissions
       |                                                   |
       +---- effective permissions -------------------------+
                    |                  |
             UI menu/nút         API + RLS scope + workflow validations
                                       |
                              audit + approvals + transactions
```

**Những thứ chỉnh được không cần code nếu action đã lập trình:** bổ sung nhân viên; đổi vai trò; kiêm nhiệm; thu hồi quyền; mở quyền theo bãi/bộ phận; phân quyền cấp trưởng bộ phận; thay ngày hiệu lực bảng giá; thay thông số giá/15 phút/mốc đêm theo chính sách; bật cờ tính năng đã được lập trình; thay người được phê duyệt. **Những thứ vẫn phải code:** chức năng nghiệp vụ mới, thay đổi invariants an toàn (chốt cont ra, sổ thu, tính lại đêm), thay đổi mô hình dữ liệu/RLS, hay tạo loại giao dịch chưa hỗ trợ.

## 2. Các bảng cấu hình RBAC tối thiểu

| Bảng | Khóa/chính sách | Vai trò |
|---|---|---|
| `departments` | `code` | AN_NINH / CCKB / DIEU_PHOI / HE_THONG / KE_TOAN |
| `yards` | `id uuid` | Chứa Bãi Sơn Cảng; chuẩn bị khả năng mở nhiều bãi về sau |
| `app_roles` | `code text` | 7 role hoạt động, kế toán dự phòng chưa bật |
| `app_permissions` | `code text` | Mã action ổn định, đăng ký trong ứng dụng và seed DB |
| `role_permissions` | `(role_code, permission_code)`, `scope`, `is_enabled` | Cấp quyền theo role qua dữ liệu |
| `user_role_assignments` | `user_id, role_code, yard_id, department_code, valid_from/to` | Ai có role nào, ở bãi/bộ phận nào và đến bao giờ |
| `approval_policies` | `action, request_perm, approve_perm, cannot_self_approve, reason_required` | Luồng phê duyệt linh hoạt, không sửa code |
| `approval_requests` | `requester/approver`, trạng thái, payload trước/sau | Sửa tiền sau thu/điều chỉnh theo nguyên tắc bốn mắt |
| `feature_flags` | `feature_key, enabled, scope` | Giữ module chưa dùng ở trạng thái tắt |
| `app_settings` | `key, value, effective_from` | Quy tắc làm tròn/mốc thời gian/hiển thị/ca |
| `audit_events` | append-only | User, timestamp, IP/device, action, dữ liệu trước/sau, lý do |

Mỗi permission có mã dạng `resource.action` như `container.number.correct`, `reefer.session.amendment.approve` và `exit.actual.confirm`; không dùng tên vai trò tiếng Việt làm khóa logic. Cho phép một người có nhiều role trong thời gian giới hạn, **không cho tự phê duyệt yêu cầu của chính mình**.

## 3. Bốn loại phạm vi (scope)

| Scope | Ý nghĩa | Ví dụ |
|---|---|---|
| `SELF` | Chỉ bản ghi do user thu/thực hiện/phụ trách | Nhân viên xem số tiền mình trực tiếp thu |
| `DEPARTMENT` | Chỉ dữ liệu của bộ phận gắn với assignment | TBP An ninh xem thu của An ninh |
| `YARD` | Xem/thực hiện trên toàn Bãi Sơn Cảng (nếu có quyền action) | An ninh thao tác xe/cont tại bãi |
| `ALL` | Toàn hệ thống, chỉ role quản trị thích hợp | Quản trị kỹ thuật |

Scope phải được kiểm tra theo `yard_id` và `department_code` thực **đọc từ bản ghi server**; API không tin `department_code` do client gửi để đánh giá quyền. Khi một tài khoản có nhiều role, union các grant còn hiệu lực; trong mỗi grant vẫn phải kiểm tra scope và feature flag. Quyền quản trị tối cao bootstrap không được tạo/cấp bừa bằng màn cấu hình thông thường.

## 4. Nguyên tắc bảo mật Supabase

1. Client nhận effective permissions để hiển thị menu/nút, nhưng **server/RLS mới quyết định thao tác thực tế**. Ẩn nút KHÔNG thay thế việc kiểm tra quyền.
2. Bật RLS mọi bảng chứa nghiệp vụ/tiền/người dùng. Function kiểm tra quyền dựa `auth.uid()`/assignment tại DB, không dựa role client tự truyền.
3. Bảng `app_roles`, `role_permissions`, `user_role_assignments` và nhật ký được khóa quyền ghi trực tiếp. Dùng action server/admin RPC được kiểm tra riêng để thay đổi.
4. Không đưa service-role key cho PWA. Backend nếu chạy với service-role để làm tác vụ hệ thống thì phải kiểm tra JWT/actor ở lớp đáng tin và tự ghi audit, vì service-role có thể bypass RLS.
5. Sau khi đổi quyền hoặc khóa tài khoản, backend kiểm tra lại quyền/assignment hiện hành; cache client chỉ để hiển thị và phải refresh khi permission version thay đổi.
6. Chống bấm trùng/idempotency và race condition đối với cổng ra và thu tiền. Việc chốt container ra phải có transaction server, không chỉ nhiều `update` rời rạc từ browser.
7. File ảnh/video và chứng từ tài chính để private storage, quyền đọc theo phạm vi; ảnh chứa thông tin cá nhân không phát link public lâu dài.
8. Nhật ký sửa không được sửa/xóa từ UI; tránh lưu nguyên bí mật/phiên xác thực vào audit.

## 5. Luồng Admin UI thực hiện V1

- **Vai trò:** bảng 7 vai trò đang hoạt động, + Kế toán dự phòng; có nút sao chép role hoặc tạo role mới trên các permission đã đăng ký.
- **Danh mục quyền:** các permission_code nhóm theo Cổng vào, Container, Điện, Thu tiền, Cổng ra, Báo cáo, Quản trị; chỉ xem mã/hướng dẫn và trạng thái tính năng.
- **Ma trận quyền:** hàng = thao tác, cột = role, bật/tắt quyền + chọn scope. Có tìm kiếm, lọc phân hệ, chế độ so sánh trước/sau và nút Lưu có nhật ký.
- **Phân công tài khoản:** chọn người, bãi, bộ phận, một hoặc nhiều role, thời hạn. Role được revoke theo thời điểm, tránh xóa lịch sử thu tiền.
- **Phê duyệt:** chỉnh các chính sách được hỗ trợ như ai duyệt `reefer.session.amendment.approve` và người đề nghị không tự duyệt; không cho đổi bypass các bất biến tài chính.
- **Cấu hình bảng giá:** giá điện theo hai hình thức, phí lưu và các vé; hiệu lực, phiên bản và log; không sửa trực tiếp khoản đã thu.
- **Audit:** log thay đổi role/quyền, cảnh báo phân quyền rộng, ai cấp/thu hồi quyền, ai tự thao tác thay người khác khi được phép.

## 6. Hướng dẫn seed từ XLSX V5

- `19_V5_VAI_TRO` → `app_roles`; `ACCOUNTING_FUTURE.active=false`.
- `20_V5_DANH_MUC_QUYEN` → `app_permissions`; 67 quyền gồm các permission thuộc giai đoạn sau (không cấp quyền/bật feature).
- `21_V5_CAP_QUYEN_SEED` → `role_permissions`; hiện có 206 grant kích hoạt V1, phạm vi SELF/DEPARTMENT/YARD/ALL.
- `22_V5_MA_TRAN_RBAC` → màn hình ma trận kiểm tra/đối chiếu; **không dùng làm bảng lưu quyền trực tiếp**.
- `23_V5_PHÊ_DUYỆT` → `approval_policies` / xử lý điều kiện; `24_V5_THAM_SO` → giá, tham số và cờ tính năng.
- `25_V5_MAPPING_Q01_Q39` giữ liên kết từ 39 dòng phân quyền ban đầu; **tab `04_PHAN_QUYEN` và `17_DE_XUAT_PHAN_QUYEN` chỉ là lịch sử**, không dùng như config runtime.
- `27_V5_RUI_RO_UAT` xác định điều kiện UAT/khóa thiết kế; `28_V5_CHANGELOG` giải thích sửa so với V4.1.

**Seed KHÔNG được `ON CONFLICT DO UPDATE` đè vai trò/quyền đã được chỉnh trên production.** Với role/permission mới chưa có thì thêm, còn thay đổi trên production phải thông qua bản migration có phê duyệt hoặc màn quản trị, có audit. **Không seed user admin bằng mật khẩu/email mẫu** trong tài liệu.

## 7. Luồng bắt buộc cấp quyền đúng

| Luồng | Ai làm thực tế | Permission trong app | Điều kiện |
|---|---|---|---|
| Vào bãi/thu vé | An ninh | `vehicle.visit.create`, `ticket.payment.collect` | Không bỏ yêu cầu cont khi xe có kéo cont |
| Nhận yêu cầu điện trước cont tới | CCKB | `reefer.request.create` | Không tạo lượt cont/giờ lưu giả |
| Cắm/rút ngoài hiện trường | An ninh | `reefer.field_work.note` chỉ để ghi chú/bằng chứng | Giờ điện thực tế do CCKB nhập, không ép An ninh bấm |
| Nhập/sửa giờ điện trước thu | CCKB | `reefer.session.actual_start.record`, `reefer.session.actual_end.record`, `reefer.session.time.edit_unpaid` | Backend làm tròn lên bội 15 phút |
| Điều chỉnh sau thu | CCKB đề nghị; TBP duyệt | `reefer.session.amendment.request`/`.approve` | Khác người; giữ giao dịch cũ, tạo dòng chênh |
| Sửa số cont sai | An ninh, CCKB đối soát | `container.number.correct`, `container.number.discrepancy.port_reconcile` | Audit số cũ/mới, báo CCKB, giữ ID/tiền |
| Duyệt tài chính cho ra | CCKB | `exit.clearance.issue`, `exit.clearance.debt_exception` | Còn nợ phải ghi lý do, không coi là đã thu |
| Chốt cont ra và phí lưu | An ninh | `exit.actual.confirm`, `storage.payment.collect` | Tính tại GIO_CONT_RA thật, không khóa phí từ CCKB/rút điện |
| HÀNG/RỖNG | Điều phối | `container.cargo.update`, `container.cargo.post_exit.approve` | NV đổi khi đang bãi; TBP duyệt thay đổi sau xuất |

## 8. Quy tắc kỹ thuật giữ ổn định khi mở rộng

- Có `actionRegistry` do lập trình viên khai báo cho API/UI với mã quyền ổn định. Đổi role chỉ cập nhật DB, không nhân bản `if(roleName===...)`.
- Thêm tính năng V2 cần mã quyền mới và API/UI tương ứng, seed permission, cập nhật migration; KHÔNG chỉ bật cờ là tự sinh chức năng chưa được lập trình.
- Chính sách phê duyệt có thể thay role nhận duyệt/điều kiện hiển thị, nhưng các invariant: không tự duyệt, không sửa tiền đã thu, không xuất khi thực tế còn cắm điện và không hoàn tất offline là điều kiện ở server không thể cấu hình vô hiệu tùy ý.
- Lưu `actual_occurred_at`, `entered_at`, `entered_by` tách riêng; bản ghi phát sinh tiền được đóng version, mọi thay đổi tạo amendment/audit.
- Cấu hình có cache/version nhưng phải refresh sau thay đổi; các thao tác tài chính luôn kiểm tra quyền trực tiếp phía server.
- Mỗi phí/vé/phiên điện có `charge_id`; nhiều lần thu tách thành payment(s) và allocations. Không suy công nợ lịch sử trực tiếp từ ghi chú cũ.

## 9. Các test phân quyền trước nghiệm thu

1. Nhân viên An ninh tạo xe và thu vé, nhưng không được sửa HÀNG/RỖNG hoặc thu tiền điện.
2. CCKB nhập giờ điện nhưng không được tự ghi xe/container đã ra.
3. Nhân viên CCKB không duyệt đề nghị chênh tiền sau thu của chính mình; TBP duyệt và phát sinh adjustment riêng.
4. Điều phối sửa HÀNG/RỖNG khi còn bãi, còn sau ra phải xin TBP; An ninh chỉ xem.
5. An ninh sửa số cont đã thu tiền, CCKB nhận cảnh báo; giao dịch và liên kết không thay ID.
6. CCKB duyệt xuất còn nợ, hệ thống vẫn thể hiện nợ; khi phí lưu phát sinh sát cổng ra phải kiểm tra khoản nợ mới.
7. NV xem doanh thu của mình, TBP xem doanh thu bộ phận, tài khoản Điều phối không thấy báo cáo thu tiền.
8. Mở/tắt một quyền từ admin UI ảnh hưởng tới API/RLS sau refresh, không chỉ thay nút ẩn.
9. Bất kỳ thao tác thu/ra không được ghi thành công offline; retry không tạo dòng lặp.
10. Tài khoản bị thu hồi role ngay lập tức bị chặn thao tác nhạy cảm dù browser vẫn giữ tab cũ.

## 10. Những lựa chọn cần kiểm chứng bằng UAT thay vì lập trình cứng

RV03: giá điện thay đổi giữa phiên; RV04: giá lưu thay đổi giữa kỳ; RV05–RV06: ứng dụng chưa cập nhật rút và phí lưu phát sinh ở cửa ra; RV09: xác định người trực nếu chung bốt; RV10: dữ liệu legacy chưa xác minh; RV12: chốt doanh thu khác mốc ca. Tất cả đều có kịch bản/giải pháp đề xuất tại workbook V5.

**Kết luận triển khai:** Cơ chế role-permissions có thể thay đổi qua giao diện quản trị mà không sửa code cho nghiệp vụ đã xây dựng; đổi chính sách thời gian/giá qua cấu hình có phiên bản. Mọi thay đổi quyền, phiên bản giá và tiền thu phải có log. Khi tạo PWA, team code nên triển khai bảng quyền + middleware server + RLS trước khi dựng hoàn chỉnh các màn hình nghiệp vụ.

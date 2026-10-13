# CHECKLIST TỐI THIỂU TRƯỚC KHI GỌI HOÀN THÀNH

## Nền tảng & bảo mật

- [ ] Xác nhận repo và lệnh build/lint/test có chạy thật.
- [ ] Seed đúng 67 permission và 206 grants; 7 role active, 1 kế toán inactive.
- [ ] RLS dữ liệu tiền/người dùng/bãi; deny-by-default; scope SELF/DEPARTMENT/YARD/ALL test theo actor thật.
- [ ] Service-role chỉ server; secrets không commit; audit append-only cho thao tác nhạy cảm.
- [ ] Migration repeatability/idempotency, không ghi đè role/giá đã chỉnh production.

## Xe/cont/điện

- [ ] Xe và cont hai lượt độc lập, UUID/FK bất biến; một đầu kéo có thể ra không cont, cont còn trong bãi.
- [ ] Xe rỗng vào 0đ, ra kéo cont khác không tự phát vé 250.000đ.
- [ ] Yêu cầu điện tạo trước cont đến không tạo lượt cont, thời gian thực hay charge.
- [ ] Tìm 7 số cuối/gần giống cảnh báo, ghép thủ công, không tự đổi check-digit.
- [ ] Nhiều phiên điện; không overlap; thực tế bắt đầu/kết thúc khác lúc nhập; sửa có audit; sau thu phải amendment.
- [ ] Điện 3h12→3h15=325.000đ; 4h53→5h=500.000đ; 5h45→575.000đ; 16h35→1.675.000đ ở 100.000đ/h.

## Tiền, phê duyệt và ra

- [ ] Container 1 đêm = 0đ; 2 đêm = 100.000đ; 3 đêm = 200.000đ, kèm case chính xác mốc 22:00, 06:00 theo V5/UAT.
- [ ] Đã CCKB duyệt không khóa trước phí lưu; cont ra thực tế mới chốt charge và khoản nợ phát sinh.
- [ ] CCKB thu điện; An ninh thu vé/lưu; công nợ không bị hiển thị Đã thu.
- [ ] Rút điện vật lý trước xuất; `Đã duyệt tài chính` khác `Đã ra thực tế`.
- [ ] Thanh toán một phần, nợ, mất vé, edit mã cont sau thu không xóa payment; thông tin cũ vẫn audit.
- [ ] Hai người cùng xác nhận ra, retry/chập mạng → chỉ một exit_event và không thu trùng.
- [ ] Offline không tạo kết quả tài chính hay xuất cổng thành công; chỉ nháp/chờ máy chủ.
- [ ] Decision RV01–RV12 còn mở phải được ghi UAT tương ứng thay vì âm thầm gán giá trị.

**Chỉ tích checkbox sau khi đã chạy test và có bằng chứng/log.** Nếu chưa thể chạy, ghi `CHƯA CHẠY` trong `WORK_LOG.md`.

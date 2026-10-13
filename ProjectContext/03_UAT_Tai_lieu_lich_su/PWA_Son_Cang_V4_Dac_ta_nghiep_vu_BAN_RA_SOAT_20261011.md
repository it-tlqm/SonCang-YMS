# ĐẶC TẢ NGHIỆP VỤ WEBSITE + PWA BÃI SƠN CẢNG — V4 (BẢN RÀ SOÁT)

**Ngày cập nhật:** 11/10/2026  
**Trạng thái:** BẢN DỰ THẢO ĐỂ DUYỆT, chưa phải `PROJECT_CONTEXT.md`, chưa cho phép tự coi tất cả giả định là quyết định.  
**Cơ sở:** 117/117 câu trả lời trong file V3 người dùng đã điền; nội dung trao đổi sau khi điền Excel, trong đó **đính chính về phí lưu container** và **chốt làm tròn phí cắm điện theo 15 phút** có hiệu lực ưu tiên cao nhất.

## 0. Nguyên tắc sử dụng tài liệu

- **[CHỐT]**: Đã được người dùng xác nhận trong Excel và/hoặc trao đổi; áp dụng vào V1.
- **[ĐỀ XUẤT]**: Phương án triển khai kỹ thuật để thảo luận, không tự biến thành yêu cầu đã phê duyệt.
- **[CẦN KIỂM TRA]**: Có hai câu trả lời xung đột, hoặc chưa đủ chi tiết để xác nhận phép tính/ngoại lệ; phải kiểm thử/duyệt trước khi chạy thật.
- Nếu lựa chọn trong bảng tính khác câu đính chính **mới hơn và rõ ràng hơn** của người dùng, áp dụng câu đính chính, nhưng vẫn giữ nguyên câu trả lời gốc để truy vết. Đặc biệt, `L04` chọn khóa phí lưu trước 22:00 **không còn áp dụng** sau quyết định cuối cùng: phí lưu container **chỉ tính theo giờ vào và giờ ra thực tế của container**.
- Cơ sở dữ liệu và giao diện không được tự tạo giao dịch “Đã thu” để che khoản nợ hoặc tự ghép container dựa trên chuỗi gần giống.

## 1. Mục tiêu và phạm vi V1

V1 thay thế AppSheet quản lý xe ra/vào và container tại Bãi Sơn Cảng sau giai đoạn UAT và chuyển dữ liệu. Website/PWA sử dụng trên PC và điện thoại, thiết kế cho thao tác nhanh tại cổng/CCKB/Điều phối. V1 phải gồm cổng vào/ra, container độc lập, vé, phí lưu, cắm/rút điện lạnh, tiền thu/công nợ, điều chỉnh sai sót, phân quyền, báo cáo, lịch sử và nhập dữ liệu cũ.

**Có trong V1**: yêu cầu điện dự kiến trước khi container vào; tra cứu 7 ký tự cuối/gợi ý gần giống và xác nhận thủ công; nhiều phiên điện theo một container; thanh toán điện ngay khi rút hoặc khi ra; CCKB duyệt ra thủ công dù còn tiền chưa thu với lý do và công nợ; sửa số container có thông báo và lịch sử; hồ sơ cần hóa đơn ở mức lưu dữ liệu.

**Không bắt buộc hoạt động ngay V1**: phát hành hóa đơn điện tử, sơ đồ khu/dãy/ô container, tích hợp Zalo API tự động, mô-đun miễn/giảm và hoàn tiền đầy đủ, giao ca điện tử, chính sách tài khoản theo ca, in vé tự động (có thể chuẩn bị cấu trúc để triển khai về sau).

## 2. Cơ cấu và phạm vi trách nhiệm

| Bộ phận / Vai trò | Trách nhiệm chính V1 |
|---|---|
| An ninh — nhân viên | Ghi lượt xe/container vào, thu vé; kiểm tra điện dự kiến; thực hiện cắm/rút ngoài hiện trường và báo CCKB qua Zalo; sửa số cont sai có nhật ký; ghi giờ cont ra thực tế, tính và thu **phí lưu container**; xác nhận xe ra. |
| An ninh — Trưởng BP | Giám sát, xử lý sai lệch giờ/xe/container và thao tác thay nhân viên theo phân quyền, lưu audit. |
| Nghiệp vụ cổng cảng kho bãi (CCKB) — nhân viên | Nhận yêu cầu cắm/rút (kể cả dự kiến trước khi cont vào), nhập/sửa giờ cắm/rút An ninh báo, kiểm tra và thu **phí điện**; kiểm tra điều kiện tài chính cho container xuất; có nút xác nhận cho ra thủ công nếu còn phí chưa ghi nhận đủ, phải ghi lý do. |
| CCKB — Trưởng BP | Giám sát, phê duyệt chênh lệch sau thanh toán, sửa trực tiếp theo quyền và xử lý ngoại lệ có nhật ký. |
| Điều phối — NV/TBP | Xác định container **HÀNG/RỖNG**; thông tin có thể tạm trống, không làm dừng tính phí. Việc điều chỉnh có audit. |
| Quản trị | Cấu hình bảng giá, tài khoản/quyền, nhật ký, sao lưu, sửa dữ liệu lịch sử qua giao diện có kiểm soát; không bỏ qua audit. |
| Kế toán (mở rộng) | V3 chọn bổ sung vai trò Kế toán, nhưng V1 mới lưu thông tin phục vụ hóa đơn; chưa tự suy ra phải triển khai phần phát hành hóa đơn. |

**Lưu ý về giao diện bốt An ninh:** V1 có nhu cầu dùng thiết bị cố định; CCKB đăng nhập tài khoản cá nhân. [CẦN KIỂM TRA] Nếu An ninh dùng chung tài khoản bốt, thao tác tài chính phải gắn được người trực tiếp thực hiện (gợi ý: chọn người trực ca/PIN trong từng giao dịch) để đối soát và điều tra sai sót.

## 3. Luồng cổng vào — xe và container

1. **An ninh tạo lượt xe vào**, chọn loại xe; nhập biển số nếu loại xe yêu cầu. Xe bo ba bánh không bắt buộc biển số, phải có mã lượt/mã vé riêng để xác định khi ra.
2. Xe có kéo container: yêu cầu số container; mỗi lượt xe hiện chỉ mang tối đa 1 container (theo `V10`). Tạo hoặc liên kết **lượt container vào** và ghi `GIO_CONT_VAO` thực tế. Lượt xe và lượt container là hai thực thể độc lập: xe ra có thể không mang cont; cont ra có thể đi bằng xe khác.
3. Trường số cont có tìm theo đủ mã, 7 ký tự cuối và gợi ý gần giống; An ninh phải **xác nhận thủ công** mã/link phù hợp. Không tự chấp nhận các gợi ý gần giống.
4. Nếu CCKB đã đăng ký yêu cầu điện trước khi container vào, hiển thị nhãn **“Có yêu cầu điện dự kiến”** và danh sách liên quan; An ninh đối chiếu số cont thực rồi xác nhận ghép yêu cầu với lượt cont.
5. Vé vào lấy bảng giá có hiệu lực tại lượt vào. An ninh mặc định thu ngay; trường hợp thu sau hiếm phải lưu trạng thái `Chưa thu` và nhật ký, không giả `Đã thu`.
6. Đầu kéo **không có container lúc vào** giá vé 0đ. Khi ra kéo container đang lưu trong bãi, **không phát sinh thêm vé container 250.000đ** cho lượt xe đó. Tiền lưu của container ra vẫn tính riêng.
7. Có vé giấy 2 liên; mất liên 02 phát sinh phí phạt **250.000đ** là một khoản độc lập. V1 không buộc phải in vé tự động; cần hỗ trợ ID/mã vé để xử lý đối chiếu.

### 3.1. Bảng giá gốc và điện

| Mã | Tên/đối tượng | Giá hiện tại | Đơn vị |
|---|---|---:|---|
| `CONT_LANH` | Xe container (mã gốc mang tên “Xe container lạnh”; ghi chú người dùng dùng tên “xe cont”) | 250.000đ | lượt |
| `DAU_KEO` | Đầu kéo không container | 0đ | lượt |
| `XE_BO_4_CHAN` | Xe bo 4 chân | 200.000đ | lượt |
| `XE_BO_3_CHAN` | Xe bo 3 chân | 200.000đ | lượt |
| `XE_BO_8_TAN_2_CHAN` | Xe bo 8 tấn/2 chân | 100.000đ | lượt |
| `XE_BO_3_BANH` | Xe bo 3 bánh | 40.000đ | lượt |
| `XE_SANG_TAI` | Xe sang tải (tạp) | 0đ | lượt |
| `LUU_CONTAINER` | Phí lưu container, miễn 01 đêm đầu | 100.000đ | đêm |
| `DIEN_CONT_GIO` | Điện theo giờ | 100.000đ | giờ |
| `DIEN_CONT_LIEN_TUC` | Điện cắm liên tục | 100.000đ | giờ |
| `PHAT_MAT_VE` | Phạt mất liên vé giấy | 250.000đ | lần |

Hai mã điện và mã phạt là **mã chuẩn hóa đề xuất cho dữ liệu mới**, giá trị đã được xác nhận; bảng giá cập nhật phải có ngày hiệu lực và lịch sử giá. [CẦN KIỂM TRA] Chốt xử lý giá thay đổi trong lúc container đang lưu hoặc phiên điện đang chạy (`L09`, `E13` đều có ghi chú linh hoạt A/B).

## 4. Quản lý lượt container và tiền lưu đêm

### 4.1. Công thức nghiệp vụ [CHỐT]

- Khóa nghiệp vụ chính: **lượt container** (`container_visit_id`), không chỉ là chuỗi `SO_CONTAINER`. Cùng một số cont có thể xuất hiện trong nhiều lượt theo thời gian; sửa số không thay ID lượt và quan hệ giao dịch.
- `GIO_CONT_VAO`: lúc container thực vào cổng, kể cả chưa được hạ xuống bãi.
- `GIO_CONT_RA`: lúc container thực sự ra cổng; **đây mới là lúc chốt số kỳ đêm và số tiền lưu**.
- Đơn giá: **100.000đ/container/đêm**, **miễn 01 đêm đầu**, khoảng kỳ đêm **22:00–06:00**. Vào trước 22:00 và còn qua mốc 22:00 ghi một kỳ đêm; cont tới sau 22:00 đến trước 06:00 có kỳ đêm đầu ngay. Lượt trong ngày chưa gặp kỳ đêm vẫn hiển thị số đêm là 1 (miễn phí), theo `L05`.
- Đến đúng 22:00: tính kỳ đêm (`L01=A`). Ra đúng 06:00: vẫn thuộc kỳ đêm trước (`L02=A`). [CẦN KIỂM TRA] Trường hợp nhập vào **đúng 06:00** cần có ca kiểm thử riêng, không tự cộng kỳ đêm vừa kết thúc nếu chưa có thời gian hiện diện hợp lệ trong kỳ đó.
- Công thức tiền lưu trước điều chỉnh: `max(0, SO_DEM_LUU - 1) × DON_GIA_LUU_DEM`. `SO_DEM_LUU` hiển thị tối thiểu 1 (đêm miễn) ngay cả khi không qua đêm theo `L05`; hệ thống nên lưu riêng số kỳ đêm đếm thực tế để kiểm toán phép tính.
- **Tuyệt đối không khóa phí lưu theo giờ CCKB duyệt thanh toán, không khóa phí theo giờ rút điện và không đặt “hạn bảo lưu phí lưu”**. Quy tắc này thay thế cách diễn giải cũ của `L04` sau khi được người dùng đính chính. Khi container rời bãi, **An ninh** ghi giờ ra thực tế, hệ thống tính tiền lưu và An ninh thu.
- Nếu xe rời bãi trước nhưng container ở lại thì **chưa tính chốt phí lưu**, container tiếp tục tính thời gian; xe đến sau kéo container ra sẽ kích hoạt chốt phí.
- `D01`: HÀNG/RỖNG có thể tạm trống; không chặn thu phí lưu; sau này có thể mở thêm quyền cho người đi đếm container.

### 4.2. Ví dụ xác nhận

| Vào cont | Ra cont | Kỳ đêm theo mốc | Số đêm hiển thị | Tiền lưu |
|---|---|---:|---:|---:|
| 10/10 08:00 | 10/10 20:00 | 0 | 1 (miễn) | 0đ |
| 10/10 23:00 | 11/10 05:00 | 1 | 1 (miễn) | 0đ |
| 10/10 08:00 | 12/10 07:00 | 2 | 2 | 100.000đ |
| 10/10 20:00 | 13/10 08:00 | 3 | 3 | 200.000đ |

## 5. Cắm/rút điện lạnh: trước khi vào, thực hiện thực tế và chốt tiền

### 5.1. Đăng ký dự kiến trước khi vào [CHỐT]

- CCKB có thể nhận trước từ khách một yêu cầu cho container A/B/C khi **chưa có xe/container vào bãi**. Mỗi container là một **phiếu riêng**, liên kết được nhiều phiên cắm/rút theo thời gian (theo `PR03=B`).
- Phiếu dự kiến có tối thiểu **số container, khách hàng, hình thức yêu cầu**. Giờ rút dự kiến là thông tin tùy chọn (thường có với “Theo giờ”, thường chưa có với “Cắm liên tục”).
- Khi chưa vào bãi, **không sinh tự động lượt container thực**, không ghi `GIO_CONT_VAO`, không tính phí lưu, không khởi động thời gian điện.
- Khi An ninh nhập lượt container vào, hệ thống tra yêu cầu điện dự kiến theo số đủ, 7 số cuối và gần giống. Phải **xác nhận lựa chọn** để ghép; nếu số khác, người có quyền được sửa phiếu giữ lịch sử.
- Yêu cầu không đến: cho hủy có lịch sử hoặc hết hạn sau số ngày được cấu hình.

### 5.2. Cắm/rút điện thực tế [CHỐT]

- Khách hàng yêu cầu CCKB hoặc báo trực tiếp cho An ninh; quy trình cho phép phối hợp linh hoạt, không bắt buộc mọi lệnh phải tạo trước trên PWA. An ninh đi **cắm/rút thực tế** và báo giờ qua nhóm Zalo, có thể quay/chụp bằng camera kèm timestamp.
- **CCKB** nhập `GIO_CAM_THUC_TE` và `GIO_RUT_THUC_TE` theo bằng chứng/thông báo thực tế; cho nhập bù cả hai giờ trong một lần, không buộc dùng giờ nhập dữ liệu làm giờ thực hiện. Khi sửa giờ lưu cũ/mới, người sửa, thời điểm sửa, lý do.
- Một container được phép có nhiều phiên cắm/rút, nhưng tại một thời điểm chỉ có **một phiên đang cắm**. Mỗi phiên lưu loại dịch vụ, giờ cắm/rút thực, phút thực, phút tính tiền, giá áp dụng, tiền phải thu, tiền đã thu, trạng thái và lịch sử điều chỉnh.
- Phiên **chỉ chốt tiền điện khi đã có giờ rút thực tế**. Không phát sinh khoản thu chính thức từ giờ dự kiến.

### 5.3. Tính tiền điện theo quyết định mới nhất [CHỐT]

- Hệ thống **tự làm tròn LÊN theo mỗi 15 phút** từ thời lượng thực tế của từng phiên: 4 giờ 53 phút → 5 giờ → **500.000đ** với giá 100.000đ/giờ; 4 giờ 01 phút → 4 giờ 15 phút → **425.000đ**.
- Mỗi phiên tính/làm tròn riêng trước khi cộng tiền toàn container. Hai hình thức “Theo giờ” và “Cắm liên tục” hiện cùng giá **100.000đ/giờ**, nhưng là hai dòng bảng giá cấu hình riêng.
- CCKB được điều chỉnh **giờ cắm, giờ rút hoặc thời lượng tính tiền** với lý do và nhật ký; không được xóa dấu vết giá trị máy tự tính ban đầu.
- **Sau khi thu tiền:** Nhân viên CCKB đề nghị điều chỉnh để TBP phê duyệt; TBP có thể sửa trực tiếp theo quyền và phải lưu audit. Giao dịch tiền đã thu giữ nguyên; tạo dòng điều chỉnh/còn phải thu/cần hoàn trả (tùy trường hợp) thay vì ghi đè giao dịch gốc.
- [CẦN KIỂM TRA] Với dữ liệu giây lẻ (4h00m01s), quy định chuẩn hóa độ chính xác tới phút/giây cần kiểm thử; với phiên có giờ cắm = giờ rút, cần quy tắc dữ liệu lỗi hoặc miễn tiền. Không tự áp dụng thu 15 phút cho phiên 0 phút.
- Giá điện áp dụng theo lịch sử hiệu lực và mã dịch vụ; `E13` đã chọn “lúc rút” nhưng ghi chú linh hoạt “A và B”; chưa coi chính sách thay đổi giữa phiên là khóa xong.

## 6. Sửa số container do khách/CCKB/An ninh nhập nhầm

- An ninh có nút **Sửa số container / Báo sai thông tin** trên lượt container thực tế. Cho sửa trong các tình huống phát hiện khi cắm, khi rút, từ ảnh/video hoặc phản ánh của khách.
- Khi sửa lưu **số cont cũ, số mới, người sửa, thời điểm, lý do, bằng chứng tùy chọn**; nếu không có ảnh/video nên ghi lý do thiếu bằng chứng (`SC03=B`).
- Gửi **thông báo nội bộ PWA cho CCKB**, trạng thái CCKB đã xem/chưa xem. Tự động Zalo chưa bắt buộc V1.
- Nếu số thực khác phiếu điện dự kiến, cho sửa phiếu dự kiến và giữ lịch sử, không bắt buộc hủy tạo phiếu mới.
- Nếu sửa sau khi cắm/rút điện hoặc **đã thu tiền**, giữ nguyên các ID và giao dịch đã thu; CCKB nhận thông báo để đối soát. Không để việc sửa số trực tiếp tạo container mới không chủ đích hoặc nhân đôi nghĩa vụ thanh toán.
- Nếu sửa thành mã đã thuộc **lượt container khác đang ở bãi**, theo `SC06=B` được lưu **có cảnh báo**; hệ thống không tự ghép hai lượt, đòi hỏi người dùng phân biệt bằng ID lượt/biển số/giờ vào.
- Nếu đã được CCKB xác nhận tài chính rồi mới phát hiện sửa cont, theo `SC08=B` vẫn cho luồng ra với cảnh báo, không tự động chặn chỉ vì sửa số; trách nhiệm đối soát phải được lưu.

## 7. Thu tiền, cho container ra và xác nhận thực tế

### 7.1. Trách nhiệm thu tiền [CHỐT]

1. **An ninh**: thu vé lúc vào, thu phạt mất vé (theo quyền), ghi giờ ra và tính/thu **phí lưu container** tại chính thời điểm container rời bãi.
2. **CCKB**: xác minh giờ điện, chốt/thu tiền điện theo từng phiên rút hoặc khi container xuất; kiểm soát điều kiện tài chính cho container xuất. CCKB có quyền **bấm “Xác nhận cho ra” thủ công** nếu còn khoản chưa thu, bắt buộc cảnh báo, ghi lý do, giữ nguyên công nợ (`T08`, `OUT01`).
3. **An ninh**: thực hiện thao tác xác nhận ra cổng và nhập giờ thực tế cho **xe** và **container**. Xe ra không kéo cont không yêu cầu CCKB duyệt tài chính riêng cho xe (`T10`).

### 7.2. Luồng ra container [CHỐT khung, CẦN KIỂM TRA một ngoại lệ]

- Chọn đúng **lượt container đang ở bãi** và xe kéo ra. Trước ra, CCKB kiểm tra các phiên điện và khoản điện còn nợ; có thể duyệt thủ công ngoại lệ, không tạo thu tiền giả.
- Khi An ninh xác nhận container ra, lưu `GIO_CONT_RA` thực tế, tính phí lưu và ghi nhận An ninh là người thu khoản này. Khoản đã thanh toán liên quan tới điện không bị tính lại.
- Nếu tiền chưa ghi nhận đủ, phải thấy rõ **chưa thu/còn nợ**, thời điểm, người cho xuất, lý do; không tự sửa trạng thái đã thu. Nếu cùng một lần thu bao gồm nhiều cont hay nhiều loại khoản, sử dụng sổ thu có phân bổ để không đếm trùng.
- [CẦN KIỂM TRA] `T08/OUT01` nói CCKB được phép xuất ngoại lệ khi còn tiền; `CNT01` nói An ninh tính phí lưu đúng lúc ra. Cần nghiệm thu rõ **quyền xuất ngoại lệ khi khoản phí lưu vừa phát sinh chưa được An ninh thu**. Không tự áp dụng “khóa phí lưu” để giải quyết tình huống này.
- Trường hợp trên PWA vẫn hiện “Đang cắm” nhưng An ninh xác nhận đã rút ngoài thực tế: ưu tiên hiển thị cảnh báo và cho CCKB xác nhận ngoại lệ có lý do; không tự sửa `GIO_RUT_THUC_TE` hoặc giả định đã thu. Chốt UX này trong UAT vì `E07` chọn bắt buộc ghi nhận nhưng ghi chú thực tế ưu tiên linh hoạt.

### 7.3. Sổ thu chung [CHỐT nghiệp vụ, ĐỀ XUẤT cấu trúc]

- `CHARGES`: các nghĩa vụ phải thu riêng: vé, phí lưu container, điện từng phiên, phạt mất vé. Lưu `source_type/source_id`, số tiền phải thu, đã phân bổ, còn nợ, trạng thái.
- `PAYMENTS`: mỗi lần thực nhận tiền có người thu, thời gian, phương thức (tiền mặt/chuyển khoản), thông tin chứng từ; một lần nhận có thể tách thành nhiều dòng phương thức theo `T02`.
- `PAYMENT_ALLOCATIONS`: phân bổ khoản tiền nhận vào nhiều CHARGES/cont theo `T11`; cùng một đồng tiền chỉ được ghi nhận doanh thu một lần.
- Hỗ trợ thanh toán điện từng phần (`T01`), không đồng nghĩa với quy định trả trước phí lưu khi container còn ở bãi (`L08` chọn không).
- Các nghiệp vụ giảm giá, miễn giảm, hoàn tiền và tự đối chiếu sao kê: có thể tạo kiến trúc dữ liệu nhưng **không tự kích hoạt V1** theo ghi chú người dùng.

## 8. Báo cáo, chứng từ, hóa đơn

- Dashboard: xe trong bãi, container trong bãi, yêu cầu điện dự kiến, đang cắm, mới rút, khoản chưa thu, doanh thu theo loại phí.
- Báo cáo ca/nhân viên/bộ phận/ngày/tháng, lịch sử chỉnh sửa, xuất Excel; có thể xuất PDF khi làm mẫu nội bộ. Tách **giờ làm việc ca** (ví dụ An ninh 06:00–18:00) và **mốc chốt doanh thu thực tế** (có thể 16:00 hoặc 08:30/09:00) để không cắt sai doanh thu (`T14`). V1 vẫn giao ca ngoài hệ thống (`R02=C`).
- V1 chỉ **lưu dữ liệu phục vụ hóa đơn** và cờ cần hóa đơn, tên người mua/doanh nghiệp, MST hoặc CCCD, địa chỉ, số điện thoại, email khi có. Chưa tích hợp phát hành hóa đơn. Công việc kế toán được để dành cho giai đoạn tiếp theo theo `INV01/INV02`.
- Ảnh/video cắm/rút ngoài hiện trường được gắn nguồn và thời gian khi có. Ảnh thu tiền/chứng từ chuyển khoản là phần có thể triển khai dần, không suy ra mọi giao dịch V1 đều bắt buộc ảnh vì `T04` ghi “xây dựng nhưng chưa áp dụng”.

## 9. Mô hình dữ liệu [ĐỀ XUẤT kỹ thuật]

| Bảng / thực thể | Nội dung/quan hệ chính |
|---|---|
| `vehicle_visits` | Lượt xe, loại xe, biển số (có thể trống với xe ba bánh), giờ vào/ra, NV An ninh, phiếu giấy/ID lượt, vé. |
| `container_visits` | Lượt container vào/ra, số container hiện tại, số gốc, lượt xe vào/ra, giờ thực tế, HÀNG/RỖNG, phí lưu; không đồng nhất với hồ sơ số cont. |
| `container_number_changes` | Số cũ/mới, người sửa, lý do, ảnh (nếu có), liên kết đối soát CCKB. |
| `reefer_requests` | Một phiếu dự kiến/thực cho mỗi container; khách hàng, loại yêu cầu, mã cont dự kiến, liên kết container_visit khi có, hủy/hết hạn. |
| `reefer_sessions` | Từng lần cắm/rút, giờ thực, thời lượng gốc, thời lượng tính phí, giá, điều chỉnh, người nhập. |
| `tariff_versions` | Giá theo mã dịch vụ, hiệu lực từ/đến, người đổi; giá phát sinh gắn phiên/charge. |
| `charges`, `payments`, `payment_allocations` | Phải thu, đã thu, phân bổ, công nợ/điều chỉnh sau thu, không thu trùng. |
| `exit_clearances` | CCKB xác nhận đủ tài chính hoặc cho ra ngoại lệ, lý do, cảnh báo/nợ, người xác nhận. |
| `users`, `roles`, `permissions` | Vai trò và phạm vi; V1 bốt/ca vận hành phải giải bài toán người thao tác. |
| `alerts`, `attachments`, `audit_events` | Thông báo sửa mã, điện dự kiến, bằng chứng, lịch sử bất biến của các thao tác nhạy cảm. |
| `legacy_imports` | Mã cũ, bảng nguồn, ngày nhập, kết quả đối chiếu, trạng thái dữ liệu cũ chưa xác minh. |

**Yêu cầu giao dịch:** Việc xác nhận xe/container ra phải có giao dịch server nguyên tử cho các bản ghi liên quan, khóa chống bấm đúp/thu trùng và ràng buộc quyền; không dùng chỉnh sửa hàng loạt Google Sheets làm nguồn sự thật khi đã chuyển hệ thống.

## 10. Các màn hình chính V1 [ĐỀ XUẤT]

- **An ninh — Cổng vào:** tạo lượt xe, chọn loại, nhập biển/cont; cảnh báo điện dự kiến; vé vào/thu tiền; tìm trùng/7 số cuối.
- **An ninh — Trong bãi/Cổng ra:** danh sách xe/cont đang ở bãi; ghép cont ra với xe; phí lưu tại giờ ra; thu tiền; xác nhận ra; báo sai số; cảnh báo CCKB.
- **CCKB — Điện dự kiến:** nhận yêu cầu nhiều cont (mỗi cont 1 phiếu); tạo/sửa/hủy; theo dõi chưa vào, đã vào, chờ cắm.
- **CCKB — Điện thực tế:** nhập/bổ sung giờ, phân loại phiên, 15 phút tự làm tròn; sửa giờ/tiền; lịch sử; thu điện từng phần/tổng hợp.
- **CCKB — Cho container ra:** tiền điện phải thu/đã thu/chưa thu; phê duyệt cho ra thường hoặc thủ công kèm lý do và công nợ; danh sách cảnh báo cần kiểm tra.
- **Điều phối:** HÀNG/RỖNG, danh sách container chưa xác định, lịch sử chỉnh sửa.
- **TBP/Quản trị:** yêu cầu điều chỉnh sau thu, cảnh báo sai số trùng, dashboard/thu theo ca, bảng giá, người dùng, nhật ký, nhập và sửa dữ liệu legacy.

Mỗi trang cần thao tác ít chạm trên điện thoại, chữ dễ đọc, phân rõ đã/chưa thu/được cho ra; hỗ trợ tìm kiếm nhanh và lọc trạng thái. Màu thương hiệu định hướng xanh `#0A9444`, xanh đậm `#223873`; cần lựa chọn giao diện sáng dễ nhìn ở hiện trường.

## 11. Hạ tầng, ngoại tuyến, dữ liệu lịch sử

- **[CHỐT định hướng]** Next.js + PostgreSQL/Supabase, hosting Vercel; domain phụ của công ty hoặc domain miễn phí Vercel tùy điều kiện triển khai. Chi phí miễn phí của dịch vụ bên ngoài phải đối chiếu giới hạn thực tế trước khi vận hành, không mặc định đủ miễn phí lâu dài.
- **[CHỐT]** Có môi trường test và production riêng; nhật ký thao tác; sao lưu hằng ngày; phân quyền theo máy chủ và RLS nếu dùng Supabase; dữ liệu thanh toán không được chỉ chặn bằng UI.
- **[CHỐT]** Khi mất mạng PWA cho ghi nháp/đợi đồng bộ, **không tự báo “đã ra cổng” từ dữ liệu offline**. Quy trình giấy khi sự cố vẫn được giữ theo phương án nghiệm thu/dự phòng; cần nhập và đối chiếu sau.
- **[CHỐT]** Chuyển **toàn bộ lịch sử** VEHICLE, CONTAINER; giữ ID gốc hoặc `legacy_id` truy vết; dữ liệu cũ có rất nhiều trường hợp chưa chốt xe/cont ra, tiền không khớp ghi chú. **Không tự phát sinh công nợ mới từ dòng lịch sử chưa xác minh** và không khẳng định xe còn bãi chỉ vì `GIO_RA` đang trống do quên nhập.
- **[CHỐT]** Cho Quản trị cấp cao sửa dữ liệu legacy qua màn hình kiểm soát và audit; không thiết kế phương án “sửa trực tiếp PostgreSQL” để giải quyết lỗi nghiệp vụ. Cần báo cáo ngoại lệ nhập liệu trước khi đưa dữ liệu vào luồng thu tiền thật.
- UAT theo các kịch bản của file XLSX đi kèm; ngừng AppSheet sau UAT và kế hoạch cắt chuyển, có dự phòng giấy. Người dùng chọn `U01=Không áp dụng` nên không tự thêm thủ tục ký nghiệm thu nhiều bộ phận bắt buộc nếu chưa thống nhất.

## 12. Ma trận kiểm thử trọng tâm

| Mã | Mục tiêu quan trọng | Kết quả mong đợi |
|---|---|---|
| UAT02 | Đầu kéo 0đ vào, kéo cont ra | Không thu thêm 250k vé; vẫn tính phí lưu cont. |
| UAT07 | Xe gốc ra để cont lại | Cont vẫn trong bãi, chưa chốt phí lưu. |
| UAT13 | Rút điện trước 22h, cont ra sau 22h | Điện tính đến giờ rút; lưu cont tính theo giờ ra, không khóa phí lưu. |
| UAT16–UAT19 | Yêu cầu điện dự kiến A/B/C và ghép khi vào | Một phiếu/cont, không tự tạo lượt cont vào; An ninh xác nhận ghép, sửa có audit. |
| UAT23 | 4h53' điện | 5 giờ; 500.000đ ở giá hiện hành. |
| UAT25 | Hai phiên điện 1h01' | Từng phiên thành 1h15', không gộp trước làm tròn. |
| UAT28–UAT29 | Sửa điện sau thu | Giao dịch đã thu giữ nguyên; xử lý chênh với quyền TBP và audit. |
| UAT32–UAT34 | Sửa mã cont sau thu/duyệt ra, mã trùng | Có cảnh báo, thông báo CCKB, không mất liên kết và không tự chặn chỉ vì sửa số. |
| UAT38 | CCKB cho ra dù còn khoản chưa thu | Có lý do, cảnh báo, giữ công nợ; An ninh xác nhận ra thực tế. |
| UAT40 | Cont thực ra | An ninh tính/thu phí lưu tại `GIO_CONT_RA`, không lấy giờ rút điện/duyệt CCKB. |
| UAT41 | Mất Internet tại cổng | Không xác nhận thành công offline; nhập nháp/chờ đồng bộ. |
| UAT42 | Chuyển dữ liệu AppSheet thiếu giờ ra | Cảnh báo legacy, không tự tạo công nợ thật hoặc coi chắc xe còn bãi. |

Danh sách kiểm thử đầy đủ **44 tình huống** có tại tab `14_V4_KICH_BAN` của workbook V4.

## 13. Danh sách những điểm cần kiểm tra lại trước khi phát hành bản triển khai

Các điểm này **không phải yêu cầu người dùng điền lại 117 câu**. Chỉ là thông số biên, mâu thuẫn hoặc quyết định kỹ thuật sẽ cần xác minh bằng quy trình test/vận hành, đã chuyển sang tab `15_V4_DIEM_CAN_KIEM` của XLSX:

- **RV01 [P1]** Giờ cắm/rút chính xác tới giây hay phút? Một phiên 4h00m01s có làm tròn lên 4h15 không? ĐỀ XUẤT: form nhận phút, backend dùng timestamp thật, làm tròn theo phần lẻ; chưa có xác nhận về cách xử lý giây. *(Tham chiếu: E09)*
- **RV02 [P1]** Phiên điện 0 phút hoặc dưới 1 phút tính tối thiểu bao nhiêu? ĐỀ XUẤT: thời lượng >0 tính tối thiểu 15 phút; bằng 0 là dữ liệu chưa hợp lệ, yêu cầu giải trình. *(Tham chiếu: E10)*
- **RV03 [P0]** Giá điện thay đổi giữa phiên, lấy giá lúc bắt đầu hay lúc rút? E13 chọn B nhưng ghi chú tùy A/B. Chưa định luật giá mặc định; cần ngày hiệu lực rõ, lịch sử giá. *(Tham chiếu: E13)*
- **RV04 [P1]** Đơn giá phí lưu thay đổi khi cont còn trong bãi, tính theo giờ vào hay từng kỳ đêm? L09 chọn B nhưng ghi chú A/B linh hoạt; yêu cầu chốt nguyên tắc hiệu lực chính sách. *(Tham chiếu: L09)*
- **RV05 [P0]** CCKB cho ra khi điện vẫn báo Đang cắm nhưng thực tế đã rút, quy trình ghi nhật ký và khắc phục ra sao? E07 chọn A nhưng diễn giải ưu tiên linh hoạt. Thiết kế cảnh báo + CCKB xác nhận thủ công, cần phê duyệt tiêu chí sử dụng ngoại lệ. *(Tham chiếu: E07,T08,OUT01)*
- **RV06 [P0]** Tại bước An ninh ghi giờ ra và tính phí lưu, có cho ra với phí lưu chưa thu theo cơ chế ngoại lệ CCKB không? T08/OUT01 cho CCKB duyệt nợ nhưng chưa chỉ ra rõ có áp dụng phí lưu phát sinh đúng giờ ra hay không. *(Tham chiếu: CNT01,T08,OUT01)*
- **RV07 [P1]** Xe cont thường/cont lạnh sử dụng một mã nội bộ CONT_LANH hay đổi mã chung XE_CONTAINER? V03 ghi chỉ xe cont 250k và đầu kéo trống 0đ. Đề xuất đổi nhãn hiển thị “Xe container”, không tự thay khóa giá gốc. *(Tham chiếu: V03)*
- **RV08 [P1]** Có cần vai trò Kế toán hoạt động V1 hay chỉ khai báo để giai đoạn sau sử dụng? P01 chọn thêm Kế toán; INV02 chỉ lưu dữ liệu hóa đơn chưa tích hợp; đề xuất tài khoản Kế toán quyền xem danh sách khi sẵn sàng. *(Tham chiếu: P01,INV01,INV02)*
- **RV09 [P0]** Bốt An ninh dùng chung tài khoản/thiết bị: xác định người chịu trách nhiệm mỗi thao tác bằng cơ chế nào? P07 yêu cầu giai đoạn đầu máy bốt cố định, nhưng báo cáo nhân viên/audit cần người thực hiện; đề xuất PIN ca/đổi người thao tác. *(Tham chiếu: P07,P08)*
- **RV10 [P0]** Các dữ liệu legacy sau chuyển được đánh dấu đúng trạng thái và không tự tính công nợ khi giờ ra đang thiếu. M03 không muốn đối soát toàn bộ tiền cũ, nhiều xe bỏ sót giờ ra; đề xuất nhóm dữ liệu cần kiểm tra và không phát sinh nghĩa vụ phải thu tự động. *(Tham chiếu: M01,M03,M04)*
- **RV11 [P2]** Tự động gửi Zalo và lưu ảnh/chứng từ đến mức nào trong V1? K09 ghi A/B/C nhưng nhu cầu thực tế Zalo thủ công; đề xuất app có thông báo nội bộ trước, Zalo tích hợp để fase sau. *(Tham chiếu: K09,K06)*
- **RV12 [P1]** Thời điểm khóa chốt doanh thu ca có cố định 06–18 hay linh hoạt theo thời điểm nộp tiền? T14 cho giờ chốt tiền khác ca làm việc; đề xuất tách ca làm việc, ca thu tiền và mốc báo cáo. *(Tham chiếu: T14)*


## 14. Thứ tự ưu tiên chuẩn bị sang Antigravity (ĐỀ XUẤT)

1. Duyệt logic luồng thực tế **xe vào → container vào → điện dự kiến/thực tế → rút điện/thu điện → CCKB xác nhận cho ra → An ninh ghi cont ra/tính lưu/thu → xe ra**; trong đó xe ra không kéo cont có đường riêng.
2. Chạy kiểm thử P0 đối với **giờ ra, phí lưu, làm tròn điện, sửa số container, thanh toán một phần, duyệt ra còn nợ, thao tác đồng thời và offline**.
3. Khóa các quy tắc chưa đủ căn cứ tại mục 13 hoặc đánh dấu cấu hình chờ quyết định; không để tác nhân AI tự bịa cơ chế nghiệp vụ.
4. Lập thiết kế database và ma trận quyền theo **từng thao tác** (không chỉ vai trò xem trang), xây mockup giao diện sáng PWA, chuẩn hóa dữ liệu cũ, test pilot.
5. **Chỉ sau khi bản V4 được người dùng duyệt**, mới chuyển thành `PROJECT_CONTEXT.md` dùng để triển khai trên Antigravity/Stitch.

---

**Phụ lục nguồn:** Workbook V3 người dùng đã trả lời 117 mã câu hỏi (tab `01_CAU_HOI`), giữ nguyên trong workbook V4 kèm các tab bổ sung. Mỗi quyết định nghiệp vụ ở bảng `13_V4_QUY_TAC` đều có mã câu tham chiếu. Không sử dụng nội dung tạm/đánh giá tự động N/O của V3 như thể là câu trả lời mới của người dùng.

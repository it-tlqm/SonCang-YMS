/**
 * SƠN CẢNG YMS — KIỂM THỬ THUẬT TOÁN TÍNH PHÍ LƯU BÃI (22:00-06:00 V5)
 */

function calculateStorageFeeOffline(inboundAtStr, outboundAtStr) {
  const inDate = new Date(inboundAtStr);
  const outDate = outboundAtStr ? new Date(outboundAtStr) : new Date();
  if (outDate <= inDate || isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
    return { totalNights: 0, chargedNights: 0, fee: 0 };
  }

  // Chuyển sang ngày theo múi giờ Việt Nam (UTC+7)
  const getVnDate = (d) => {
    const vnTime = new Date(d.getTime() + 7 * 3600 * 1000);
    return vnTime.toISOString().substring(0, 10);
  };

  const inVnDateStr = getVnDate(inDate);
  const outVnDateStr = getVnDate(outDate);

  // Bắt đầu từ ngày vào - 1 ngày
  const cur = new Date(inVnDateStr + 'T00:00:00+07:00');
  cur.setDate(cur.getDate() - 1);
  const end = new Date(outVnDateStr + 'T00:00:00+07:00');

  let totalNights = 0;
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    const curStr = `${y}-${m}-${d}`;

    const next = new Date(cur.getTime() + 24 * 3600 * 1000);
    const ny = next.getFullYear();
    const nm = String(next.getMonth() + 1).padStart(2, '0');
    const nd = String(next.getDate()).padStart(2, '0');
    const nextStr = `${ny}-${nm}-${nd}`;

    const nightStart = new Date(`${curStr}T22:00:00+07:00`);
    const nightEnd = new Date(`${nextStr}T06:00:00+07:00`);

    if (inDate < nightEnd && outDate > nightStart) {
      totalNights++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  const chargedNights = Math.max(0, totalNights - 1);
  return { totalNights, chargedNights, fee: chargedNights * 100000 };
}

function runTests() {
  console.log('=== TEST KIỂM THỬ THUẬT TOÁN PHÍ LƯU BÃI (MỐC 22:00-06:00 V5) ===\n');

  const cases = [
    {
      desc: 'Cùng ngày, vào 08:00, ra 18:00 (chưa qua đêm 22:00)',
      inbound: '2026-10-10T08:00:00+07:00',
      outbound: '2026-10-10T18:00:00+07:00',
      expectedTotal: 0,
      expectedCharged: 0,
      expectedFee: 0,
    },
    {
      desc: 'Qua 1 đêm: Vào 20:00 ngày 10, ra 08:00 ngày 11 (Miễn phí đêm đầu)',
      inbound: '2026-10-10T20:00:00+07:00',
      outbound: '2026-10-11T08:00:00+07:00',
      expectedTotal: 1,
      expectedCharged: 0,
      expectedFee: 0,
    },
    {
      desc: 'Qua 2 đêm: Vào 20:00 ngày 10, ra 08:00 ngày 12 (Tính 1 đêm có phí = 100k)',
      inbound: '2026-10-10T20:00:00+07:00',
      outbound: '2026-10-12T08:00:00+07:00',
      expectedTotal: 2,
      expectedCharged: 1,
      expectedFee: 100000,
    },
    {
      desc: 'Qua 3 đêm: Vào 20:00 ngày 10, ra 08:00 ngày 13 (Tính 2 đêm có phí = 200k)',
      inbound: '2026-10-10T20:00:00+07:00',
      outbound: '2026-10-13T08:00:00+07:00',
      expectedTotal: 3,
      expectedCharged: 2,
      expectedFee: 200000,
    },
    {
      desc: 'Vào ban đêm: Vào 23:30 ngày 10, ra 05:30 ngày 11 (Cắt đêm 22:00-06:00, miễn đêm đầu)',
      inbound: '2026-10-10T23:30:00+07:00',
      outbound: '2026-10-11T05:30:00+07:00',
      expectedTotal: 1,
      expectedCharged: 0,
      expectedFee: 0,
    },
  ];

  let allPass = true;
  for (const c of cases) {
    const res = calculateStorageFeeOffline(c.inbound, c.outbound);
    const pass = res.totalNights === c.expectedTotal && res.chargedNights === c.expectedCharged && res.fee === c.expectedFee;
    if (!pass) allPass = false;
    console.log(`${pass ? '✓ PASS' : '✗ FAIL'}: ${c.desc}`);
    console.log(`   Mong đợi: ${c.expectedTotal} đêm tổng, ${c.expectedCharged} đêm tính phí, ${c.expectedFee}đ`);
    console.log(`   Thực tế:  ${res.totalNights} đêm tổng, ${res.chargedNights} đêm tính phí, ${res.fee}đ\n`);
  }

  if (allPass) {
    console.log('>>> 100% TEST CASE TÍNH PHÍ LƯU BÃI 22:00-06:00 PASS <<<\n');
  } else {
    console.error('>>> CÓ TEST CASE TÍNH PHÍ LƯU BÃI FAIL <<<\n');
    process.exit(1);
  }
}

runTests();

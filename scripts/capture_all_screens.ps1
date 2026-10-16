$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) {
    $edge = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
$outDir = "d:\thanhnx\OpenCode\YMS-project\docs\user_inserted_images"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$screens = @(
    # --- PHÂN HỆ BẾN BÃI (/yard) ---
    @{
        Name = "IMG-YARD-01-dashboard.png"
        Url = "http://localhost:3000/yard?demo_role=DIS_STAFF&tab=pairs"
        Delay = 7000
    },
    @{
        Name = "IMG-YARD-02-zones-grid.png"
        Url = "http://localhost:3000/yard?demo_role=DIS_STAFF&tab=zones"
        Delay = 7000
    },
    @{
        Name = "IMG-YARD-03-modal-add-cabinet.png"
        Url = "http://localhost:3000/yard?demo_role=SYS_ADMIN&tab=zones&modal=add_cabinet"
        Delay = 7000
    },
    @{
        Name = "IMG-YARD-04-modal-quick-plug.png"
        Url = "http://localhost:3000/yard?demo_role=DIS_STAFF&tab=zones&modal=quick_plug"
        Delay = 7000
    },
    @{
        Name = "IMG-YARD-05-modal-edit-plate.png"
        Url = "http://localhost:3000/yard?demo_role=SYS_ADMIN&tab=pairs&modal=edit_plate"
        Delay = 7000
    },
    @{
        Name = "IMG-YARD-06-modal-assign-zone.png"
        Url = "http://localhost:3000/yard?demo_role=DIS_STAFF&tab=pairs&modal=assign_zone"
        Delay = 7000
    },

    # --- PHÂN HỆ ĐIỆN LẠNH CCKB (/reefer) ---
    @{
        Name = "IMG-REEFER-01-active-sessions.png"
        Url = "http://localhost:3000/reefer?demo_role=PORT_STAFF&tab=SESSIONS"
        Delay = 7000
    },
    @{
        Name = "IMG-REEFER-02-ready-queue.png"
        Url = "http://localhost:3000/reefer?demo_role=PORT_STAFF&tab=UNPLUGGED"
        Delay = 7000
    },
    @{
        Name = "IMG-REEFER-03-modal-create-request.png"
        Url = "http://localhost:3000/reefer?demo_role=PORT_STAFF&modal=create_request"
        Delay = 7000
    },
    @{
        Name = "IMG-REEFER-04-modal-plug.png"
        Url = "http://localhost:3000/reefer?demo_role=PORT_STAFF&modal=plug"
        Delay = 7000
    },
    @{
        Name = "IMG-REEFER-05-modal-unplug.png"
        Url = "http://localhost:3000/reefer?demo_role=PORT_STAFF&modal=unplug"
        Delay = 7000
    },
    @{
        Name = "IMG-REEFER-06-modal-temp-log.png"
        Url = "http://localhost:3000/reefer?demo_role=PORT_STAFF&tab=TEMP_LOGS&modal=temp_log"
        Delay = 7000
    },

    # --- PHÂN HỆ CỔNG RA (/exit) ---
    @{
        Name = "IMG-EXIT-01-gate-checklist.png"
        Url = "http://localhost:3000/exit?demo_role=SEC_STAFF&tab=GATE_EXIT"
        Delay = 7000
    },
    @{
        Name = "IMG-EXIT-02-modal-unified-exit.png"
        Url = "http://localhost:3000/exit?demo_role=SEC_STAFF&tab=GATE_EXIT&modal=unified_exit"
        Delay = 7000
    },
    @{
        Name = "IMG-EXIT-03-clearance-queue.png"
        Url = "http://localhost:3000/exit?demo_role=PORT_STAFF&tab=CLEARANCE"
        Delay = 7000
    },
    @{
        Name = "IMG-EXIT-04-modal-debt-guarantee.png"
        Url = "http://localhost:3000/exit?demo_role=PORT_LEAD&tab=CLEARANCE&modal=debt_guarantee"
        Delay = 7000
    },
    @{
        Name = "IMG-EXIT-05-modal-receipt.png"
        Url = "http://localhost:3000/exit?demo_role=SEC_STAFF&tab=GATE_EXIT&modal=receipt"
        Delay = 7000
    },

    # --- PHÂN HỆ SỔ CÁI THU PHÍ (/billing) ---
    @{
        Name = "IMG-BILLING-01-ledger-table.png"
        Url = "http://localhost:3000/billing?demo_role=SYS_ADMIN&tab=LEDGER"
        Delay = 7000
    },
    @{
        Name = "IMG-BILLING-02-modal-collect.png"
        Url = "http://localhost:3000/billing?demo_role=SYS_ADMIN&tab=LEDGER&modal=collect"
        Delay = 7000
    },
    @{
        Name = "IMG-BILLING-03-modal-batch.png"
        Url = "http://localhost:3000/billing?demo_role=SYS_ADMIN&tab=LEDGER&modal=batch"
        Delay = 7000
    },
    @{
        Name = "IMG-BILLING-04-modal-receipt.png"
        Url = "http://localhost:3000/billing?demo_role=SYS_ADMIN&tab=LEDGER&modal=receipt"
        Delay = 7000
    },

    # --- PHÂN HỆ KẾ TOÁN (/accounting) ---
    @{
        Name = "IMG-ACCOUNTING-01-cash-settlement.png"
        Url = "http://localhost:3000/accounting?demo_role=ACCOUNTANT&tab=CASH_SETTLEMENT"
        Delay = 7000
    },
    @{
        Name = "IMG-ACCOUNTING-02-modal-settlement.png"
        Url = "http://localhost:3000/accounting?demo_role=ACCOUNTANT&tab=CASH_SETTLEMENT&modal=settlement"
        Delay = 7000
    },
    @{
        Name = "IMG-ACCOUNTING-03-modal-print-settlement.png"
        Url = "http://localhost:3000/accounting?demo_role=ACCOUNTANT&tab=CASH_SETTLEMENT&modal=print_settlement"
        Delay = 7000
    },
    @{
        Name = "IMG-ACCOUNTING-04-invoices-ledger.png"
        Url = "http://localhost:3000/accounting?demo_role=ACCOUNTANT&tab=INVOICES"
        Delay = 7000
    },
    @{
        Name = "IMG-ACCOUNTING-05-modal-invoice.png"
        Url = "http://localhost:3000/accounting?demo_role=ACCOUNTANT&tab=INVOICES&modal=invoice"
        Delay = 7000
    },
    @{
        Name = "IMG-ACCOUNTING-06-debts-management.png"
        Url = "http://localhost:3000/accounting?demo_role=ACCOUNTANT&tab=DEBTS"
        Delay = 7000
    },

    # --- PHÂN HỆ BÁO CÁO (/reports) ---
    @{
        Name = "IMG-REPORTS-01-operations.png"
        Url = "http://localhost:3000/reports?demo_role=SYS_ADMIN&tab=VEHICLES"
        Delay = 7000
    },
    @{
        Name = "IMG-REPORTS-02-financial.png"
        Url = "http://localhost:3000/reports?demo_role=SYS_ADMIN&tab=REVENUE"
        Delay = 7000
    },

    # --- PHÂN HỆ QUẢN TRỊ (/admin) ---
    @{
        Name = "IMG-ADMIN-01-users-list.png"
        Url = "http://localhost:3000/admin/users?demo_role=SYS_ADMIN&tab=USERS"
        Delay = 7000
    },
    @{
        Name = "IMG-ADMIN-02-modal-add-user.png"
        Url = "http://localhost:3000/admin/users?demo_role=SYS_ADMIN&tab=USERS&modal=add_user"
        Delay = 7000
    },
    @{
        Name = "IMG-ADMIN-03-rbac-matrix.png"
        Url = "http://localhost:3000/admin/users?demo_role=SYS_ADMIN&tab=MATRIX"
        Delay = 7000
    },
    @{
        Name = "IMG-ADMIN-04-audit-logs.png"
        Url = "http://localhost:3000/admin/audit-logs?demo_role=SYS_ADMIN"
        Delay = 7000
    }
)

Write-Host "=== PRE-WARMING ROUTES TRUOC KHI CHUP ==="
$routes = @(
    "http://localhost:3000/yard",
    "http://localhost:3000/reefer",
    "http://localhost:3000/exit",
    "http://localhost:3000/billing",
    "http://localhost:3000/accounting",
    "http://localhost:3000/reports",
    "http://localhost:3000/admin/users",
    "http://localhost:3000/admin/audit-logs"
)

foreach ($r in $routes) {
    try {
        $null = Invoke-WebRequest -Uri $r -UseBasicParsing -TimeoutSec 15
        Write-Host "Warm: $r [OK]"
    } catch {
        Write-Host "Warm fail: $r"
    }
}

Write-Host "`n=== BAT DAU CHUP TOAN BO MAN HINH NGOAI & TUNG MODAL ==="
$count = 0
foreach ($s in $screens) {
    $count++
    $outPath = Join-Path $outDir $s.Name
    Write-Host "[$count/$($screens.Count)] Chup: $($s.Name)..."
    
    # Run Edge headless screenshot
    $proc = Start-Process -FilePath $edge -ArgumentList @(
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--window-size=1440,900",
        "--virtual-time-budget=$($s.Delay)",
        "--screenshot=$outPath",
        $s.Url
    ) -PassThru -Wait
    
    if (Test-Path $outPath) {
        $len = (Get-Item $outPath).Length
        Write-Host " -> OK ($len bytes)"
    } else {
        Write-Host " -> LOI: Khong tao duoc tep"
    }
}

Write-Host "`n=== HOAN TAT CHUP TOAN BO ANH THUC TE! ==="

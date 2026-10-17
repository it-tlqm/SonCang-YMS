/**
 * OFFLINE QUEUE MANAGER — Quản lý hàng đợi tiếp nhận xe ngoại tuyến
 * Bến bãi / Cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh
 *
 * Tuân thủ quy tắc an toàn bảo mật & tài chính:
 * - Khi mất mạng: Chỉ ghi nhận ở trạng thái DRAFT (Nháp), lưu vào máy bốt trực (localStorage).
 * - Tuyệt đối không tự ý khẳng định "Đã thu tiền trên server" khi chưa nhận phản hồi máy chủ.
 * - Sử dụng Idempotency Key duy nhất theo Draft ID để ngăn chặn gửi lặp khi mạng chập chờn.
 */

export interface OfflineEntryDraft {
  id: string; // e.g., "DRAFT-1792215000000-11C12345"
  createdAt: string; // ISO string
  yardId: string;
  licensePlate: string;
  vehicleType: string;
  driverName?: string;
  driverPhone?: string;
  driverIdCard?: string;
  isContainer: boolean;
  containerNo?: string;
  containerSize?: string;
  containerType?: string;
  containerCarryMode?: 'SINGLE' | 'DUAL_20FT';
  secondContainerNo?: string;
  secondContainerType?: string;
  collectPaymentNow: boolean;
  paymentMethod: 'CASH' | 'TRANSFER';
  receiptCode?: string;
  note?: string;
  ticketAmount: number;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
  retryCount?: number;
}

const STORAGE_KEY = 'soncang_offline_entry_drafts_v1';
const EVENT_NAME = 'soncang:offline-queue-changed';

/**
 * Đọc toàn bộ danh sách lượt xe nháp từ localStorage
 */
export function getOfflineDrafts(): OfflineEntryDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Lỗi đọc hàng đợi ngoại tuyến từ localStorage:', err);
    return [];
  }
}

/**
 * Đếm số lượng xe nháp đang chờ đồng bộ (PENDING hoặc FAILED)
 */
export function getPendingDraftsCount(): number {
  const drafts = getOfflineDrafts();
  return drafts.filter((d) => d.status === 'PENDING' || d.status === 'FAILED').length;
}

/**
 * Lưu một lượt xe vào hàng đợi ngoại tuyến
 */
export function saveOfflineDraft(
  data: Omit<OfflineEntryDraft, 'id' | 'createdAt' | 'status' | 'retryCount'>
): OfflineEntryDraft {
  if (typeof window === 'undefined') {
    throw new Error('Không thể lưu ngoại tuyến ngoài môi trường trình duyệt.');
  }

  const cleanPlate = (data.licensePlate || 'NO_PLATE').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const draftId = `DRAFT-${Date.now()}-${cleanPlate}`;
  
  const newDraft: OfflineEntryDraft = {
    ...data,
    id: draftId,
    createdAt: new Date().toISOString(),
    status: 'PENDING',
    retryCount: 0,
  };

  try {
    const currentList = getOfflineDrafts();
    // Đưa draft mới lên đầu danh sách
    const updatedList = [newDraft, ...currentList];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    notifyQueueChange();
    return newDraft;
  } catch (err) {
    console.error('Lỗi ghi hàng đợi ngoại tuyến vào localStorage:', err);
    throw new Error('Bộ nhớ trình duyệt đầy hoặc không thể lưu nháp ngoại tuyến.');
  }
}

/**
 * Cập nhật trạng thái của một lượt xe nháp
 */
export function updateOfflineDraftStatus(
  id: string,
  status: OfflineEntryDraft['status'],
  errorMessage?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const currentList = getOfflineDrafts();
    const updatedList = currentList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status,
          errorMessage: errorMessage || (status === 'SYNCED' ? undefined : item.errorMessage),
          retryCount: status === 'SYNCING' ? (item.retryCount || 0) + 1 : item.retryCount,
        };
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    notifyQueueChange();
  } catch (err) {
    console.warn('Lỗi cập nhật trạng thái nháp ngoại tuyến:', err);
  }
}

/**
 * Chỉnh sửa thông tin chi tiết của một lượt xe nháp (khi gặp lỗi validation hoặc gõ nhầm)
 * Tự động chuyển trạng thái về PENDING và xóa lỗi cũ để sẵn sàng thử lại
 */
export function updateOfflineDraftData(
  id: string,
  updates: Partial<Omit<OfflineEntryDraft, 'id' | 'createdAt'>>
): void {
  if (typeof window === 'undefined') return;
  try {
    const currentList = getOfflineDrafts();
    const updatedList = currentList.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...updates,
          status: 'PENDING' as const,
          errorMessage: undefined,
        };
      }
      return item;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    notifyQueueChange();
  } catch (err) {
    console.warn('Lỗi cập nhật nội dung nháp ngoại tuyến:', err);
  }
}

/**
 * Xóa một lượt xe nháp khỏi hàng đợi
 */
export function removeOfflineDraft(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const currentList = getOfflineDrafts();
    const updatedList = currentList.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    notifyQueueChange();
  } catch (err) {
    console.warn('Lỗi xóa nháp ngoại tuyến:', err);
  }
}

/**
 * Xóa sạch tất cả các lượt xe đã đồng bộ thành công (SYNCED)
 */
export function clearSyncedDrafts(): void {
  if (typeof window === 'undefined') return;
  try {
    const currentList = getOfflineDrafts();
    const updatedList = currentList.filter((item) => item.status !== 'SYNCED');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    notifyQueueChange();
  } catch (err) {
    console.warn('Lỗi dọn dẹp nháp đã đồng bộ:', err);
  }
}

/**
 * Phát sự kiện thông báo thay đổi hàng đợi cho các component lắng nghe
 */
function notifyQueueChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  }
}

/**
 * Hook/Hàm đăng ký lắng nghe thay đổi hàng đợi ngoại tuyến
 */
export function subscribeOfflineQueue(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = () => callback();
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };

  window.addEventListener(EVENT_NAME, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

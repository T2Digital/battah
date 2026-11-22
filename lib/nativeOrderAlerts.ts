export interface NativeOrderAlertPayload {
  id: string | number;
  customerName?: string;
  totalAmount?: number;
  paymentMethod?: string;
  storeName?: string;
  icon?: string;
}

export async function requestNativeWebNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function playNewOrderChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    playTone(880, 0, 0.16);
    playTone(1318.5, 0.14, 0.24);
    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 600);
  } catch {
    // Ignore autoplay restriction errors before user interaction
  }
}

export async function triggerNativeOrderNotification(order: NativeOrderAlertPayload): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const storeLabel = order.storeName || document.title.split('|')[0]?.trim() || 'المتجر';
  const customer = order.customerName || 'عميل أونلاين';
  const amount = Number(order.totalAmount || 0).toLocaleString('ar-EG');
  const title = `🔔 طلب أونلاين جديد #${order.id} — ${storeLabel}`;
  const body = `العميل: ${customer} • الإجمالي: ${amount} ج.م`;
  const icon = order.icon || '/pwa-192x192.png';

  const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body,
    icon,
    badge: icon,
    tag: `t2-order-${order.id}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    dir: 'rtl',
    lang: 'ar',
    data: {
      url: `${window.location.pathname}${window.location.search}#orders`,
      section: 'orders',
      orderId: order.id,
    },
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch {
    // Fallback to direct window Notification
  }

  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      try {
        window.focus();
        window.location.hash = 'orders';
        window.dispatchEvent(new CustomEvent('navigate-to-section', { detail: 'orders' }));
        notif.close();
      } catch {}
    };
    return true;
  } catch {
    return false;
  }
}

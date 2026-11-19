// Multi-Platform Ad Tracking Pixels Helper (Meta / TikTok / Google / Snapchat)

export interface StorePixelsConfig {
  metaPixelId?: string;
  tiktokPixelId?: string;
  googleTagId?: string;
  snapPixelId?: string;
}

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    ttq?: any;
    gtag?: any;
    dataLayer?: any[];
    snaptr?: any;
    __T2_PIXELS_LOADED__?: Record<string, boolean>;
  }
}

export function initStorePixels(cfg: StorePixelsConfig) {
  if (typeof window === 'undefined') return;
  window.__T2_PIXELS_LOADED__ = window.__T2_PIXELS_LOADED__ || {};

  // 1. Meta (Facebook / Instagram) Pixel
  const metaId = String(cfg.metaPixelId || '').trim();
  if (metaId && !window.__T2_PIXELS_LOADED__[`meta:${metaId}`]) {
    window.__T2_PIXELS_LOADED__[`meta:${metaId}`] = true;
    ((f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) => {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s?.parentNode?.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', metaId);
    window.fbq('track', 'PageView');
  }

  // 2. TikTok Pixel (Official stub + deferred queue)
  const ttId = String(cfg.tiktokPixelId || '').trim();
  if (ttId && !window.__T2_PIXELS_LOADED__[`tt:${ttId}`]) {
    window.__T2_PIXELS_LOADED__[`tt:${ttId}`] = true;
    ((w: any, d: Document, t: string) => {
      w.TiktokAnalyticsObject = t;
      const ttq = (w[t] = w[t] || []);
      ttq.methods = [
        'page',
        'track',
        'identify',
        'instances',
        'debug',
        'on',
        'off',
        'once',
        'ready',
        'alias',
        'group',
        'enableCookie',
        'disableCookie',
        'holdConsent',
        'revokeConsent',
        'grantConsent',
      ];
      ttq.setAndDefer = (target: any, method: string) => {
        target[method] = function () {
          target.push([method].concat(Array.prototype.slice.call(arguments, 0)));
        };
      };
      for (let i = 0; i < ttq.methods.length; i++) {
        ttq.setAndDefer(ttq, ttq.methods[i]);
      }
      ttq.instance = (id: string) => {
        const inst = ttq._i[id] || [];
        for (let n = 0; n < ttq.methods.length; n++) {
          ttq.setAndDefer(inst, ttq.methods[n]);
        }
        return inst;
      };
      ttq.load = (id: string, opts?: any) => {
        const url = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {};
        ttq._i[id] = [];
        ttq._i[id]._u = url;
        ttq._t = ttq._t || {};
        ttq._t[id] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[id] = opts || {};
        const script = d.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = `${url}?sdkid=${encodeURIComponent(id)}&lib=${t}`;
        const firstScript = d.getElementsByTagName('script')[0];
        firstScript?.parentNode?.insertBefore(script, firstScript);
      };
      ttq.load(ttId);
      ttq.page();
    })(window, document, 'ttq');
  }

  // 3. Google Tag (GA4 / Google Ads)
  const gId = String(cfg.googleTagId || '').trim();
  if (gId && !window.__T2_PIXELS_LOADED__[`g:${gId}`]) {
    window.__T2_PIXELS_LOADED__[`g:${gId}`] = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gId)}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', gId);
  }

  // 4. Snapchat Pixel
  const snapId = String(cfg.snapPixelId || '').trim();
  if (snapId && !window.__T2_PIXELS_LOADED__[`snap:${snapId}`]) {
    window.__T2_PIXELS_LOADED__[`snap:${snapId}`] = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://sc-static.net/scevent.min.js';
    document.head.appendChild(s);
    window.snaptr = window.snaptr || function () {
      (window.snaptr.q = window.snaptr.q || []).push(arguments);
    };
    window.snaptr('init', snapId);
    window.snaptr('track', 'PAGE_VIEW');
  }
}

export function trackStoreEvent(
  eventName: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  data: { content_name?: string; content_ids?: (string | number)[]; value?: number; currency?: string; num_items?: number } = {}
) {
  if (typeof window === 'undefined') return;
  const payload = { currency: 'EGP', ...data };
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, payload);
    }
    if (window.ttq && typeof window.ttq.track === 'function') {
      window.ttq.track(eventName, payload);
    }
    if (typeof window.gtag === 'function') {
      const gaName =
        eventName === 'ViewContent'
          ? 'view_item'
          : eventName === 'AddToCart'
            ? 'add_to_cart'
            : eventName === 'InitiateCheckout'
              ? 'begin_checkout'
              : 'purchase';
      const gaItems = Array.isArray(data.content_ids)
        ? data.content_ids.map((id) => ({
            item_id: String(id),
            item_name: data.content_name || String(id),
          }))
        : undefined;
      window.gtag('event', gaName, {
        ...payload,
        ...(gaItems ? { items: gaItems } : {}),
      });
    }
    if (typeof window.snaptr === 'function') {
      const snapName =
        eventName === 'ViewContent'
          ? 'VIEW_CONTENT'
          : eventName === 'AddToCart'
            ? 'ADD_CART'
            : eventName === 'InitiateCheckout'
              ? 'START_CHECKOUT'
              : 'PURCHASE';
      window.snaptr('track', snapName, payload);
    }
  } catch {}
}

import React from 'react';

interface PlatformShowcaseDirectoryProps {
  onSelectDemoStore?: (slug: string) => void;
}

const FEATURED_STORES = [
  {
    slug: 'atwr-fkhama-alshrq',
    name: 'عطور فخامة الشرق',
    category: 'عطور وبخور فاخر',
    badge: 'متجر إلكتروني متكامل',
    desc: 'عود، مسك طهارة، وبوكسات هدايا VIP مع سلة شراء وربط فوري عبر واتساب.',
    color: 'from-amber-500/20 to-rose-500/10 border-amber-400/40',
  },
  {
    slug: 'auto-house',
    name: 'أوتو هاوس لقطع غيار السيارات',
    category: 'قطع غيار وصيانة',
    badge: 'متجر + ERP ومخازن',
    desc: 'كتالوج قطع غيار أصلية، إدارة فروع ومخزون، وفواتير بيع سريعة.',
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-400/40',
  },
  {
    slug: 'mm-shoes',
    name: 'M&M للأحذية الحريمى والاطفالى',
    category: 'أحذية وأزياء',
    badge: 'متجر أزياء ومقاسات',
    desc: 'تشكيلة أحذية حريمي وأطفالي محدثة بأسعار تنافسية وطلب مباشر.',
    color: 'from-purple-500/20 to-pink-500/10 border-purple-400/40',
  },
];

export const PlatformShowcaseDirectory: React.FC<PlatformShowcaseDirectoryProps> = () => {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#020617] text-white font-['Cairo'] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, rgba(6,182,212,0.14), transparent 45%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.12), transparent 45%)',
        }}
      />

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center gap-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/35 text-cyan-300 text-xs font-black">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>منصة متاجر T2OS من تيتو ديجيتال للحلول الرقمية وتطوير الأعمال</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
          متاجر ذكية شغالة بالكامل في <span className="text-cyan-400">دقيقتين</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          كل متجر على <span className="font-mono text-cyan-300">store.t2os.app/s/&lt;brand&gt;</span> مزود بكتالوج منتجات ذكي، سلة مشتريات، نظام ERP للمخزون والفواتير، وربط آلي مع وكيل المبيعات واستوديو المحتوى.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <a
            href="https://t2os.app/?persona=visitor&startTrial=1"
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-sm shadow-[0_0_30px_rgba(16,185,129,0.35)] transition"
          >
            🚀 أسّس متجرك الآن مع جارفيس (7 أيام مجاناً)
          </a>
          <a
            href="https://t2os.app/pricing"
            className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-bold text-sm transition"
          >
            الباقات والأسعار
          </a>
        </div>

        <div className="w-full pt-6">
          <h2 className="text-sm font-black text-cyan-300 mb-4">
            ✨ نماذج متاجر حية تعمل الآن على المنظومة:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
            {FEATURED_STORES.map((s) => (
              <a
                key={s.slug}
                href={`/s/${s.slug}`}
                className={`p-5 rounded-3xl bg-gradient-to-br ${s.color} border backdrop-blur-xl hover:scale-[1.02] transition flex flex-col justify-between gap-4`}
              >
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-black/40 border border-white/15 text-[10px] font-bold text-white/85 mb-2">
                    {s.badge} • {s.category}
                  </span>
                  <h3 className="text-lg font-black text-white mb-1">{s.name}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{s.desc}</p>
                </div>
                <span className="text-xs font-black text-cyan-300">
                  فتح المتجر لايف ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformShowcaseDirectory;

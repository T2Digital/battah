import React from 'react';

const App: React.FC = () => {
    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-[#fafafa] p-6 text-center select-none font-sans" style={{ direction: 'rtl' }}>
            <div className="max-w-2xl bg-white p-12 sm:p-16 rounded-3xl shadow-[0_10px_50px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col items-center">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex justify-center items-center mb-10 text-4xl shadow-sm border border-red-100/50">
                    <i className="fas fa-lock"></i>
                </div>
                
                <h1 className="text-3xl font-extrabold text-stone-900 mb-6 leading-relaxed tracking-tight">
                    تم تعطيل النظام لعدم تسوية الحسابات المالية مع الشركة المطورة
                </h1>
                
                <p className="text-stone-600 mb-10 leading-loose text-lg font-medium">
                    إذا أردتم عودة النظام للخدمة، يرجى مراجعة الإدارة والتواصل مع <span className="text-stone-900 font-bold">المهندس أحمد عطية</span> لسداد المبالغ المالية المتأخرة المستحقة.
                </p>
                
                <div className="w-full h-px bg-stone-100 mb-8"></div>
                
                <div className="flex flex-col items-center gap-1.5 text-stone-400 font-mono text-xs tracking-wider uppercase">
                    <span className="font-semibold text-stone-500">حالة النظام: متوقف مؤقتاً (LOCKOUT_ACTIVE)</span>
                    <span>كود المعاملة: #0xDE02 - تواصل مع المطور</span>
                </div>
            </div>
        </div>
    );
};

export default App;

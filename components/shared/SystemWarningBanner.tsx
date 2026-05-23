import React from 'react';

const SystemWarningBanner: React.FC = () => {
    return (
        <div className="w-full bg-red-600 text-white border-b-4 border-yellow-500 py-3 px-4 shadow-xl z-[9999] text-center font-bold text-sm md:text-base selection:bg-yellow-400 selection:text-red-900 border-t-4 border-t-red-700 animate-[pulse_3s_infinite]" style={{ direction: 'rtl' }}>
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 max-w-7xl">
                <div className="flex items-center gap-2 text-yellow-300 shrink-0">
                    <i className="fas fa-exclamation-triangle text-xl text-yellow-400 animate-bounce"></i>
                    <span className="text-lg md:text-xl font-black tracking-wide">تنبيه هام جداً وعاجل</span>
                    <i className="fas fa-exclamation-triangle text-xl text-yellow-400 animate-bounce hidden md:inline"></i>
                </div>
                <div className="leading-relaxed font-semibold text-right md:text-center text-red-50">
                    لقد تم الانتهاء من جميع تحديثات النظام بالكامل لتحقيق أحلام أ /محمد محجوب و المعلم مووودى
                    <span className="text-yellow-300 font-extrabold mx-1.5 font-sans">/</span> 
                    برجاء دفع ثمن النظام بالكامل قبل تاريخ <span className="bg-yellow-400 text-red-900 px-2 py-0.5 rounded font-black text-base inline-block my-0.5 shadow-sm">5/6/2026</span> لتجنب ايقاف النظام او بيعه لعميل أخر 
                    <span className="text-yellow-300 font-extrabold mx-1.5 font-sans">/</span> 
                    وتطبيقا لوصية النبى صلى الله عليه وسلم <span className="text-yellow-300 font-black italic">" أعطى ألأجير حقه قبل ان يجف عرقه "</span> 
                    <span className="text-yellow-300 font-extrabold mx-1.5 font-sans">/</span> 
                    ويرجى عدم تكرار استخدام اسلوب غير لائق مرة اخرى مع البشمهندس أحمد عطية مخترع النظام لانه صبر عليكم جداً وحولكم من أوراق وعشوائية إلى نظام متطور هو الأول من نوعه في مصر.
                </div>
            </div>
        </div>
    );
};

export default SystemWarningBanner;

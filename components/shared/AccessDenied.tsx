import React from 'react';

interface AccessDeniedProps {
    reason: 'time' | 'ip';
    details?: string;
    onRetry: () => void;
    onLogout: () => void;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({ reason, details, onRetry, onLogout }) => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 font-cairo">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transform transition-all hover:scale-105 duration-300">
                <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-center">
                    <div className="mx-auto bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <i className={`fas ${reason === 'time' ? 'fa-clock' : 'fa-network-wired'} text-4xl text-white`}></i>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {reason === 'time' ? 'خارج أوقات العمل' : 'دخول غير مصرح به'}
                    </h2>
                    <p className="text-white/80 text-sm">
                        {reason === 'time' 
                            ? 'عذراً، لا يمكن الوصول للنظام في الوقت الحالي.' 
                            : 'عذراً، لا يمكن الوصول للنظام من هذا الموقع.'}
                    </p>
                </div>
                
                <div className="p-8">
                    <div className="text-center space-y-4">
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            {reason === 'time' 
                                ? 'نظامنا متاح فقط خلال ساعات العمل الرسمية. يرجى المحاولة مرة أخرى في وقت لاحق.'
                                : 'لأسباب أمنية، تم تقييد الوصول لهذا النظام ليكون حصرياً من داخل مقر الشركة/الفرع.'}
                        </p>
                        
                        {details && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                                {details}
                            </div>
                        )}

                        <div className="pt-6 flex flex-col gap-3">
                            <button 
                                onClick={onRetry}
                                className="w-full py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 transition shadow-lg flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-sync-alt"></i>
                                إعادة المحاولة
                            </button>
                            
                            <button 
                                onClick={onLogout}
                                className="w-full py-3 bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-sign-out-alt"></i>
                                تسجيل الخروج
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 text-center text-xs text-gray-400 dark:text-gray-500">
                    &copy; {new Date().getFullYear()} بطاح الأصلي. جميع الحقوق محفوظة.
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;

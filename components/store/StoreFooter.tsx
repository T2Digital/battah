import React from 'react';

interface StoreFooterProps {
    setViewMode: (mode: 'admin' | 'store') => void;
}

const StoreFooter: React.FC<StoreFooterProps> = ({ setViewMode }) => {
    return (
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pt-16 pb-8 mt-16">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand Info */}
                    <div className="col-span-1 md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
                                <img src="https://i.ibb.co/LDdGwd87/5-1.png" alt="Logo" className="w-10 h-10 object-contain" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tight">متجر بطاح الأصلي</h3>
                                <span className="text-[10px] text-primary font-bold tracking-widest uppercase mt-1 block">لقطع الغيار الأصلية</span>
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm leading-relaxed">
                            وجهتك الأولى لقطع غيار السيارات الأصلية والمضمونة. نوفر لك أفضل المنتجات بأسعار تنافسية مع خدمة عملاء متميزة وتوصيل سريع.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors">
                                <i className="fab fa-facebook-f"></i>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors">
                                <i className="fab fa-twitter"></i>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors">
                                <i className="fab fa-instagram"></i>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors">
                                <i className="fab fa-whatsapp"></i>
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 relative inline-block">
                            روابط سريعة
                            <span className="absolute -bottom-2 right-0 w-1/2 h-1 bg-primary rounded-full"></span>
                        </h4>
                        <ul className="space-y-3">
                            <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-2"><i className="fas fa-chevron-left text-xs"></i> الرئيسية</a></li>
                            <li><a href="#store-products" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-2"><i className="fas fa-chevron-left text-xs"></i> المنتجات</a></li>
                            <li><a href="#category-highlights" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-2"><i className="fas fa-chevron-left text-xs"></i> الأقسام</a></li>
                            <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-2"><i className="fas fa-chevron-left text-xs"></i> من نحن</a></li>
                            <li><a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-2"><i className="fas fa-chevron-left text-xs"></i> اتصل بنا</a></li>
                            <li className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                                <button onClick={() => setViewMode('admin')} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all font-bold text-sm shadow-sm">
                                    <i className="fas fa-user-shield"></i> تسجيل الدخول للإدارة
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-6 relative inline-block">
                            تواصل معنا
                            <span className="absolute -bottom-2 right-0 w-1/2 h-1 bg-primary rounded-full"></span>
                        </h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400">
                                <i className="fas fa-map-marker-alt mt-1 text-primary"></i>
                                <div className="space-y-2 text-sm">
                                    <p>79 شارع رمسيس ناصية التوفيقية امام سنترال رمسيس</p>
                                    <p>19 شارع رمسيس ناصية التوفيقية امام سنترال رمسيس</p>
                                    <p>6 شارع البورصة ناصية التوفيقية بجوار سينما ريفولى</p>
                                    <p>1 شارع البورصة ناصية التوفيقية امام دار القضاء العالى</p>
                                </div>
                            </li>
                            <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                <i className="fas fa-phone-alt text-primary"></i>
                                <span dir="ltr">+20 108 044 4447</span>
                            </li>
                            <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
                                <i className="fas fa-envelope text-primary"></i>
                                <span>info@battah.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm text-center md:text-right">
                        &copy; {new Date().getFullYear()} متجر بطاح لقطع الغيار. جميع الحقوق محفوظة.
                    </p>
                    <div className="flex gap-3 items-center">
                        <div className="flex items-center justify-center h-8 bg-[#E60000] rounded-md text-white font-bold text-xs px-3 hover:bg-red-700 transition-colors cursor-pointer shadow-sm">
                            Vodafone Cash
                        </div>
                        <div className="flex items-center justify-center h-8 bg-[#5A2D82] rounded-md text-white font-bold text-xs px-3 hover:bg-purple-900 transition-colors cursor-pointer shadow-sm">
                            InstaPay
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default StoreFooter;

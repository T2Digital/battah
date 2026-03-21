import React from 'react';

const StoreFooter: React.FC = () => {
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
                                <span>القاهرة، مصر<br/>شارع دمشق، متفرع من شارع سوريا</span>
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
                    <div className="flex gap-4 text-2xl text-gray-400">
                        <i className="fab fa-cc-visa hover:text-blue-600 transition-colors cursor-pointer"></i>
                        <i className="fab fa-cc-mastercard hover:text-orange-500 transition-colors cursor-pointer"></i>
                        <i className="fab fa-cc-paypal hover:text-blue-500 transition-colors cursor-pointer"></i>
                        <i className="fab fa-cc-apple-pay hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"></i>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default StoreFooter;

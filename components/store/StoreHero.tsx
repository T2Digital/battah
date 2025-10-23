import React from 'react';

const StoreHero: React.FC = () => {
    const scrollToProducts = () => {
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="bg-gradient-to-br from-primary-dark to-blue-900 text-white text-center py-20 sm:py-28 px-4 relative overflow-hidden">
             <div className="absolute inset-0 bg-black bg-opacity-20"></div>
             <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

            <div className="relative z-10">
                <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 animate-fade-in-down">أفضل قطع غيار السيارات في مصر</h2>
                <p className="text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto animate-fade-in-down" style={{animationDelay: '0.2s'}}>
                    جودة تثق بها، وأسعار لا تقبل المنافسة، وتوصيل سريع حتى باب بيتك.
                </p>
                <button 
                    onClick={scrollToProducts}
                    className="mt-8 px-8 py-3 bg-accent text-primary-dark font-bold rounded-lg hover:bg-amber-400 transition-transform transform hover:scale-105 shadow-lg animate-fade-in-down"
                    style={{animationDelay: '0.4s'}}
                >
                    <i className="fas fa-shopping-bag mr-2"></i>
                    تصفح المنتجات الآن
                </button>
            </div>
        </div>
    );
};

export default StoreHero;
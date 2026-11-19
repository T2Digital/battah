import React, { useState, useEffect, useMemo } from 'react';
import useStore from '../../lib/store';
import {
    StoreFilters,
    DEFAULT_STORE_FILTERS,
    getMainCategories,
    getStoreBranding,
    getHeroSlides,
} from '../../lib/appConfig';

interface StoreHeroProps {
    setFilters?: React.Dispatch<React.SetStateAction<StoreFilters>>;
}

const StoreHero: React.FC<StoreHeroProps> = ({ setFilters }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const { appCustomization, products, storefrontSettings } = useStore(state => ({
        appCustomization: state.appData?.appCustomization,
        products: state.appData?.products || [],
        storefrontSettings: state.appData?.storefrontSettings,
    }));

    const branding = useMemo(() => getStoreBranding(storefrontSettings), [storefrontSettings]);
    const mainCategories = useMemo(
        () => getMainCategories(appCustomization, products),
        [appCustomization, products]
    );
    const slides = useMemo(
        () => getHeroSlides(appCustomization, branding.companyName, branding.slogan, mainCategories),
        [appCustomization, branding.companyName, branding.slogan, mainCategories]
    );

    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const handleShopNow = (category: string) => {
        if (setFilters) {
            const targetCategory = mainCategories.includes(category) ? category : 'all';
            setFilters({ ...DEFAULT_STORE_FILTERS, category: targetCategory });
        }
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    const safeIndex = slides.length > 0 ? currentSlide % slides.length : 0;
    const slide = slides[safeIndex];
    if (!slide) return null;

    return (
        <div className="relative bg-gray-900 text-white overflow-hidden min-h-[56vh] sm:min-h-[72vh] flex items-center">
            {/* Background Images */}
            {slides.map((s, index) => (
                <div 
                    key={s.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === safeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                    <img 
                        src={s.image} 
                        alt={s.title} 
                        className={`w-full h-full object-cover ${index === safeIndex ? 'animate-slow-zoom' : ''}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/80 to-gray-900/40 sm:to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                </div>
            ))}

            {/* Decorative Elements */}
            <div className="hidden sm:block absolute top-20 right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse z-10"></div>
            <div className="hidden sm:block absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse z-10" style={{animationDelay: '2s'}}></div>

            <div className="relative container mx-auto px-4 sm:px-6 py-12 sm:py-24 lg:py-32 flex flex-col lg:flex-row items-center z-20">
                <div className="w-full lg:w-2/3 text-right" key={safeIndex}>
                    {(slide.badge || branding.slogan) && (
                        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-sky-200 text-xs sm:text-sm font-bold mb-5 sm:mb-7 animate-fade-in-up shadow-lg">
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                            </span>
                            <span className="truncate max-w-[260px] sm:max-w-none">{slide.badge || branding.slogan}</span>
                        </div>
                    )}
                    
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-3 sm:mb-4 leading-tight animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                        <span className="text-transparent bg-clip-text bg-gradient-to-l from-white via-sky-200 to-cyan-300">{slide.title}</span>
                    </h1>
                    {slide.subtitle && (
                        <h2 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-100 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                            {slide.subtitle}
                        </h2>
                    )}
                    
                    {slide.description && (
                        <p className="text-sm sm:text-lg md:text-xl text-gray-300 mb-7 sm:mb-10 max-w-2xl leading-relaxed font-light animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                            {slide.description}
                        </p>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                        <button 
                            onClick={() => handleShopNow(slide.category || 'all')}
                            className="px-6 py-3.5 sm:px-8 sm:py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all duration-300 shadow-lg flex items-center justify-center gap-3 group text-base sm:text-lg"
                        >
                            تسوق الآن
                            <i className="fas fa-arrow-left transform group-hover:-translate-x-2 transition-transform"></i>
                        </button>
                        <button 
                            onClick={() => document.getElementById('category-highlights')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-6 py-3.5 sm:px-8 sm:py-4 bg-white/10 text-white font-bold rounded-2xl hover:bg-white/20 border border-white/15 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-3 text-base sm:text-lg"
                        >
                            استكشف الأقسام
                        </button>
                    </div>
                </div>
            </div>

            {/* Slider Controls */}
            {slides.length > 1 && (
                <div className="absolute bottom-5 sm:bottom-8 left-0 right-0 z-30 flex justify-center items-center gap-3">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`transition-all duration-300 rounded-full ${index === safeIndex ? 'w-8 sm:w-10 h-2.5 sm:h-3 bg-primary' : 'w-2.5 sm:w-3 h-2.5 sm:h-3 bg-white/30 hover:bg-white/60'}`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default StoreHero;

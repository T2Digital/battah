import React, { useState, useEffect } from 'react';

interface StoreHeroProps {
    setFilters?: React.Dispatch<React.SetStateAction<{ category: string; brand: string; search: string }>>;
}

const slides = [
    {
        id: 1,
        title: "قطع غيار أصلية",
        subtitle: "جودة أصلية، أداء مضمون",
        description: "نوفر لك تشكيلة واسعة من قطع غيار السيارات الأصلية بأسعار تنافسية وتوصيل سريع.",
        image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=2072&auto=format&fit=crop",
        category: "قطع غيار"
    },
    {
        id: 2,
        title: "كماليات وإكسسوارات",
        subtitle: "أضف لمسة مميزة لسيارتك",
        description: "أحدث الإكسسوارات الداخلية والخارجية لجميع أنواع السيارات لتناسب ذوقك.",
        image: "https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2069&auto=format&fit=crop",
        category: "كماليات و إكسسوارات"
    },
    {
        id: 3,
        title: "زيوت وبطاريات",
        subtitle: "أفضل أداء لمحركك",
        description: "زيوت محركات عالمية وبطاريات بعمر افتراضي طويل لضمان كفاءة سيارتك.",
        image: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=1974&auto=format&fit=crop",
        category: "زيوت وشحومات"
    }
];

const StoreHero: React.FC<StoreHeroProps> = ({ setFilters }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const handleShopNow = (category: string) => {
        if (setFilters) {
            setFilters({ category, brand: 'all', search: '' });
        }
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    const slide = slides[currentSlide];

    return (
        <div className="relative bg-gray-900 text-white overflow-hidden min-h-[80vh] flex items-center">
            {/* Background Images */}
            {slides.map((s, index) => (
                <div 
                    key={s.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                    <img 
                        src={s.image} 
                        alt={s.title} 
                        className={`w-full h-full object-cover ${index === currentSlide ? 'animate-slow-zoom' : ''}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/90 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                </div>
            ))}

            {/* Decorative Elements */}
            <div className="absolute top-20 right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse z-10"></div>
            <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse z-10" style={{animationDelay: '2s'}}></div>

            <div className="relative container mx-auto px-4 sm:px-6 py-24 sm:py-32 lg:py-40 flex flex-col lg:flex-row items-center z-20">
                <div className="w-full lg:w-2/3 text-right" key={currentSlide}>
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-primary-light text-sm font-bold mb-8 animate-fade-in-up shadow-xl">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                        الخيار الأول لقطع الغيار في مصر
                    </div>
                    
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-4 leading-[1.1] animate-fade-in-up" style={{animationDelay: '0.1s'}}>
                        <span className="text-transparent bg-clip-text bg-gradient-to-l from-primary to-primary-light">{slide.title}</span>
                    </h1>
                    <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-gray-100 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
                        {slide.subtitle}
                    </h2>
                    
                    <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl leading-relaxed font-light animate-fade-in-up" style={{animationDelay: '0.3s'}}>
                        {slide.description}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                        <button 
                            onClick={() => handleShopNow(slide.category)}
                            className="px-8 py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary-dark transition-all duration-300 shadow-[0_0_40px_rgba(var(--color-primary-rgb),0.4)] hover:shadow-[0_0_60px_rgba(var(--color-primary-rgb),0.6)] flex items-center justify-center gap-3 group text-lg"
                        >
                            تسوق الآن
                            <i className="fas fa-arrow-left transform group-hover:-translate-x-2 transition-transform"></i>
                        </button>
                        <button 
                            onClick={() => document.getElementById('category-highlights')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-8 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all duration-300 flex items-center justify-center gap-3 text-lg"
                        >
                            استكشف الأقسام
                        </button>
                    </div>
                </div>
            </div>

            {/* Slider Controls */}
            <div className="absolute bottom-10 left-0 right-0 z-30 flex justify-center items-center gap-4">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`transition-all duration-300 rounded-full ${index === currentSlide ? 'w-10 h-3 bg-primary' : 'w-3 h-3 bg-white/30 hover:bg-white/60'}`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default StoreHero;

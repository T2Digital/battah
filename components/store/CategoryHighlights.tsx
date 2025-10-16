import React from 'react';

interface CategoryHighlightsProps {
    setFilters: React.Dispatch<React.SetStateAction<{ category: string; brand: string; search: string }>>;
}

const categories = [
    { name: 'قطع غيار', icon: 'fa-cogs', filterValue: 'قطع غيار' },
    { name: 'ميكانيكا', icon: 'fa-wrench', filterValue: 'قطع غيار' }, // Mapping 'Mechanics' to filter 'Spare Parts' as per user intent
    { name: 'كماليات', icon: 'fa-star', filterValue: 'كماليات' },
];

const CategoryHighlights: React.FC<CategoryHighlightsProps> = ({ setFilters }) => {

    const handleCategoryClick = (filterValue: string) => {
        setFilters(prev => ({ ...prev, category: filterValue, brand: 'all', search: '' }));
        document.getElementById('store-products')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="bg-slate-100 dark:bg-gray-800 py-12">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                    {categories.map(cat => (
                        <div 
                            key={cat.name}
                            onClick={() => handleCategoryClick(cat.filterValue)}
                            className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-md cursor-pointer transform hover:scale-105 hover:shadow-xl transition-transform duration-300"
                        >
                            <i className={`fas ${cat.icon} text-5xl text-primary mb-4`}></i>
                            <h3 className="text-xl font-bold">{cat.name}</h3>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoryHighlights;
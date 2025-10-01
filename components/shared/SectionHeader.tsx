
import React from 'react';

interface SectionHeaderProps {
    icon: string;
    title: string;
    children?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, children }) => {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b-2 border-gray-200 dark:border-gray-700 relative">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-4 mb-4 sm:mb-0">
                <i className={`fas ${icon} text-primary`}></i>
                {title}
            </h2>
             <div className="absolute bottom-[-2px] right-0 h-1 w-24 bg-primary"></div>
            <div className="flex items-center gap-2">
                {children}
            </div>
        </div>
    );
};

export default SectionHeader;

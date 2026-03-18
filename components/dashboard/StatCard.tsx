
import React from 'react';
import { formatCurrency } from '../../lib/utils';

interface StatCardProps {
    icon: string;
    title: string;
    value: string | number;
    isCurrency?: boolean;
    onViewDetails?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, isCurrency = false, onViewDetails }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col justify-between transition-transform transform hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group h-full">
            <div className="flex items-center gap-6 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl flex justify-center items-center text-3xl shadow-md shrink-0">
                    <i className={`fas ${icon}`}></i>
                </div>
                <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                        {isCurrency ? formatCurrency(Number(value)) : value}
                    </h3>
                </div>
            </div>
            {onViewDetails && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                    className="w-full mt-auto py-2 bg-gray-50 dark:bg-gray-700 text-primary dark:text-primary-light font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                    <span>عرض التفاصيل</span>
                    <i className="fas fa-arrow-left text-sm"></i>
                </button>
            )}
        </div>
    );
};

export default StatCard;

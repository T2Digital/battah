
import React from 'react';
import { formatCurrency } from '../../lib/utils';

interface StatCardProps {
    icon: string;
    title: string;
    value: string | number;
    isCurrency?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, isCurrency = false }) => {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-6 transition-transform transform hover:-translate-y-1 hover:shadow-xl">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-light text-white rounded-2xl flex justify-center items-center text-3xl shadow-md">
                <i className={`fas ${icon}`}></i>
            </div>
            <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                    {isCurrency ? formatCurrency(Number(value)) : value}
                </h3>
            </div>
        </div>
    );
};

export default StatCard;

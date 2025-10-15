import React from 'react';
import { Product } from '../../types';

interface ActionableAlertsProps {
    lowStockProducts: Product[];
}

const ActionableAlerts: React.FC<ActionableAlertsProps> = ({ lowStockProducts }) => {
    return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-r-4 border-amber-500 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle"></i>
                تنبيهات إدارية عاجلة
            </h3>
            <div className="mt-2 space-y-2">
                {lowStockProducts.map(product => {
                     const totalStock = product.stock.main + product.stock.branch1 + product.stock.branch2 + product.stock.branch3;
                    return (
                        <div key={product.id} className="text-sm text-amber-700 dark:text-amber-400">
                            <span className="font-semibold"> • [حد الطلب]</span> المنتج "{product.name}" وصل إلى رصيد منخفض ({totalStock} قطع متبقية).
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActionableAlerts;
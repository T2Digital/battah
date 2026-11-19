import React from 'react';
import { Product } from '../../types';
import useStore from '../../lib/store';
import { getActiveBranches, getProductTotalStock } from '../../lib/appConfig';

interface ActionableAlertsProps {
    lowStockProducts: Product[];
}

const ActionableAlerts: React.FC<ActionableAlertsProps> = ({ lowStockProducts }) => {
    const appCustomization = useStore(state => state.appData?.appCustomization);
    const activeBranches = getActiveBranches(appCustomization);
    return (
        <div className="bg-amber-50 dark:bg-amber-900 dark:bg-opacity-20 border-r-4 border-amber-500 p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle"></i>
                تنبيهات إدارية عاجلة
            </h3>
            <div className="mt-2 space-y-2">
                {lowStockProducts.map(product => {
                    const totalStock = getProductTotalStock(product, activeBranches);
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
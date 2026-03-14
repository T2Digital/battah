import React, { useState, useMemo } from 'react';
import { Product, Branch } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import { formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';
import { generateInventoryReportContent } from '../../lib/reportTemplates';

interface InventoryCheckViewProps {
    onBack: () => void;
}

const InventoryCheckView: React.FC<InventoryCheckViewProps> = ({ onBack }) => {
    const { products, updateProduct } = useStore(state => ({
        products: state.appData?.products || [],
        updateProduct: state.updateProduct
    }));
    
    const [selectedBranch, setSelectedBranch] = useState<Branch>('main');
    const [searchQuery, setSearchQuery] = useState('');
    const [actualCounts, setActualCounts] = useState<Record<number, number | ''>>({});
    const [isSaving, setIsSaving] = useState(false);

    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.barcode && p.barcode.includes(searchQuery))
        );
    }, [products, searchQuery]);

    const handleCountChange = (productId: number, value: string) => {
        const numValue = value === '' ? '' : Number(value);
        setActualCounts(prev => ({ ...prev, [productId]: numValue }));
    };

    const handleSaveInventory = async () => {
        if (Object.keys(actualCounts).length === 0) {
            alert("لم يتم إدخال أي جرد فعلي.");
            return;
        }

        if (!window.confirm("هل أنت متأكد من حفظ الجرد وتحديث المخزون بالكميات الفعلية؟")) return;

        setIsSaving(true);
        try {
            for (const [productIdStr, actualCount] of Object.entries(actualCounts)) {
                if (actualCount === '') continue;
                
                const productId = Number(productIdStr);
                const product = products.find(p => p.id === productId);
                if (product) {
                    const newStock = { ...product.stock, [selectedBranch]: actualCount as number };
                    await updateProduct(productId, { stock: newStock });
                }
            }
            alert("تم حفظ الجرد وتحديث المخزون بنجاح.");
            setActualCounts({});
        } catch (error) {
            console.error("Error saving inventory:", error);
            alert("حدث خطأ أثناء حفظ الجرد.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        const appData = useStore.getState().appData;
        if (!appData) return;
        
        let html = `
        <html dir="rtl">
        <head>
            <title>تقرير جرد المخزون - ${selectedBranch}</title>
            <style>
                body { font-family: 'Tajawal', sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                .shortage { color: red; }
                .surplus { color: green; }
                .header { text-align: center; margin-bottom: 30px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>تقرير جرد المخزون</h2>
                <p>الفرع: ${selectedBranch}</p>
                <p>التاريخ: ${new Date().toLocaleDateString('ar-EG')}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>الكود</th>
                        <th>الصنف</th>
                        <th>الرصيد الدفتري</th>
                        <th>الرصيد الفعلي</th>
                        <th>الفرق (عجز/زيادة)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filteredProducts.forEach(p => {
            const systemCount = p.stock[selectedBranch] || 0;
            const actualCount = actualCounts[p.id] !== undefined && actualCounts[p.id] !== '' ? Number(actualCounts[p.id]) : systemCount;
            const diff = actualCount - systemCount;
            
            let diffHtml = `<td>-</td>`;
            if (actualCounts[p.id] !== undefined && actualCounts[p.id] !== '') {
                if (diff < 0) diffHtml = `<td class="shortage">عجز (${Math.abs(diff)})</td>`;
                else if (diff > 0) diffHtml = `<td class="surplus">زيادة (${diff})</td>`;
                else diffHtml = `<td>متطابق</td>`;
            }

            html += `
                <tr>
                    <td>${p.sku}</td>
                    <td>${p.name}</td>
                    <td>${systemCount}</td>
                    <td>${actualCounts[p.id] !== undefined && actualCounts[p.id] !== '' ? actualCount : ''}</td>
                    ${diffHtml}
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                <div>توقيع أمين المخزن: ........................</div>
                <div>توقيع المراجع: ........................</div>
            </div>
        </body>
        </html>
        `;

        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
            reportWindow.document.write(html);
            reportWindow.document.close();
            setTimeout(() => reportWindow.print(), 500);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-clipboard-check" title="جرد المخزون الفعلي">
                <button onClick={onBack} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition">
                    <i className="fas fa-arrow-right"></i>
                    العودة
                </button>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-4 w-full md:w-auto">
                        <select 
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value as Branch)}
                            className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                        >
                            <option value="main">الفرع الرئيسي</option>
                            <option value="branch1">فرع 1</option>
                            <option value="branch2">فرع 2</option>
                            <option value="branch3">فرع 3</option>
                        </select>
                        <div className="relative flex-1 md:w-64">
                            <i className="fas fa-search absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                            <input 
                                type="text" 
                                placeholder="بحث عن منتج..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={handlePrint} className="flex-1 md:flex-none px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition flex items-center justify-center gap-2">
                            <i className="fas fa-print"></i>
                            طباعة الجرد
                        </button>
                        <button 
                            onClick={handleSaveInventory} 
                            disabled={isSaving || Object.keys(actualCounts).length === 0}
                            className="flex-1 md:flex-none px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                            حفظ وتحديث المخزون
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                                <th className="p-3">الكود</th>
                                <th className="p-3">المنتج</th>
                                <th className="p-3 text-center">الرصيد الدفتري</th>
                                <th className="p-3 text-center w-32">الرصيد الفعلي</th>
                                <th className="p-3 text-center">الفرق</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => {
                                const systemCount = product.stock[selectedBranch] || 0;
                                const actualCountVal = actualCounts[product.id];
                                const actualCount = actualCountVal !== undefined && actualCountVal !== '' ? Number(actualCountVal) : systemCount;
                                const diff = actualCount - systemCount;
                                
                                return (
                                    <tr key={product.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                                        <td className="p-3 text-gray-500">{product.sku}</td>
                                        <td className="p-3 font-medium">{product.name}</td>
                                        <td className="p-3 text-center font-bold text-gray-700 dark:text-gray-300">{systemCount}</td>
                                        <td className="p-3">
                                            <input 
                                                type="number" 
                                                value={actualCountVal !== undefined ? actualCountVal : ''}
                                                onChange={(e) => handleCountChange(product.id, e.target.value)}
                                                placeholder={String(systemCount)}
                                                className="w-full p-2 border rounded text-center dark:bg-gray-600 dark:border-gray-500 focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </td>
                                        <td className="p-3 text-center font-bold">
                                            {actualCountVal !== undefined && actualCountVal !== '' ? (
                                                diff < 0 ? <span className="text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">عجز ({Math.abs(diff)})</span> :
                                                diff > 0 ? <span className="text-green-500 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">زيادة ({diff})</span> :
                                                <span className="text-gray-500">متطابق</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryCheckView;

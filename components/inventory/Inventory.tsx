import React, { useState, useMemo } from 'react';
import { Product } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import ProductModal from './ProductModal';
import { formatCurrency } from '../../lib/utils';
import useStore from '../../lib/store';

const Inventory: React.FC = () => {
    const { products, addProduct, updateProduct, deleteProduct } = useStore();
    
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleAddProduct = () => {
        setEditingProduct(null);
        setModalOpen(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setModalOpen(true);
    };

    const handleDelete = (productId: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.')) {
            deleteProduct(productId);
        }
    };
    
    const handleSaveProduct = (productData: Omit<Product, 'id'> & { id?: number }) => {
        if (productData.id) {
            updateProduct(productData.id, productData);
        } else {
            addProduct(productData);
        }
        setModalOpen(false);
    };
    
    const filteredProducts = useMemo(() => {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [products, searchTerm]);

    const totalStockValue = useMemo(() => {
        return filteredProducts.reduce((sum, p) => {
            const totalQuantity = (p.stock.main || 0) + (p.stock.branch1 || 0) + (p.stock.branch2 || 0) + (p.stock.branch3 || 0);
            return sum + (totalQuantity * p.sellingPrice);
        }, 0)
    }, [filteredProducts]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-warehouse" title="إدارة المخزون">
                <button onClick={handleAddProduct} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    إضافة منتج جديد
                </button>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
                <input
                    type="text"
                    placeholder="ابحث بالاسم, الكود, أو الماركة..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-grow p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 w-full md:w-auto"
                />
                <div className="p-3 bg-primary-light/10 dark:bg-primary-dark/20 rounded-lg text-center">
                    <span className="text-sm text-primary dark:text-primary-light">قيمة المخزون المعروض: </span>
                    <span className="font-bold text-lg text-primary dark:text-primary-light">{formatCurrency(totalStockValue)}</span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">المنتج</th>
                            <th scope="col" className="px-6 py-3">الكود</th>
                            <th scope="col" className="px-6 py-3">سعر البيع</th>
                            <th scope="col" className="px-6 py-3 text-center">المخزون الرئيسي</th>
                            <th scope="col" className="px-6 py-3 text-center">فرع 1</th>
                            <th scope="col" className="px-6 py-3 text-center">فرع 2</th>
                            <th scope="col" className="px-6 py-3 text-center">فرع 3</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(product => (
                            <tr key={product.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{product.name}</td>
                                <td className="px-6 py-4">{product.sku}</td>
                                <td className="px-6 py-4 font-semibold">{formatCurrency(product.sellingPrice)}</td>
                                <td className="px-6 py-4 text-center font-bold text-blue-600">{product.stock.main}</td>
                                <td className="px-6 py-4 text-center">{product.stock.branch1}</td>
                                <td className="px-6 py-4 text-center">{product.stock.branch2}</td>
                                <td className="px-6 py-4 text-center">{product.stock.branch3}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => handleEditProduct(product)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700 text-lg"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {isModalOpen && (
                <ProductModal
                    isOpen={isModalOpen}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSaveProduct}
                    existingProduct={editingProduct}
                />
            )}
        </div>
    );
};

export default Inventory;
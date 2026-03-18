import { useState, useEffect } from 'react';
import useStore from '../lib/store';

export const useProductName = (productId: number) => {
    const { products, fetchProductsByIds } = useStore(state => ({
        products: state.appData?.products || [],
        fetchProductsByIds: state.fetchProductsByIds
    }));
    
    const [name, setName] = useState<string>('جاري التحميل...');

    useEffect(() => {
        const product = products.find(p => p.id === productId);
        if (product) {
            setName(product.name);
        } else {
            // Fetch product if not in store
            fetchProductsByIds([productId]).then(res => {
                if (res.length > 0) {
                    setName(res[0].name);
                } else {
                    setName('صنف غير معروف');
                }
            });
        }
    }, [productId, products, fetchProductsByIds]);

    return name;
};

import React from 'react';
import { useProductName } from '../../hooks/useProductName';

interface ProductNameProps {
    productId: number;
    fallbackName?: string;
}

const ProductName: React.FC<ProductNameProps> = ({ productId, fallbackName }) => {
    const name = useProductName(productId);
    
    if (fallbackName && name === 'صنف غير معروف') {
        return <>{fallbackName}</>;
    }
    
    return <>{name}</>;
};

export default ProductName;

import React from 'react';

interface CustomerNotificationsProps {
    message: string;
}

const CustomerNotifications: React.FC<CustomerNotificationsProps> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white py-3 px-6 rounded-full shadow-2xl z-50 animate-fade-in-down flex items-center gap-3 min-w-[300px] justify-center">
            <i className="fas fa-check-circle text-xl"></i>
            <span className="font-bold text-sm">{message}</span>
        </div>
    );
};

export default CustomerNotifications;
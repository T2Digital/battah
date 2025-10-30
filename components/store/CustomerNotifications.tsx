import React from 'react';

interface CustomerNotificationsProps {
    message: string;
}

const CustomerNotifications: React.FC<CustomerNotificationsProps> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white py-4 px-8 rounded-xl shadow-2xl z-50 animate-fade-in-down flex items-center gap-3">
            <i className="fas fa-check-circle text-2xl"></i>
            <span className="font-bold">{message}</span>
        </div>
    );
};

export default CustomerNotifications;
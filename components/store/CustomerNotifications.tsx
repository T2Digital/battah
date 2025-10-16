import React from 'react';

interface CustomerNotificationsProps {
    message: string;
}

const CustomerNotifications: React.FC<CustomerNotificationsProps> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white py-3 px-6 rounded-lg shadow-lg z-50 animate-fade-in-down">
            <i className="fas fa-check-circle mr-2"></i>
            {message}
        </div>
    );
};

export default CustomerNotifications;

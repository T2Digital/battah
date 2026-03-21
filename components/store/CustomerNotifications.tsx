import React from 'react';

interface CustomerNotificationsProps {
    message: string;
}

const CustomerNotifications: React.FC<CustomerNotificationsProps> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white py-3 px-6 rounded-2xl shadow-xl shadow-emerald-500/20 z-50 animate-fade-in-down flex items-center gap-3 min-w-[300px] justify-center border border-emerald-400 backdrop-blur-md">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <i className="fas fa-check text-sm"></i>
            </div>
            <span className="font-bold text-sm tracking-wide">{message}</span>
        </div>
    );
};

export default CustomerNotifications;
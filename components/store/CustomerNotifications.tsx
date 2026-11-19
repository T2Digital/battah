import React from 'react';

interface CustomerNotificationsProps {
    message: string;
}

const CustomerNotifications: React.FC<CustomerNotificationsProps> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-x-0 top-4 sm:top-6 z-[150] px-3 sm:px-4 pointer-events-none flex justify-center">
            <div className="pointer-events-auto bg-emerald-600/95 text-white py-3 px-5 rounded-2xl shadow-2xl shadow-emerald-600/25 animate-fade-in-down flex items-center gap-3 w-full max-w-md justify-center border border-emerald-400/50 backdrop-blur-md">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                    <i className="fas fa-check text-sm"></i>
                </div>
                <span className="font-bold text-sm tracking-wide text-center leading-snug">{message}</span>
            </div>
        </div>
    );
};

export default CustomerNotifications;
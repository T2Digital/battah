import React from 'react';

interface CustomerNotificationsProps {
    message: string;
}

const CustomerNotifications: React.FC<CustomerNotificationsProps> = ({ message }) => {
    if (!message) return null;

    return (
        <div className="fixed inset-x-0 top-4 sm:top-6 z-[150] px-3 sm:px-4 pointer-events-none flex justify-center">
            <div className="pointer-events-auto bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-950 py-2.5 px-4 sm:px-5 rounded-full shadow-2xl animate-fade-in-down flex items-center gap-3 max-w-md border border-white/15 dark:border-slate-200 backdrop-blur-xl">
                <div className="w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
                    <i className="fas fa-check text-xs" />
                </div>
                <span className="font-extrabold text-xs sm:text-sm tracking-wide text-center leading-snug">
                    {message}
                </span>
            </div>
        </div>
    );
};

export default CustomerNotifications;

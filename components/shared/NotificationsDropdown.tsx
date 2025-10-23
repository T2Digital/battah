import React, { useState, useMemo } from 'react';
import useStore from '../../lib/store';
import { formatDate } from '../../lib/utils';
import { Notification } from '../../types';

const NotificationsDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, markNotificationAsRead } = useStore(state => ({
        notifications: state.appData?.notifications || [],
        markNotificationAsRead: state.markNotificationAsRead,
    }));

    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.read).length;
    }, [notifications]);

    const handleToggle = () => setIsOpen(prev => !prev);
    const handleClose = () => setIsOpen(false);
    
    const handleRead = (e: React.MouseEvent, notification: Notification) => {
        e.stopPropagation();
        if (!notification.read) {
            markNotificationAsRead(notification.id);
        }
        // Potentially navigate to the related order here
        handleClose();
    };

    return (
        <div className="relative">
            <button onClick={handleToggle} className="relative text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-light">
                <i className="fas fa-bell text-2xl"></i>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={handleClose}></div>
                    <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 animate-fade-in-down overflow-hidden">
                        <div className="p-3 font-bold border-b dark:border-gray-700">الإشعارات</div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length > 0 ? (
                                notifications.map(n => (
                                    <div 
                                        key={n.id}
                                        onClick={(e) => handleRead(e, n)}
                                        className={`p-3 border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${!n.read ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30' : ''}`}
                                    >
                                        <p className="text-sm">{n.message}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(n.date)}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="p-4 text-center text-sm text-gray-500">لا توجد إشعارات.</p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationsDropdown;
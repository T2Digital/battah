import React, { useMemo } from 'react';
import useStore from '../../lib/store';
import SectionHeader from '../shared/SectionHeader';
import { formatDate } from '../../lib/utils';

const Notifications: React.FC = () => {
    const { notifications, markNotificationAsRead } = useStore(state => ({
        notifications: state.appData?.notifications || [],
        markNotificationAsRead: state.markNotificationAsRead
    }));

    const sortedNotifications = useMemo(() => {
        return [...notifications].sort((a, b) => {
            const dateA = a.createdAt ? (a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime()) : new Date(a.date).getTime();
            const dateB = b.createdAt ? (b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime()) : new Date(b.date).getTime();
            return dateB - dateA;
        });
    }, [notifications]);

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-bell" title="الإشعارات" />
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                {sortedNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-bell-slash text-4xl mb-3"></i>
                        <p>لا توجد إشعارات حالياً</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedNotifications.map(notification => (
                            <li 
                                key={notification.id} 
                                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notification.read ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                                        <div>
                                            <p className="text-gray-800 dark:text-gray-200 font-medium">{notification.message}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                <i className="far fa-clock ml-1"></i>
                                                {formatDate(notification.date)}
                                            </p>
                                        </div>
                                    </div>
                                    {!notification.read && (
                                        <button 
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
                                        >
                                            تحديد كمقروء
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Notifications;

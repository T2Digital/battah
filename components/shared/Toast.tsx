
import React, { useEffect, useState } from 'react';
import useStore from '../../lib/store';
import { Toast as ToastType } from '../../types';

const toastConfig = {
    info: { icon: 'fa-info-circle', color: 'bg-blue-500' },
    success: { icon: 'fa-check-circle', color: 'bg-green-500' },
    error: { icon: 'fa-exclamation-triangle', color: 'bg-red-500' },
};

const Toast: React.FC<ToastType> = ({ id, message, type }) => {
    const removeToast = useStore(state => state.removeToast);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => removeToast(id), 300); // Wait for exit animation
        }, 5000);

        return () => clearTimeout(timer);
    }, [id, removeToast]);

    const handleClose = () => {
        setExiting(true);
        setTimeout(() => removeToast(id), 300);
    };

    const { icon, color } = toastConfig[type];

    return (
        <div 
            className={`flex items-center gap-3 p-4 rounded-lg shadow-lg text-white ${color} transition-all duration-300 ease-in-out transform ${exiting ? 'opacity-0 -translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'} w-full md:w-auto`}
            role="alert"
        >
            <i className={`fas ${icon} text-lg flex-shrink-0`}></i>
            <p className="flex-grow text-sm font-medium break-words">{message}</p>
            <button onClick={handleClose} className="text-lg font-bold opacity-70 hover:opacity-100 p-1">&times;</button>
        </div>
    );
};

export default Toast;

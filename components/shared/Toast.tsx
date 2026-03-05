
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
            className={`flex items-center gap-4 p-4 rounded-lg shadow-lg text-white ${color} transition-all duration-300 ease-in-out ${exiting ? 'opacity-0 translate-x-[-100%]' : 'opacity-100 translate-x-0'}`}
            role="alert"
        >
            <i className={`fas ${icon} text-xl`}></i>
            <p className="flex-grow text-sm font-medium">{message}</p>
            <button onClick={handleClose} className="text-xl font-bold">&times;</button>
        </div>
    );
};

export default Toast;

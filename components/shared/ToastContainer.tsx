
import React from 'react';
import useStore from '../../lib/store';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
    const toasts = useStore(state => state.appData?.toasts || []);

    return (
        <div className="fixed top-20 left-4 right-4 md:left-6 md:right-auto md:w-80 z-50 space-y-3 pointer-events-none">
            {toasts.map(toast => (
                <div key={toast.id} className="pointer-events-auto">
                    <Toast
                        id={toast.id}
                        message={toast.message}
                        type={toast.type}
                    />
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;

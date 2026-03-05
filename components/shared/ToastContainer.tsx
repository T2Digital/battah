
import React from 'react';
import useStore from '../../lib/store';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
    const toasts = useStore(state => state.appData?.toasts || []);

    return (
        <div className="fixed top-20 left-6 z-50 space-y-3 w-80">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    id={toast.id}
                    message={toast.message}
                    type={toast.type}
                />
            ))}
        </div>
    );
};

export default ToastContainer;


import React from 'react';
import useStore from '../../lib/store';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
    const toasts = useStore(state => state.appData?.toasts || []);

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[92vw] max-w-md z-[120] space-y-3 pointer-events-none flex flex-col items-center">
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

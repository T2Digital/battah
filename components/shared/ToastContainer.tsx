
import React from 'react';
import useStore from '../../lib/store';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
    const toasts = useStore(state => state.appData?.toasts || []);

    return (
        <div className="fixed inset-x-0 top-4 sm:top-6 z-[150] px-3 sm:px-4 space-y-2.5 pointer-events-none flex flex-col items-center">
            {toasts.map(toast => (
                <div key={toast.id} className="w-full max-w-md pointer-events-auto flex justify-center">
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

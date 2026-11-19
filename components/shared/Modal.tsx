import React, { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSave?: (e: React.FormEvent) => void;
    saveLabel?: string;
    isLoading?: boolean;
    maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, onSave, saveLabel, isLoading = false, maxWidth = 'max-w-2xl' }) => {
    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const content = (
        <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="sm:hidden w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mt-2.5 shrink-0" />
            <div className="flex justify-between items-center gap-3 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <h3 className="text-base sm:text-xl font-bold truncate min-w-0">{title}</h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-9 h-9 shrink-0 flex justify-center items-center rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    aria-label="إغلاق"
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 min-h-0 custom-scrollbar">
                {children}
            </div>
            {onSave && (
                 <div className="px-4 py-3 sm:px-6 sm:py-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-gray-50 dark:bg-gray-900/80 flex items-center justify-end gap-2.5 border-t border-gray-200 dark:border-gray-700 shrink-0">
                    <button type="button" onClick={onClose} className="px-4 sm:px-5 py-2.5 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition text-sm font-bold">
                        إلغاء
                    </button>
                    <button type="submit" disabled={isLoading} className="px-5 py-2.5 min-w-[7.5rem] bg-primary text-white rounded-xl hover:bg-primary-dark transition shadow-md flex items-center justify-center gap-2 text-sm font-bold whitespace-nowrap disabled:bg-primary/50">
                        {isLoading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <>
                                <i className="fas fa-save"></i>
                                <span>{saveLabel || 'حفظ'}</span>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div 
            className="fixed inset-0 bg-gray-900/75 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden z-[100] backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            {onSave ? (
                <form className={`w-full ${maxWidth} mx-auto`} onClick={e => e.stopPropagation()} onSubmit={onSave}>
                    {content}
                </form>
            ) : (
                 <div className={`w-full ${maxWidth} mx-auto`} onClick={e => e.stopPropagation()}>
                    {content}
                </div>
            )}
        </div>
    );
};

export default Modal;
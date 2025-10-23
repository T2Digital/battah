import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSave?: (e: React.FormEvent) => void;
    saveButtonText?: string;
    isLoading?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, onSave, saveButtonText, isLoading = false }) => {
    if (!isOpen) return null;

    const content = (
        <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-2xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold">{title}</h3>
                <button onClick={onClose} className="w-8 h-8 flex justify-center items-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    <i className="fas fa-times"></i>
                </button>
            </div>
            <div className="p-6 overflow-y-auto">
                {children}
            </div>
            {onSave && (
                 <div className="p-4 bg-gray-50 dark:bg-gray-900 dark:bg-opacity-50 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition">
                        إلغاء
                    </button>
                    <button type="submit" disabled={isLoading} className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition shadow-md flex items-center justify-center w-28 disabled:bg-primary/50">
                        {isLoading ? (
                            <i className="fas fa-spinner fa-spin"></i>
                        ) : (
                            <>
                                <i className="fas fa-save mr-2"></i>
                                {saveButtonText || 'حفظ'}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            {onSave ? (
                <form onClick={e => e.stopPropagation()} onSubmit={onSave}>
                    {content}
                </form>
            ) : (
                 <div onClick={e => e.stopPropagation()}>
                    {content}
                </div>
            )}
        </div>
    );
};

export default Modal;
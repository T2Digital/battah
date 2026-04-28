import React, { useEffect, useState, useRef } from 'react';
import Modal from './Modal';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScan }) => {
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        if (isOpen) {
            setError(null);
            
            // Short timeout to ensure the DOM element is rendered
            const timer = setTimeout(() => {
                scannerRef.current = new Html5Qrcode("reader");
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };
                
                scannerRef.current.start(
                    { facingMode: "environment" }, // Prefer back camera
                    config,
                    (decodedText) => {
                        // Success callback
                        if (scannerRef.current?.isScanning) {
                            scannerRef.current.stop().then(() => {
                                onScan(decodedText);
                            }).catch(console.error);
                        } else {
                            onScan(decodedText);
                        }
                    },
                    (err) => {
                        // Ignore typical not found errors
                        if (typeof err === 'string' && !err.includes('NotFoundException')) {
                            console.warn(err);
                        }
                    }
                ).catch((err) => {
                    console.error("Camera start error", err);
                    setError("لا يمكن الوصول إلى الكاميرا. يرجى التأكد من إعطاء الصلاحيات من المتصفح.");
                });
            }, 100);
            
            return () => {
                clearTimeout(timer);
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(console.error);
                }
            };
        }
    }, [isOpen, onScan]);

    const handleClose = () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().then(onClose).catch((err) => {
                console.error(err);
                onClose();
            });
        } else {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="مسح الباركود / QR">
            <div className="relative w-full min-h-[300px] bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center">
                {error ? (
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                        <i className="fas fa-video-slash text-red-500 text-4xl mb-4"></i>
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : (
                    <div id="reader" className="w-full h-full text-black"></div>
                )}
            </div>
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    وجّه الكاميرا نحو الباركود أو الـ QR وسيتم قراءته تلقائياً. 
                    في حالة وجود مشكلة، تأكد من توفر إضاءة جيدة.
                </p>
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs text-right">
                    <strong>تلميح:</strong> لكي يتم التعرف على المنتج، يجب حفظ الباركود في خانة <strong>"الكود (SKU)"</strong> عند إضافة أو تعديل المنتج في المخزن.
                </div>
            </div>
        </Modal>
    );
};

export default BarcodeScannerModal;
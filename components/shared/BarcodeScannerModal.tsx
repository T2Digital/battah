import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScan }) => {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let scanner: Html5QrcodeScanner | null = null;
        
        if (isOpen) {
            scanner = new Html5QrcodeScanner(
                'reader', 
                { fps: 10, qrbox: {width: 250, height: 250} }, 
                /* verbose= */ false
            );
            
            scanner.render(
                (decodedText) => {
                    onScan(decodedText);
                    scanner?.clear();
                },
                (err) => {
                    // Ignore regular scanning errors as they happen constantly during scanning
                    if (typeof err === 'string' && !err.includes('NotFoundException')) {
                        console.warn(err);
                    }
                }
            );
            
            // Clean up old scanner if it fails to mount or on close
            return () => {
                if (scanner) {
                    scanner.clear().catch(console.error);
                }
            };
        }
    }, [isOpen, onScan]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="مسح الباركود">
            <div className="relative w-full min-h-[300px] bg-black rounded-lg overflow-hidden flex flex-col items-center justify-center">
                {error ? (
                    <div className="flex items-center justify-center h-full text-red-500">{error}</div>
                ) : (
                    <div id="reader" className="w-full text-black"></div>
                )}
            </div>
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    وجّه الكاميرا نحو الباركود أو الـ QR कोड وسيتم قراءته تلقائياً. 
                    في حالة وجود مشكلة، تأكد من توفر إضاءة جيدة.
                </p>
            </div>
        </Modal>
    );
};

export default BarcodeScannerModal;
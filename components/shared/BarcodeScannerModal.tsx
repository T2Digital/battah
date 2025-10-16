import React, { useRef, useEffect, useState } from 'react';
import Modal from './Modal';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose, onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;
        
        const startCamera = async () => {
            if (isOpen && videoRef.current) {
                try {
                    setError(null);
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment' }
                    });
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                } catch (err) {
                    console.error("Error accessing camera:", err);
                    setError("لا يمكن الوصول إلى الكاميرا. يرجى التحقق من الأذونات.");
                }
            }
        };

        startCamera();

        return () => {
            // Cleanup: stop the camera stream when the component unmounts or modal closes
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isOpen]);

    const handleSimulateScan = () => {
        // In a real app, you would use a library like react-zxing here to decode the barcode from the video stream.
        // For now, we simulate a scan with a common product SKU.
        const simulatedSku = 'BOS-001';
        alert(`تم محاكاة مسح الباركود بنجاح. الكود: ${simulatedSku}`);
        onScan(simulatedSku);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="مسح الباركود">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                {error ? (
                    <div className="flex items-center justify-center h-full text-red-500">{error}</div>
                ) : (
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                )}
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3/4 h-1/2 border-4 border-dashed border-red-500/70 rounded-lg" />
                </div>
            </div>
            <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    وجّه الكاميرا نحو الباركود. 
                    <br/>
                    (ملاحظة: هذه ميزة تجريبية، انقر أدناه لمحاكاة المسح)
                </p>
                <button 
                    onClick={handleSimulateScan}
                    className="mt-2 px-4 py-2 bg-primary text-white rounded-lg"
                >
                    محاكاة مسح ناجح
                </button>
            </div>
        </Modal>
    );
};

export default BarcodeScannerModal;

import React, { useRef, useState, useEffect } from 'react';
import Modal from './Modal';

interface CameraCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export default function CameraCaptureModal({ isOpen, onClose, onCapture }: CameraCaptureModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen]);

    const startCamera = async () => {
        setError('');
        try {
            let mediaStream;
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'environment' } 
                });
            } catch (fallbackErr) {
                // Fallback to any available camera if 'environment' fails (e.g. on desktop)
                mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: true 
                });
            }
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                // Important: wait for video to load metadata to ensure dimensions are correct
                videoRef.current.onloadedmetadata = () => {
                   videoRef.current?.play();
                };
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError('تعذر الوصول إلى الكاميرا. يرجى التأكد من منح الصلاحيات (Camera Permissions) للمتصفح.');
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                
                canvasRef.current.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        onCapture(file);
                        onClose();
                    }
                }, 'image/jpeg', 0.8);
            }
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="التقاط صورة">
            <div className="flex flex-col items-center gap-4 p-4">
                {error ? (
                    <div className="text-red-500 text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p>{error}</p>
                        <button onClick={startCamera} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg">
                            المحاولة مرة أخرى
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="relative w-full max-w-md overflow-hidden bg-black rounded-lg aspect-[4/3] flex justify-center items-center shadow-inner">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                className="w-full h-full object-cover"
                            ></video>
                            <canvas ref={canvasRef} className="hidden"></canvas>
                        </div>
                        <div className="flex gap-4 mt-2">
                            <button 
                                type="button"
                                onClick={handleCapture}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg flex items-center gap-2 transform transition hover:scale-105"
                            >
                                <i className="fas fa-camera text-xl"></i>
                                التقاط
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

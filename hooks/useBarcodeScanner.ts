import { useEffect, useRef } from 'react';

export function useBarcodeScanner(onScan: (barcode: string) => void) {
    const barcodeBuffer = useRef<string>('');
    const lastKeyTime = useRef<number>(Date.now());

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            
            // If the time between keystrokes is more than 50ms, 
            // it's likely a human typing, not a scanner.
            // Reset the buffer.
            if (currentTime - lastKeyTime.current > 60) {
                barcodeBuffer.current = '';
            }

            // If Enter is pressed and we have something in the buffer, consider it a scan.
            if (e.key === 'Enter' && barcodeBuffer.current.length > 2) {
                // To prevent the Enter key from triggering unintended actions (like submitting a focused form)
                // if we just intercepted a barcode.
                if (barcodeBuffer.current.length >= 3) {
                    e.preventDefault(); // Stop Enter from triggering form submission or clicks
                    const scannedCode = barcodeBuffer.current;
                    barcodeBuffer.current = '';
                    
                    // Don't intercept if user is explicitly typing into an input field
                    const activeTag = document.activeElement?.tagName.toLowerCase();
                    const isInputFocus = activeTag === 'input' || activeTag === 'textarea';
                    
                    if (isInputFocus) {
                        return; // Let the input keep the value, prevent default stops form submit 
                    }
                    
                    onScan(scannedCode);
                    return; // Enter event might still propagate, but we captured the barcode.
                }
            }

            // Only capture printable single characters
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                barcodeBuffer.current += e.key;
            }

            lastKeyTime.current = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onScan]);
}

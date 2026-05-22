import { useEffect, useRef } from 'react';

function getCharFromCode(code: string, shift: boolean = false): string | null {
    if (code.startsWith('Key')) {
        const char = code.slice(3); // 'A'...'Z'
        return shift ? char.toUpperCase() : char.toLowerCase();
    }
    if (code.startsWith('Digit')) {
        const num = code.slice(5); // '0'...'9'
        if (shift) {
            const shiftNums: Record<string, string> = {
                '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
                '6': '^', '7': '&', '8': '*', '9': '(', '0': ')'
            };
            return shiftNums[num] || num;
        }
        return num;
    }
    switch (code) {
        case 'Minus': return shift ? '_' : '-';
        case 'Equal': return shift ? '+' : '=';
        case 'Slash': return shift ? '?' : '/';
        case 'Period': return shift ? '>' : '.';
        case 'Comma': return shift ? '<' : ',';
        case 'Semicolon': return shift ? ':' : ';';
        case 'Quote': return shift ? '"' : "'";
        case 'Backslash': return shift ? '|' : '\\';
        case 'BracketLeft': return shift ? '{' : '[';
        case 'BracketRight': return shift ? '}' : ']';
        case 'Backquote': return shift ? '~' : '`';
        case 'Space': return ' ';
        default: return null;
    }
}

export function useBarcodeScanner(onScan: (barcode: string) => void) {
    const barcodeBuffer = useRef<string>('');
    const lastKeyTime = useRef<number>(Date.now());

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const currentTime = Date.now();
            
            // If the time between keystrokes is more than 100ms, 
            // it's likely a human typing, not a scanner.
            // Reset the buffer.
            if (currentTime - lastKeyTime.current > 100) {
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
                    
                    // Don't intercept if user is explicitly typing into an input field,
                    // BUT if they scanned something incredibly fast (which we detect),
                    // it is a scanner. We should clear the input if it received the scanner's text.
                    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
                    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                        // The scanner typed the barcode into the input. We should remove it.
                        if (activeElement.value && activeElement.value.endsWith(scannedCode)) {
                            activeElement.value = activeElement.value.slice(0, -scannedCode.length);
                            // Trigger React's onChange if needed by dispatching an input event
                            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                    
                    onScan(scannedCode);
                    return; // Enter event might still propagate, but we captured the barcode.
                }
            }

            // Translate physical key code to standard English key to bypass any OS keyboard layouts
            if (!e.ctrlKey && !e.altKey && !e.metaKey) {
                const physicalChar = getCharFromCode(e.code, e.shiftKey);
                if (physicalChar !== null) {
                    barcodeBuffer.current += physicalChar;
                } else if (e.key.length === 1) {
                    // Fallback to key if we couldn't resolve code but it is a printable single char
                    barcodeBuffer.current += e.key;
                }
            }

            lastKeyTime.current = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onScan]);
}

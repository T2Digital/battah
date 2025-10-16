import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import useStore from '../../lib/store';

const AIChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const { products } = useStore(state => ({
        products: state.appData?.products || [],
    }));

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const checkStockByName = ({ productName }: { productName: string }) => {
        const product = products.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
        if (!product) {
            return JSON.stringify({ available: false, stock: 0, reason: "Product not found" });
        }
        const totalStock = product.stock.main + product.stock.branch1 + product.stock.branch2 + product.stock.branch3;
        return JSON.stringify({ available: totalStock > 0, stock: totalStock });
    };

    const checkStockFunctionDeclaration: FunctionDeclaration = {
        name: 'checkStockByName',
        description: 'Check the available stock quantity for a specific product by its name.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                productName: {
                    type: Type.STRING,
                    description: 'The name of the product to check.'
                }
            },
            required: ['productName']
        }
    };
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { text: input, sender: 'user' as const };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const productList = products.map(p => `- ${p.name} (${p.brand})`).join('\n');
            const systemInstruction = `
                أنت "بطاح بوت"، مساعد ذكي خبير في متجر "بطاح" لقطع غيار السيارات في مصر. تحدث باللهجة المصرية العامية بشكل ودود ومساعد ومختصر جداً. هدفك مساعدة الزبائن في العثور على ما يحتاجونه.
                لو حد سألك على قطعة غيار، شوف هي موجودة في الليستة دي ولا لأ. لو مش موجودة، قول بأدب إنها مش متوفرة حالياً.
                
                دي قائمة المنتجات اللي عندك:
                ${productList}

                لا تخترع منتجات غير موجودة. إذا سأل العميل عن توفر منتج، استخدم الأدوات المتاحة لك للتحقق من المخزون ورد عليه بشكل مباشر.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `سؤال العميل: "${input}"`,
                config: {
                    systemInstruction,
                    tools: [{ functionDeclarations: [checkStockFunctionDeclaration] }],
                },
            });

            const functionCall = response.functionCalls?.[0];
            let botResponseText = '';

            if (functionCall && functionCall.name === 'checkStockByName') {
                const result = checkStockByName(functionCall.args as { productName: string });
                const finalResponse = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `User asked about stock for "${functionCall.args.productName}". The function call returned: ${result}. Formulate a user-friendly response in Egyptian colloquial Arabic based on this data. Be concise.`,
                });
                botResponseText = finalResponse.text;
            } else {
                botResponseText = response.text;
            }

            const botMessage = { text: botResponseText, sender: 'bot' as const };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("Gemini API error:", error);
            const errorMessage = { text: "عذراً، حدث خطأ ما. حاول مرة أخرى.", sender: 'bot' as const };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 left-6 w-16 h-16 bg-primary-dark text-white rounded-full shadow-lg flex items-center justify-center text-3xl z-40 transform hover:scale-110 transition-transform"
                aria-label="Open chatbot"
            >
                <i className="fas fa-robot"></i>
            </button>
            <div className={`fixed bottom-24 left-6 w-80 h-[450px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-40 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="p-4 bg-primary-dark text-white rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-bold text-lg">مساعد بطاح الذكي</h3>
                    <button onClick={() => setIsOpen(false)} className="text-white">&times;</button>
                </div>
                <div ref={chatBodyRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.length === 0 && <div className="text-center text-sm text-gray-500">أهلاً بك في متجر بطاح! إزاي أقدر أساعدك النهاردة؟</div>}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                            <div className="max-w-[80%] p-3 rounded-2xl bg-gray-200 dark:bg-gray-700">
                                <i className="fas fa-spinner fa-spin"></i>
                            </div>
                        </div>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="p-3 border-t dark:border-gray-700 flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="اسأل عن قطعة غيار..."
                        className="flex-grow px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="w-10 h-10 bg-primary-dark text-white rounded-full flex-shrink-0 disabled:bg-gray-400">
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </>
    );
};

export default AIChatbot;
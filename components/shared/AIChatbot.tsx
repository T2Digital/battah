import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { GoogleGenAI, Chat, FunctionDeclaration, Type } from "@google/genai";
import useStore from '../../lib/store';
import { Product } from '../../types';

interface AIChatbotProps {
    setSelectedProduct: (product: Product | null) => void;
    addToCart: (product: Product, quantity: number) => void;
    openCart: () => void;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ setSelectedProduct, addToCart, openCart }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const chatSessionRef = useRef<Chat | null>(null);

    const { products } = useStore(state => ({
        products: state.appData?.products || [],
    }));

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);
    
    // Define tools for the AI
    const tools: FunctionDeclaration[] = [
        {
            name: 'viewProductDetails',
            description: 'يعرض تفاصيل منتج معين للعميل عندما يسأل عنه أو يطلب رؤيته.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    productName: {
                        type: Type.STRING,
                        description: 'اسم المنتج الذي يريد العميل رؤية تفاصيله.'
                    }
                },
                required: ['productName']
            }
        },
        {
            name: 'addProductToCart',
            description: 'يضيف منتجاً إلى سلة التسوق الخاصة بالعميل.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    productName: {
                        type: Type.STRING,
                        description: 'اسم المنتج المراد إضافته للسلة.'
                    },
                    quantity: {
                        type: Type.NUMBER,
                        description: 'الكمية المطلوبة من المنتج، الافتراضي هو 1.'
                    }
                },
                required: ['productName', 'quantity']
            }
        }
    ];

    // Initialize chat session
    useEffect(() => {
        if (isOpen && !chatSessionRef.current) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                const productList = products.map(p => `- ${p.name} (الماركة: ${p.brand}, السعر: ${p.sellingPrice} جنيه)`).join('\n');
                const systemInstruction = `
                    أنت "بطاح بوت"، مساعد ذكي خبير في متجر "بطاح" لقطع غيار السيارات في مصر. تحدث باللهجة المصرية العامية بشكل ودود ومساعد ومختصر جداً. هدفك مساعدة الزبائن في العثور على ما يحتاجونه وتنفيذ طلباتهم.
                    لديك صلاحية استخدام الأدوات التالية:
                    1. 'viewProductDetails': استخدمها عندما يطلب العميل رؤية تفاصيل منتج معين.
                    2. 'addProductToCart': استخدمها عندما يطلب العميل إضافة منتج إلى السلة.
                    
                    عندما تستخدم أداة، قم بالرد على العميل لتأكيد الإجراء (مثلاً: "تمام، فتحتلك تفاصيل المنتج" أو "حاضر، ضفتلك المنتج في السلة").
                    لو سأل العميل عن سعر منتج، أجب بناءً على القائمة التالية. لو المنتج غير موجود، قل بأدب إنه غير متوفر.
                    
                    قائمة المنتجات المتاحة وأسعارها:
                    ${productList}
                `;
                chatSessionRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction, tools: [{ functionDeclarations: tools }] },
                    history: []
                });
            } catch(error) {
                console.error("Failed to initialize chat session", error);
                setMessages([{ text: "عفواً، المساعد الذكي غير متاح حالياً.", sender: 'bot'}]);
            }
        }
    }, [isOpen, products, tools]);
    
    const handleFunctionCall = (name: string, args: any) => {
        const productName = args.productName || '';
        const product = products.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));

        if (!product) {
             return { text: "عفواً، لم أجد المنتج المطلوب.", sender: 'bot' as const };
        }

        if (name === 'viewProductDetails') {
            setSelectedProduct(product);
        } else if (name === 'addProductToCart') {
            const quantity = args.quantity || 1;
            addToCart(product, quantity);
            openCart(); // Open cart after adding item
        }
        return null;
    };


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatSessionRef.current) return;

        const userMessage = { text: input, sender: 'user' as const };
        setMessages(prev => [...prev, userMessage]);
        const userQuery = input;
        setInput('');
        setIsLoading(true);

        try {
            const result = await chatSessionRef.current.sendMessage({ message: userQuery });
            
            if (result.functionCalls && result.functionCalls.length > 0) {
                 for(const fc of result.functionCalls) {
                     const functionError = handleFunctionCall(fc.name, fc.args);
                     if(functionError) {
                         setMessages(prev => [...prev, functionError]);
                     }
                 }
            }
            
            const botResponseText = result.text;
            if (botResponseText) {
                 const botMessage = { text: botResponseText, sender: 'bot' as const };
                 setMessages(prev => [...prev, botMessage]);
            }

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
                    <button onClick={() => setIsOpen(false)} className="text-white text-2xl font-bold">&times;</button>
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
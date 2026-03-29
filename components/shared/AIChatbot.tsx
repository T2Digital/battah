import React, { useState, useRef, useEffect, FormEvent } from 'react';
import useStore from '../../lib/store';
import { Product } from '../../types';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";

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
    const chatRef = useRef<any>(null);

    const { products } = useStore(state => ({
        products: state.appData?.products || [],
    }));

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    // Initialize Gemini Chat
    useEffect(() => {
        const initChat = async () => {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const model = ai.chats.create({
                model: "gemini-3-flash-preview",
                config: {
                    systemInstruction: `أنت مهندس صيانة مخضرم وموظف مبيعات خبير في متجر 'بطاح' لقطع الغيار. لديك معرفة عميقة بكل تفاصيل المتجر والمنتجات المتاحة. شخصيتك ودودة، عملية، وتستخدم لغة فنية بسيطة يفهمها العميل (يا باشا، يا هندسة، يا ريس). مهمتك هي مساعدة العملاء في تشخيص مشاكل سياراتهم واقتراح قطع الغيار المناسبة من المتجر. يمكنك إضافة المنتجات إلى السلة وفتح صفحة إتمام الطلب عند طلب العميل.

عند البحث عن منتجات، استخدم أداة search_products.
عند إضافة منتج للسلة، استخدم أداة add_to_cart.
عند رغبة العميل في الدفع أو إتمام الطلب، استخدم أداة open_checkout.`,
                    tools: [
                        {
                            functionDeclarations: [
                                {
                                    name: "search_products",
                                    description: "البحث عن قطع غيار في المتجر بناءً على اسم القطعة أو وصفها.",
                                    parameters: {
                                        type: Type.OBJECT,
                                        properties: {
                                            query: {
                                                type: Type.STRING,
                                                description: "الكلمة المفتاحية للبحث (مثلاً: تيل فرامل، مساعدين، زيت موتور)"
                                            }
                                        },
                                        required: ["query"]
                                    }
                                },
                                {
                                    name: "add_to_cart",
                                    description: "إضافة قطعة غيار إلى سلة المشتريات.",
                                    parameters: {
                                        type: Type.OBJECT,
                                        properties: {
                                            product_id: {
                                                type: Type.STRING,
                                                description: "معرف المنتج (ID) المراد إضافته"
                                            },
                                            quantity: {
                                                type: Type.NUMBER,
                                                description: "الكمية المطلوبة (الافتراضي 1)"
                                            }
                                        },
                                        required: ["product_id"]
                                    }
                                },
                                {
                                    name: "open_checkout",
                                    description: "فتح صفحة إتمام الطلب (Checkout) للعميل.",
                                    parameters: {
                                        type: Type.OBJECT,
                                        properties: {}
                                    }
                                }
                            ]
                        }
                    ]
                }
            });
            chatRef.current = model;
        };

        if (!chatRef.current) {
            initChat();
        }
    }, []);

    const handleSend = async (e?: FormEvent, textOverride?: string) => {
        if (e) e.preventDefault();
        const userMsg = textOverride || input;
        if (!userMsg.trim() || isLoading || !chatRef.current) return;

        setInput('');
        setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
        setIsLoading(true);

        try {
            let response = await chatRef.current.sendMessage({ message: userMsg });
            let botText = response.text || "";

            // Handle tool calls
            const functionCalls = response.functionCalls;
            if (functionCalls) {
                const results = [];
                for (const call of functionCalls) {
                    if (call.name === "search_products") {
                        const query = call.args.query as string;
                        const filtered = products.filter(p => 
                            p.name.toLowerCase().includes(query.toLowerCase()) || 
                            p.description?.toLowerCase().includes(query.toLowerCase()) ||
                            p.category?.toLowerCase().includes(query.toLowerCase())
                        ).slice(0, 5);
                        
                        results.push({
                            name: call.name,
                            id: call.id,
                            response: { products: filtered.map(p => ({ id: p.id, name: p.name, price: p.sellingPrice, brand: p.brand })) }
                        });
                    } else if (call.name === "add_to_cart") {
                        const productId = call.args.product_id as string;
                        const quantity = (call.args.quantity as number) || 1;
                        const product = products.find(p => String(p.id) === productId);
                        if (product) {
                            addToCart(product, quantity);
                            results.push({
                                name: call.name,
                                id: call.id,
                                response: { success: true, message: `تم إضافة ${product.name} للسلة` }
                            });
                        } else {
                            results.push({
                                name: call.name,
                                id: call.id,
                                response: { success: false, message: "المنتج غير موجود" }
                            });
                        }
                    } else if (call.name === "open_checkout") {
                        openCart();
                        results.push({
                            name: call.name,
                            id: call.id,
                            response: { success: true, message: "تم فتح صفحة إتمام الطلب" }
                        });
                    }
                }

                // Send tool responses back to model
                const finalResponse = await chatRef.current.sendMessage({
                    message: results.map(r => `Tool ${r.name} returned: ${JSON.stringify(r.response)}`).join("\n")
                });
                botText = finalResponse.text || "";
            }

            setMessages(prev => [...prev, { text: botText, sender: 'bot' }]);
        } catch (error) {
            console.error("Gemini Error:", error);
            setMessages(prev => [...prev, { text: "عذراً يا ريس، حصلت مشكلة فنية بسيطة. جرب تاني كمان شوية.", sender: 'bot' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickReply = (text: string) => {
        setInput(text);
        handleSend(undefined, text);
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition-transform hover:scale-110 animate-bounce-slow"
                >
                    <i className="fas fa-robot text-2xl"></i>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-[380px] h-[80vh] md:h-[550px] bg-white dark:bg-gray-800 md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-t md:border border-gray-200 dark:border-gray-700 font-cairo z-[60]">
                    {/* Header */}
                    <div className="bg-primary p-4 flex justify-between items-center text-white shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-inner">
                                <i className="fas fa-user-astronaut text-xl"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">مساعد بطاح الذكي</h3>
                                <p className="text-xs text-blue-100 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    متصل الآن
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 p-2 rounded-full hover:bg-white/10 transition-colors">
                            <i className="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div ref={chatBodyRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-500 text-sm mt-10">
                                <i className="fas fa-robot text-5xl mb-4 text-gray-300 dark:text-gray-600"></i>
                                <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">أهلاً يا باشا! 👋</p>
                                <p className="leading-relaxed mb-4">أنا "مساعد بطاح"، معاك لو محتاج أي قطعة غيار أو عندك مشكلة في عربيتك.</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <button onClick={() => handleQuickReply('العربية بتسخن')} className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs hover:bg-blue-200 transition-colors border border-blue-200 dark:border-blue-800">العربية بتسخن</button>
                                    <button onClick={() => handleQuickReply('صوت تصفير في الفرامل')} className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs hover:bg-blue-200 transition-colors border border-blue-200 dark:border-blue-800">تصفير في الفرامل</button>
                                    <button onClick={() => handleQuickReply('عنوان المحل فين؟')} className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs hover:bg-blue-200 transition-colors border border-blue-200 dark:border-blue-800">عنوان المحل فين؟</button>
                                    <button onClick={() => handleQuickReply('رقم التليفون للتواصل')} className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs hover:bg-blue-200 transition-colors border border-blue-200 dark:border-blue-800">رقم التليفون</button>
                                </div>
                            </div>
                        )}
                        
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                                    msg.sender === 'user' 
                                    ? 'bg-primary text-white rounded-br-none' 
                                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border dark:border-gray-600 rounded-bl-none'
                                }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-gray-700 p-4 rounded-2xl rounded-bl-none shadow-sm border dark:border-gray-600">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex gap-2 items-center pb-safe">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="اكتب سؤالك هنا..."
                            className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()}
                            className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex-shrink-0"
                        >
                            <i className="fas fa-paper-plane text-lg"></i>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default AIChatbot;
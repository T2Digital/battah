import React, { useState, useRef, useEffect, FormEvent } from 'react';
import useStore from '../../lib/store';
import { Product } from '../../types';
import { GoogleGenAI, Type } from "@google/genai";
import { getStoreBranding } from '../../lib/appConfig';

interface AIChatbotProps {
    setSelectedProduct: (product: Product | null) => void;
    addToCart: (product: Product, quantity: number) => void;
    openCart: () => void;
    hasCartItems?: boolean;
}

const AIChatbot: React.FC<AIChatbotProps> = ({
    setSelectedProduct,
    addToCart,
    openCart,
    hasCartItems = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const chatBodyRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<any>(null);

    const { products, storefrontSettings } = useStore(state => ({
        products: state.appData?.products || [],
        storefrontSettings: state.appData?.storefrontSettings,
    }));
    const branding = getStoreBranding(storefrontSettings, 'المتجر');

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const handleQuickReply = (text: string) => {
        setInput(text);
        handleSend(undefined, text);
    };

    const handleSend = async (e?: FormEvent, textOverride?: string) => {
        if (e) e.preventDefault();
        const userMsg = textOverride || input;
        if (!userMsg.trim() || isLoading) return;

        setInput('');
        setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
            const modelName = "gemini-3-flash-preview"; 
            
            const tools = [
                {
                    functionDeclarations: [
                        {
                            name: "add_to_cart",
                            description: "إضافة منتج إلى سلة التسوق. يجب البحث عن المنتج أولاً للحصول على معرفه (ID).",
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    productId: { type: Type.NUMBER, description: "معرف المنتج المراد إضافته" },
                                    quantity: { type: Type.NUMBER, description: "الكمية المطلوبة (افتراضياً 1)" }
                                },
                                required: ["productId"]
                            }
                        },
                        {
                            name: "open_checkout",
                            description: "فتح صفحة إتمام الطلب (الدفع) للعميل.",
                            parameters: { type: Type.OBJECT, properties: {} }
                        },
                        {
                            name: "search_products",
                            description: "البحث عن المنتجات المتاحة في المتجر باستخدام كلمات مفتاحية.",
                            parameters: {
                                type: Type.OBJECT,
                                properties: {
                                    query: { type: Type.STRING, description: "كلمة البحث (مثلاً: تيل فرامل، زيت، بوجيهات)" }
                                },
                                required: ["query"]
                            }
                        }
                    ]
                }
            ];

            const systemInstruction = `أنت "مساعد ${branding.companyName} الذكي"، مستشار مبيعات محترف وودود في متجر "${branding.companyName}".
أسلوبك في الكلام: ودود، مصري احترافي وبسيط، ومساعد جداً.

مهامك:
1. مساعدة العميل في اختيار المنتج الأنسب لاحتياجاته واقتراح بدائل مناسبة.
2. البحث عن المنتجات المتاحة في المتجر باستخدام أداة search_products.
3. عند عرض المنتجات للعميل، ذكر السعر بوضوح وتنسيق الرد في قائمة منظمة وسهلة القراءة.
4. إضافة المنتجات للسلة للعميل باستخدام أداة add_to_cart عند طلبه ذلك.
5. توجيه العميل لإتمام الطلب باستخدام أداة open_checkout.
6. تقديم معلومات المتجر المتوفرة (العنوان: ${branding.address || 'مصر'}، رقم التواصل: ${branding.contactPhone || 'عبر المتجر'}).

قواعد هامة للتنسيق:
- عند عرض المنتجات، استخدم التنسيق التالي لكل منتج:
  * [اسم المنتج]
  * السعر: [السعر] ج.م
  * كود المنتج (ID): [رقم الكود]
- افصل بين كل منتج والآخر بسطر فارغ.
- لا تخترع منتجات غير موجودة، استخدم دائماً أداة البحث للتأكد.
- إذا طلب العميل إضافة شيء للسلة، ابحث عنه أولاً ثم استخدم add_to_cart.`;

            if (!chatRef.current) {
                chatRef.current = ai.chats.create({
                    model: modelName,
                    config: {
                        systemInstruction,
                        tools,
                    }
                });
            }

            const chat = chatRef.current;
            let response = await chat.sendMessage({ message: userMsg });
            let botText = response.text || "";
            const functionCalls = response.functionCalls;

            if (functionCalls && functionCalls.length > 0) {
                const functionResponses = [];
                for (const call of functionCalls) {
                    if (call.name === "search_products") {
                        const { query } = call.args as { query: string };
                        const results = products.filter(p => 
                            p.name.toLowerCase().includes(query.toLowerCase()) || 
                            p.description?.toLowerCase().includes(query.toLowerCase()) ||
                            p.category?.toLowerCase().includes(query.toLowerCase())
                        ).slice(0, 5);
                        
                        const toolResult = results.length > 0 
                            ? `نتائج البحث عن "${query}":\n\n` + results.map(p => 
                                `📦 *${p.name}*\n💰 السعر: ${p.sellingPrice} ج.م\n🔢 كود المنتج: ${p.id}\n`
                              ).join('\n')
                            : `للأسف مفيش نتائج لـ "${query}" حالياً.`;

                        functionResponses.push({
                            functionResponse: { name: "search_products", response: { result: toolResult } }
                        });
                    } else if (call.name === "add_to_cart") {
                        const { productId, quantity = 1 } = call.args as { productId: number, quantity?: number };
                        const product = products.find(p => p.id === productId);
                        if (product) {
                            addToCart(product, quantity);
                            const toolResult = `تم إضافة ${quantity} من ${product.name} للسلة بنجاح.`;
                            functionResponses.push({
                                functionResponse: { name: "add_to_cart", response: { result: toolResult } }
                            });
                        }
                    } else if (call.name === "open_checkout") {
                        openCart();
                        const toolResult = "تم فتح سلة المشتريات للعميل ليتمكن من إتمام الطلب.";
                        functionResponses.push({
                            functionResponse: { name: "open_checkout", response: { result: toolResult } }
                        });
                    }
                }

                if (functionResponses.length > 0) {
                    const secondResponse = await chat.sendMessage({
                        message: functionResponses
                    });
                    botText = secondResponse.text || botText;
                }
            }

            if (!botText) botText = "معلش يا ريس، حصلت مشكلة عندي. قولي تاني كده محتاج إيه؟";
            setMessages(prev => [...prev, { text: botText, sender: 'bot' }]);

        } catch (error) {
            console.error("Gemini Error:", error);
            chatRef.current = null;
            setMessages(prev => [...prev, { text: "يا هندسة السيرفر مهنج شوية، جرب كمان دقيقة كده.", sender: 'bot' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className={`fixed ${
                        hasCartItems ? 'bottom-[9.2rem]' : 'bottom-[5rem]'
                    } left-3.5 md:bottom-6 md:left-6 z-[45] w-12 h-12 sm:w-14 sm:h-14 bg-primary text-white rounded-full brand-glow shadow-xl flex items-center justify-center hover:bg-primary-dark transition-all hover:scale-110`}
                    aria-label="افتح المساعد الذكي"
                >
                    <i className="fas fa-robot text-lg sm:text-2xl" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-6 md:right-auto md:w-[380px] h-[85dvh] md:h-[550px] bg-white dark:bg-[#0d1323] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-t md:border border-slate-200 dark:border-white/10 font-cairo z-[95]">
                    {/* Header */}
                    <div className="bg-primary p-4 flex justify-between items-center text-white shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-inner">
                                <i className="fas fa-robot text-lg" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm truncate max-w-[200px]">مساعد {branding.companyName}</h3>
                                <p className="text-xs text-blue-100 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                    متصل الآن للمساعدة الفورية
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="إغلاق المساعد"
                            className="text-white hover:text-gray-200 p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <i className="fas fa-times text-xl" />
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div ref={chatBodyRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#060913]">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-500 text-sm mt-8">
                                <i className="fas fa-robot text-5xl mb-4 text-slate-300 dark:text-slate-600" />
                                <p className="font-extrabold text-slate-800 dark:text-slate-200 mb-2">
                                    أهلاً بك في {branding.companyName}! 👋
                                </p>
                                <p className="leading-relaxed mb-4 text-xs sm:text-sm">
                                    أنا المساعد الذكي للمتجر، اسألني عن أي منتج أو عرض وسأساعدك فوراً.
                                </p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <button type="button" onClick={() => handleQuickReply('أقوى العروض المتاحة؟')} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold hover:bg-primary hover:text-white transition-colors border border-primary/20">أقوى العروض المتاحة؟</button>
                                    <button type="button" onClick={() => handleQuickReply('ساعدني أختار منتج مناسب')} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold hover:bg-primary hover:text-white transition-colors border border-primary/20">ساعدني أختار منتج مناسب</button>
                                    <button type="button" onClick={() => handleQuickReply('سياسة الشحن والتوصيل؟')} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold hover:bg-primary hover:text-white transition-colors border border-primary/20">سياسة الشحن والتوصيل؟</button>
                                    <button type="button" onClick={() => handleQuickReply('طرق التواصل والعنوان؟')} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold hover:bg-primary hover:text-white transition-colors border border-primary/20">طرق التواصل والعنوان؟</button>
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

import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppData } from '../../types';

interface AdminAIChatbotProps {
    appData: AppData;
}

const AdminAIChatbot: React.FC<AdminAIChatbotProps> = ({ appData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatBodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const createDataSummaryForAI = () => {
        // Create a detailed, yet manageable, summary of the entire app data for the AI context.
        return {
            products: (appData.products || []).map(p => ({
                name: p.name,
                sku: p.sku,
                mainCategory: p.mainCategory,
                brand: p.brand,
                sellingPrice: p.sellingPrice,
                // FIX: Replaced reduce with a direct sum to avoid type inference issues and ensure the result is a number.
                totalStock: p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3,
            })),
            dailySalesSummary: {
                totalSalesToday: (appData.dailySales || [])
                    .filter(s => s.date === new Date().toISOString().split('T')[0])
                    .reduce((sum, s) => sum + (s.direction === 'بيع' ? s.totalAmount : -s.totalAmount), 0),
                salesCountToday: (appData.dailySales || []).filter(s => s.date === new Date().toISOString().split('T')[0]).length,
            },
            expensesSummary: {
                totalExpenses: (appData.expenses || []).reduce((sum, e) => sum + e.amount, 0),
                expenseCount: (appData.expenses || []).length,
            },
            employees: (appData.employees || []).map(e => ({ name: e.name, position: e.position })),
            ordersSummary: {
                totalOrders: (appData.orders || []).length,
                pendingOrders: (appData.orders || []).filter(o => o.status === 'pending').length,
            },
        };
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { text: input, sender: 'user' as const };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const dataForAI = createDataSummaryForAI();

            const systemInstruction = `
                أنت "AdminInsight"، محلل بيانات وخبير أعمال فائق الذكاء تعمل لدى المدير العام لشركة "بطاح" لقطع غيار السيارات.
                مهمتك هي تحليل بيانات النظام التالية (بصيغة JSON) والإجابة على سؤال المدير بدقة. يجب أن تبحث داخل البيانات للعثور على إجابات محددة.
                تحدث باللهجة المصرية العامية بشكل احترافي وواضح.
                قدم إجابات مباشرة مدعومة بالأرقام من البيانات. لا تخترع معلومات.
                مثال: لو سألك المدير "عندنا كام فلتر زيت؟"، يجب أن تبحث في قائمة المنتجات وتعد المنتجات التي اسمها يحتوي على "فلتر زيت" وتعطي رقماً دقيقاً.
            `;

            const prompt = `
                Data Context:
                ${JSON.stringify(dataForAI, null, 2)}

                Manager's Question: "${input}"
            `;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: { systemInstruction }
            });

            const botMessage = { text: response.text, sender: 'bot' as const };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            console.error("Gemini API error:", error);
            const errorMessage = { text: "عذراً، حدث خطأ أثناء تحليل البيانات.", sender: 'bot' as const };
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
                aria-label="Open admin chatbot"
            >
                <i className="fas fa-brain"></i>
            </button>
            <div className={`fixed bottom-24 left-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-40 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                <div className="p-4 bg-primary-dark text-white rounded-t-2xl flex justify-between items-center">
                    <h3 className="font-bold text-lg">مساعد المدير الذكي (AdminInsight)</h3>
                    <button onClick={() => setIsOpen(false)} className="text-white text-2xl">&times;</button>
                </div>
                <div ref={chatBodyRef} className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.length === 0 && <div className="text-center text-sm text-gray-500">أهلاً بيك يا فندم. إزاي أقدر أساعدك في تحليل بيانات النظام النهاردة؟</div>}
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
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
                        placeholder="اطلب تحليل أو تقرير..."
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

export default AdminAIChatbot;
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";

const AIChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'ai' }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const initializeChat = () => {
        if (!chatRef.current) {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: {
                      systemInstruction: `You are a friendly and knowledgeable AI assistant for "Battah Auto Parts," an auto parts store in Egypt.
                      Your goal is to help customers find the right parts, answer their questions, and provide helpful advice.
                      Always be polite and professional. Your responses must be in Arabic.`,
                    },
                });
                setMessages([{ text: 'مرحباً بك في متجر بطاح! كيف يمكنني مساعدتك اليوم في العثور على قطع غيار لسيارتك؟', sender: 'ai' }]);
            } catch(e) {
                console.error("Failed to initialize AI Chat", e);
                setMessages([{ text: 'عذراً، خدمة المساعد الذكي غير متاحة حالياً.', sender: 'ai' }]);
            }
        }
    };
    
    const toggleChat = () => {
        setIsOpen(!isOpen);
        if (!isOpen && !chatRef.current) {
            initializeChat();
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatRef.current) return;
        
        const userMessage = { text: input, sender: 'user' as const };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatRef.current.sendMessage({ message: input });
            const aiMessage = { text: response.text, sender: 'ai' as const };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Gemini chat error:', error);
            const errorMessage = { text: 'عفواً، حدث خطأ ما. يرجى المحاولة مرة أخرى.', sender: 'ai' as const };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={toggleChat}
                className="fixed bottom-6 left-6 w-16 h-16 bg-gradient-to-br from-primary to-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-3xl z-40 transform transition-transform hover:scale-110"
                aria-label="افتح المساعد الذكي"
            >
                <i className="fas fa-robot"></i>
            </button>

            {isOpen && (
                 <div className="fixed bottom-24 left-6 w-full max-w-sm h-[60vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-40 flex flex-col animate-fade-in">
                    <header className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-900 rounded-t-2xl">
                        <div className="flex items-center gap-3">
                            <i className="fas fa-robot text-primary text-xl"></i>
                            <h3 className="font-bold text-lg">المساعد الذكي</h3>
                        </div>
                        <button onClick={toggleChat} className="text-gray-500 hover:text-gray-800 dark:hover:text-white">&times;</button>
                    </header>
                    <div className="flex-grow p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 rounded-bl-none'}`}>
                                    <p className="text-sm">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex justify-start gap-2">
                                <div className="p-3 rounded-2xl bg-gray-200 dark:bg-gray-700 rounded-bl-none">
                                    <span className="animate-pulse">...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSend} className="p-4 border-t dark:border-gray-700 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="اسأل عن أي قطعة غيار..."
                            className="flex-grow p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="px-4 py-2 bg-primary text-white rounded-lg disabled:bg-gray-400">
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default AIChatbot;

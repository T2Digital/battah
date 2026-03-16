import React, { useState, useRef, useEffect, FormEvent } from 'react';
import useStore from '../../lib/store';

const AdminChatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const chatBodyRef = useRef<HTMLDivElement>(null);

    const { products, orders, dailySales, treasury, employees, expenses, suppliers, advances, payroll } = useStore(state => ({
        products: state.appData?.products || [],
        orders: state.appData?.orders || [],
        dailySales: state.appData?.dailySales || [],
        treasury: state.appData?.treasury || [],
        employees: state.appData?.employees || [],
        expenses: state.appData?.expenses || [],
        suppliers: state.appData?.suppliers || [],
        advances: state.appData?.advances || [],
        payroll: state.appData?.payroll || [],
    }));

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const processAdminMessage = (text: string): string => {
        const lowerText = text.toLowerCase();
        const today = new Date().toISOString().split('T')[0];

        // 0. Comprehensive Daily Report (تقرير شامل)
        if (/(تقرير|شامل|ملخص|يومية|النهاردة عملنا ايه|حركة اليوم|قفل اليوم|الخلاصة)/.test(lowerText)) {
            const todaySales = dailySales.filter(s => s.date === today).reduce((sum, s) => sum + s.totalAmount, 0);
            const todayExpenses = expenses.filter(e => e.date.startsWith(today)).reduce((sum, e) => sum + e.amount, 0);
            const balance = treasury.reduce((sum, t) => sum + (t.amountIn || 0) - (t.amountOut || 0), 0);
            const pendingOrders = orders.filter(o => o.status === 'pending').length;
            const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
            const lowStockCount = products.filter(p => p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3 <= (p.reorderPoint || 3)).length;

            return `تحت أمرك يا فندم، ده ملخص شامل لحركة اليوم (${today}):\n\n` +
                   `💰 **المبيعات:** ${todaySales.toLocaleString()} جنيه.\n` +
                   `📉 **المصروفات:** ${todayExpenses.toLocaleString()} جنيه.\n` +
                   `🏦 **رصيد الخزنة الحالي:** ${balance.toLocaleString()} جنيه.\n` +
                   `📦 **طلبات الأونلاين:** ${pendingOrders} معلق، و ${confirmedOrders} جاهز للشحن.\n` +
                   `⚠️ **النواقص:** عندنا ${lowStockCount} صنف رصيدهم قرب يخلص.\n\n` +
                   `يوم موفق يا ريس! محتاج تفاصيل أكتر عن أي حاجة فيهم؟`;
        }

        // 1. Treasury / Cash
        if (/(خزنة|درج|فلوس|نقدية|رصيد|الكاش|معانا كام)/.test(lowerText)) {
            const balance = treasury.reduce((sum, t) => sum + (t.amountIn || 0) - (t.amountOut || 0), 0);
            return `رصيد الخزنة الحالي يا فندم هو: ${balance.toLocaleString()} جنيه. تحب أراجعلك حركات الخزنة الأخيرة؟`;
        }
        
        // 2. Sales Today
        if (/(مبيعات|بيع|بعنا|ايراد|دخلنا)/.test(lowerText)) {
            const todaySales = dailySales.filter(s => s.date === today).reduce((sum, s) => sum + s.totalAmount, 0);
            return `إجمالي مبيعات النهاردة لحد دلوقتي عامل ${todaySales.toLocaleString()} جنيه. ربنا يزيد ويبارك!`;
        }

        // 3. Orders Status
        if (/(طلبات|اوردرات|مطلوب|معلق|توصيل)/.test(lowerText)) {
            const pending = orders.filter(o => o.status === 'pending').length;
            const confirmed = orders.filter(o => o.status === 'confirmed').length;
            if (pending === 0 && confirmed === 0) return "مفيش طلبات أونلاين جديدة النهاردة يا فندم.";
            return `بالنسبة لطلبات الأونلاين: عندنا ${pending} طلب معلق محتاجين يتراجعوا، و ${confirmed} طلب مؤكد وجاهزين على الشحن.`;
        }

        // 4. Inventory Value & Capital
        if (/(قيمة البضاعة|راس المال|رأس المال|إجمالي المخزون|بضاعتنا بكام)/.test(lowerText)) {
            const totalValue = products.reduce((sum, p) => {
                const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
                return sum + (totalStock * p.purchasePrice);
            }, 0);
            return `إجمالي قيمة البضاعة الموجودة في كل الفروع (بسعر الشراء) هي: ${totalValue.toLocaleString()} جنيه يا فندم.`;
        }

        // 5. Inventory / Low Stock
        if (/(نواقص|ناقص|خلصان|مخزون|بضاعة|جرد)/.test(lowerText)) {
            const lowStock = products.filter(p => (p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3) <= (p.reorderPoint || 3));
            if (lowStock.length === 0) {
                return "المخزون كله تمام يا فندم، مفيش أي نواقص حالياً والحمد لله.";
            }
            const items = lowStock.slice(0, 5).map(p => `🔸 ${p.name} (باقي ${p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3})`).join('\n');
            return `خلي بالك يا هندسة، عندنا ${lowStock.length} أصناف رصيدهم قل جداً ومحتاجين نطلبهم. دي أهم 5 أصناف:\n${items}\nتقدر تراجع قسم التقارير عشان تشوف القائمة كاملة.`;
        }

        // 6. Specific Product Search
        if (/(سعر|عندنا كام|رصيد|منتج|قطعة) (.*)/.test(lowerText)) {
            const match = lowerText.match(/(سعر|عندنا كام|رصيد|منتج|قطعة) (.*)/);
            if (match && match[2]) {
                const searchTerm = match[2].trim();
                const foundProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm));
                
                if (foundProducts.length === 0) return `للأسف يا فندم، مفيش منتج بالاسم ده "${searchTerm}" في المخزن.`;
                
                if (foundProducts.length === 1) {
                    const p = foundProducts[0];
                    const totalStock = p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3;
                    return `المنتج: ${p.name}\nالكود: ${p.sku}\nسعر البيع: ${p.sellingPrice} جنيه\nالرصيد الكلي: ${totalStock} قطعة.`;
                }
                
                const items = foundProducts.slice(0, 3).map(p => `- ${p.name} (${p.sellingPrice} ج) - رصيد: ${p.stock.main + p.stock.branch1 + p.stock.branch2 + p.stock.branch3}`).join('\n');
                return `لقيت أكتر من منتج بالاسم ده، دي أقرب نتايج:\n${items}`;
            }
        }

        // 7. Suppliers Debts
        if (/(موردين|ديون|علينا كام|حساب الموردين)/.test(lowerText)) {
            // Calculate total debts based on purchase orders and payments
            const totalPurchases = useStore.getState().appData?.purchaseOrders?.reduce((sum, po) => sum + po.totalAmount, 0) || 0;
            const totalPayments = useStore.getState().appData?.payments?.reduce((sum, p) => sum + p.payment, 0) || 0;
            const totalDebts = totalPurchases - totalPayments;
            
            if (totalDebts <= 0) return "الحمد لله يا فندم، معليناش أي فلوس للموردين.";
            return `إجمالي المديونيات اللي علينا للموردين: ${totalDebts.toLocaleString()} جنيه.`;
        }

        // 8. Expenses
        if (/(مصاريف|مصروفات|صرفنا)/.test(lowerText)) {
            const todayExpenses = expenses.filter(e => e.date.startsWith(today)).reduce((sum, e) => sum + e.amount, 0);
            if (todayExpenses === 0) return "مفيش أي مصروفات طلعت النهاردة يا فندم.";
            return `إجمالي المصروفات اللي طلعت النهاردة: ${todayExpenses.toLocaleString()} جنيه.`;
        }

        // 9. Employees & Advances
        if (/(موظفين|عمال|رجالة|مين شغال)/.test(lowerText)) {
            return `الرجالة اللي مسجلين على السيستم عددهم ${employees.length} موظفين.`;
        }
        if (/(سلف|سلفة) (.*)/.test(lowerText)) {
            const match = lowerText.match(/(سلف|سلفة) (.*)/);
            if (match && match[2]) {
                const empName = match[2].trim();
                const emp = employees.find(e => e.name.toLowerCase().includes(empName));
                if (!emp) return `مش لاقي موظف بالاسم ده يا فندم.`;
                const empAdvances = advances.filter(a => a.employeeId === emp.id).reduce((sum, a) => sum + a.amount, 0);
                return `إجمالي سلف الموظف ${emp.name} هو: ${empAdvances.toLocaleString()} جنيه.`;
            }
        }

        // 10. Greeting
        if (/(اهلا|سلام|صباح|مسا|يا مدير|يا ريس|ازيك|عامل ايه)/.test(lowerText)) {
            return "أهلاً بيك يا فندم! منور السيستم. أنا المساعد الإداري بتاعك، جاهز أطلعلك أي تقرير تحتاجه (مبيعات، خزنة، نواقص، طلبات، قيمة البضاعة، الموردين، أو حتى تقرير شامل عن اليوم كله). أؤمرني؟";
        }

        // 11. Company Info
        if (/(عنوان|مكان|موقع|تليفون|رقم|تواصل|اتصال|موبايل|فرع)/.test(lowerText)) {
            return "بيانات الشركة المسجلة:\nالعنوان: 79 شارع رمسيس ناصية التوفيقية، القاهرة.\nرقم الموبايل / الواتساب: 01080444447\nمواعيد العمل: من 9 صباحاً لـ 10 مساءً.";
        }

        // Fallback (Conversational)
        return "عفواً يا فندم، أنا لسه بتعلم ومفهمتش قصدك بالظبط. بس أقدر أجمعلك (تقرير شامل) عن حركة اليوم، أو أقولك رصيد (الخزنة)، (المبيعات)، (قيمة البضاعة)، و(ديون الموردين). تحب أجهزلك التقرير الشامل؟";
    };

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

        setTimeout(() => {
            const botResponse = processAdminMessage(userMsg);
            setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
            setIsLoading(false);
        }, 600);
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gray-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-900 transition-transform hover:scale-110 animate-bounce-slow"
                >
                    <i className="fas fa-user-tie text-2xl"></i>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:right-6 md:left-auto md:w-[380px] h-[80vh] md:h-[550px] bg-white dark:bg-gray-800 md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-t md:border border-gray-200 dark:border-gray-700 font-cairo z-[60]">
                    {/* Header */}
                    <div className="bg-gray-800 p-4 flex justify-between items-center text-white shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-800 shadow-inner">
                                <i className="fas fa-chart-line text-xl"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">مساعد الإدارة</h3>
                                <p className="text-xs text-gray-300 flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    متصل بقاعدة البيانات
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
                                <i className="fas fa-user-tie text-5xl mb-4 text-gray-300 dark:text-gray-600"></i>
                                <p className="font-bold text-gray-700 dark:text-gray-300 mb-2">أهلاً يا مدير! 👋</p>
                                <p className="leading-relaxed mb-4">أنا مساعدك الإداري، مطلع على كل بيانات السيستم. اسألني عن المبيعات، الخزنة، أو النواقص.</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <button onClick={() => handleQuickReply('تقرير شامل')} className="px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs hover:bg-gray-300 transition-colors border border-gray-300 dark:border-gray-600">تقرير شامل</button>
                                    <button onClick={() => handleQuickReply('رصيد الخزنة')} className="px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs hover:bg-gray-300 transition-colors border border-gray-300 dark:border-gray-600">رصيد الخزنة</button>
                                    <button onClick={() => handleQuickReply('مبيعات اليوم')} className="px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs hover:bg-gray-300 transition-colors border border-gray-300 dark:border-gray-600">مبيعات اليوم</button>
                                    <button onClick={() => handleQuickReply('النواقص')} className="px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs hover:bg-gray-300 transition-colors border border-gray-300 dark:border-gray-600">النواقص</button>
                                    <button onClick={() => handleQuickReply('قيمة البضاعة')} className="px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs hover:bg-gray-300 transition-colors border border-gray-300 dark:border-gray-600">قيمة البضاعة</button>
                                </div>
                            </div>
                        )}
                        
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                                    msg.sender === 'user' 
                                    ? 'bg-gray-800 text-white rounded-br-none' 
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
                            placeholder="اسأل عن تقرير..."
                            className="flex-grow bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 transition-shadow"
                        />
                        <button 
                            type="submit" 
                            disabled={isLoading || !input.trim()}
                            className="w-12 h-12 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex-shrink-0"
                        >
                            <i className="fas fa-paper-plane text-lg"></i>
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default AdminChatbot;

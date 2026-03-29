import React, { useState, useRef, useEffect, FormEvent } from 'react';
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
    const lastDiscussedProduct = useRef<Product | null>(null);

    const { products } = useStore(state => ({
        products: state.appData?.products || [],
    }));

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    // --- Local Bot Logic (No API Key Required) ---
    const searchLocalProducts = (query: string): Product[] => {
        // Remove common filler words to improve search
        const fillerWords = ['عايز', 'عاوز', 'محتاج', 'بكام', 'سعر', 'عندك', 'من', 'في', 'يا', 'باشا', 'هندسة', 'لو', 'سمحت', 'عربية', 'عربيتي', 'مشكلة', 'صوت', 'ريحة'];
        let cleanQuery = query.toLowerCase();
        fillerWords.forEach(word => {
            cleanQuery = cleanQuery.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
        });
        cleanQuery = cleanQuery.trim();

        if (!cleanQuery) return [];

        const keywords = cleanQuery.split(' ').filter(k => k.length > 2);
        if (keywords.length === 0) keywords.push(cleanQuery);
        
        return products.filter(p => {
            const searchStr = `${p.name} ${p.description || ''} ${p.category || ''} ${p.brand || ''}`.toLowerCase();
            return keywords.some(k => searchStr.includes(k));
        }).slice(0, 3); // Return top 3 matches
    };

    const processLocalMessage = (text: string): string => {
        const lowerText = text.toLowerCase();
        let response = "";
        let foundProducts: Product[] = [];

        // 1. Check for "Add to Cart" intent
        if (/(ضيف|هات|اشتري|تمام|ماشي|واحد|اتنين|حط|ابعت|سلة)/.test(lowerText) && lastDiscussedProduct.current) {
            addToCart(lastDiscussedProduct.current, 1);
            openCart();
            const name = lastDiscussedProduct.current.name;
            lastDiscussedProduct.current = null; // Reset after adding
            return `عنيا يا ريس! ضفتلك "${name}" في السلة. تحب تطلب حاجة تانية ولا نقفل الأوردر؟`;
        }

        // 2. Expanded Diagnosis Rules (Hardcoded Knowledge Base)
        
        // الفرامل (Brakes)
        if (/(تصفير|فرامل|صرخة|طنابير|ماستر|باكم|تيل|محجرة|بتسفنج|بدال|سلك فرامل|رعشة مع الفرامل)/.test(lowerText)) {
            response = "مشاكل الفرامل مفيهاش هزار يا هندسة! لو في تصفير أو رعشة يبقى غالباً تيل فرامل أو الطنابير محتاجة تتخرط. لو البدال محجر أو بيسفنج راجع زيت الباكم والماستر. دي قطع غيار الفرامل المتاحة عندي:";
            foundProducts = searchLocalProducts("تيل طنابير ماستر باكم");
        } 
        // دورة التبريد والحرارة (Cooling & Heat)
        else if (/(سخونة|حرارة|ميه|ريداتير|بتسخن|مياه|طرمبة ميه|قربة|مروحة|ثرموستات|كوعة|غليان|نقص ميه|مؤشر الحرارة)/.test(lowerText)) {
            response = "سخونة المكنة خطر! راجع مستوى المياه في القربة والريداتير، وتأكد إن المروحة شغالة ومفيش تسريب من طرمبة المياه أو الكوعة. الثرموستات كمان ممكن يعلق. شوف الحاجات دي في المتجر:";
            foundProducts = searchLocalProducts("مياه طرمبة ريداتير ثرموستات مروحة");
        } 
        // المحرك والزيت (Engine & Oil)
        else if (/(زيت|لزوجه|موتور|مكنة|فلتر زيت|شمبر|بستم|صباب|جوان|وش سلندر|طحينة|بياكل زيت|دخان|دخنة|تسريب زيت|نقص زيت)/.test(lowerText)) {
            response = "لو المكنة بتاكل زيت أو بتطلع دخنة (بيضا أو زرقا)، ممكن يكون طقم شنبر أو جلد صباب. لو الزيت بيقلب طحينة يبقى جوان وش سلندر ضرب! طبعاً تغيير الزيت والفلتر في ميعادهم بيحافظ على المكنة. دي الزيوت والفلاتر المتاحة:";
            foundProducts = searchLocalProducts("زيت فلتر جوان شنبر");
        } 
        // الكهرباء والبطارية (Electrical & Battery)
        else if (/(بطارية|مبتدورش|مارش|دينامو|كهربا|نايمة|عتلة|كتاوت|فيوز|ضفيرة|لمبة|نور|تكتكة)/.test(lowerText)) {
            response = "لو بتسمع 'تكتكة' والمارش مابيلفش، غالباً البطارية نايمة أو قواطيش البطارية مملحة. لو بتدور بصعوبة ممكن المارش محتاج صيانة. ولو اللمبة بتنور وتطفي يبقى الدينامو مابيشحنش كويس. تحب نشوف أسعار البطاريات؟";
            foundProducts = searchLocalProducts("بطارية مارش دينامو كتاوت");
        } 
        // الإشعال والأداء (Ignition & Performance)
        else if (/(بوجيهات|سحب|تقطيع|تنتيش|مكتومة|موبينة|رشاشات|بنزين|طرمبة بنزين|مخنوقة|استهلاك|عزم|برجلة)/.test(lowerText)) {
            response = "التقطيع وضعف السحب واستهلاك البنزين العالي غالباً بيكون من دورة الإشعال (بوجيهات، موبينة، أسلاك) أو دورة الوقود (فلتر بنزين مكتوم، رشاشات محتاجة تنظيف، أو طرمبة بنزين ضعيفة). دي القطع المتاحة:";
            foundProducts = searchLocalProducts("بوجيه موبينة فلتر بنزين طرمبة رشاش");
        } 
        // العفشة والتوجيه (Suspension & Steering)
        else if (/(عفشة|مساعدين|مقصات|تخبيط|طقطقة|مطب|جلب|بيض|تيش|كبالن|تزييق|عومان|دركسيون|باور|حذفة|رجة)/.test(lowerText)) {
            response = "طقطقة مع الملفات = كبالن خارجية. تخبيط في المطبات = مساعدين أو جلب مقصات. تزييق = بيض مقصات أو تيش ميزان. لو العربية بتعوم منك راجع العفشة وظبط الزوايا. لقيتلك دول في المتجر:";
            foundProducts = searchLocalProducts("مساعد مقص تيش كبلن جلب");
        } 
        // الفتيس والدبرياج (Transmission & Clutch)
        else if (/(فتيس|دبرياج|اسطوانة|ديسك|بلية|نتشة|هبدة|غيارات|زيت فتيس|عضة|رعشة في الطلعة)/.test(lowerText)) {
            response = "رعشة في الطلعة أو الغيارات بتعض = طقم دبرياج (اسطوانة وديسك وبلية). لو فتيس أوتوماتيك وفي نتشة، راجع زيت الفتيس وفلتره الأول. دي القطع المتاحة:";
            foundProducts = searchLocalProducts("اسطوانة ديسك بلية زيت فتيس");
        }
        // السيور والفلاتر (Belts & Filters)
        else if (/(سيور|سير|كاتينة|دينامو|شداد|بلية كاتينة|فلتر هوا|تكييف)/.test(lowerText)) {
            response = "سير الكاتينة ده حياة أو موت للمكنة، لازم يتغير في ميعاده مع بلي الشداد! وسيور المجموعة (دينامو وتكييف) لو بتصفر تتغير. وفلاتر الهواء والتكييف بتتغير مع الصيانة الدورية. دي المتاح:";
            foundProducts = searchLocalProducts("سير كاتينة دينامو فلتر هواء");
        }
        // الشكمان (Exhaust)
        else if (/(شكمان|علبة بيئة|صوت عالي|هباب)/.test(lowerText)) {
            response = "صوت المكنة العالي أو ريحة العادم الكريهة ممكن يكون تسريب في الشكمان أو علبة البيئة مسدودة. دي قطع الشكمان المتاحة:";
            foundProducts = searchLocalProducts("شكمان علبة بيئة جوان");
        }
        // 3. Greeting
        else if (/(اهلا|سلام|هاي|مرحبا|ازيك|عامل|صباح|مسا|يا باشا|يا هندسة)/.test(lowerText)) {
            return "أهلاً بيك يا ريس! منور متجر بطاح الأصلي. معاك مساعد بطاح، أقدر أخدمك في إيه؟ بتدور على قطعة معينة ولا عربيتك فيها مشكلة ومحتاج استشارة؟";
        }
        // 4. Company Info
        else if (/(عنوان|مكان|موقع|تليفون|رقم|تواصل|اتصال|موبايل|فرع)/.test(lowerText)) {
            return "عناوين فروعنا:\n- 79 شارع رمسيس ناصية التوفيقية امام سنترال رمسيس\n- 19 شارع رمسيس ناصية التوفيقية امام سنترال رمسيس\n- 6 شارع البورصة ناصية التوفيقية بجوار سينما ريفولى\n- 1 شارع البورصة ناصية التوفيقية امام دار القضاء العالى\n\nتقدر تتواصل معانا على رقم الموبايل أو الواتساب: 01080444447\nمواعيد العمل من 9 صباحاً لـ 10 مساءً.";
        }
        // 5. General Product Search (Fallback)
        else {
            foundProducts = searchLocalProducts(lowerText);
            if (foundProducts.length > 0) {
                response = "لقيتلك الحاجات دي في المتجر يا باشا:";
            } else {
                return "والله يا هندسة مش لاقي حاجة بالاسم ده في المتجر حالياً. جرب تكتب اسم القطعة بطريقة تانية، أو اشرحلي المشكلة اللي في عربيتك (مثلاً: العربية بتنتش، بتسخن، بتصفر) وأنا هقولك العيب منين.";
            }
        }

        // Format Product Results
        if (foundProducts.length > 0) {
            lastDiscussedProduct.current = foundProducts[0]; // Save the first one for quick adding
            const productList = foundProducts.map(p => `\n🔹 ${p.name} - السعر: ${p.sellingPrice} جنيه`).join('');
            response += `${productList}\n\nلو حابب أضيفلك أول منتج للسلة، قولي "ضيفه" أو "هات واحد".`;
        }

        return response;
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

        // Simulate network delay for realism (500ms - 1000ms)
        setTimeout(() => {
            const botResponse = processLocalMessage(userMsg);
            setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
            setIsLoading(false);
        }, 800);
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
import React, { useState } from 'react';
import useStore from './store';

const SeedData: React.FC = () => {
    const { seedDatabase } = useStore();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSeed = async () => {
        setIsLoading(true);
        setError('');
        try {
            await seedDatabase();
            // Success! The app will re-render via the store's state change.
            window.location.reload(); // Force a reload to re-check the seeded state
        } catch (err) {
            console.error("Seeding failed:", err);
            setError('فشلت عملية تهيئة البيانات. يرجى التحقق من إعدادات Firebase والمحاولة مرة أخرى.');
            setIsLoading(false);
        }
    };

    // FIX: Converted JSX to React.createElement calls to be valid in a .ts file.
    return React.createElement(
        "div",
        { className: "fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm" },
        React.createElement(
            "div",
            { className: "bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-8 m-4 text-center" },
            React.createElement(
                "h2",
                { className: "text-2xl font-bold text-gray-800 dark:text-white mb-4" },
                "تهيئة قاعدة البيانات"
            ),
            React.createElement(
                "p",
                { className: "text-gray-600 dark:text-gray-300 mb-6" },
                "يبدو أن هذه هي المرة الأولى التي تشغل فيها النظام. تحتاج إلى تهيئة قاعدة البيانات بالبيانات الأولية (مثل المستخدمين والمنتجات التجريبية) للبدء."
            ),
            React.createElement(
                "p",
                { className: "text-sm text-amber-600 dark:text-amber-400 mb-6" },
                React.createElement("strong", null, "ملاحظة هامة:"),
                " هذه العملية تتم لمرة واحدة فقط."
            ),
            React.createElement(
                "button",
                {
                    onClick: handleSeed,
                    disabled: isLoading,
                    className: "w-full flex justify-center items-center gap-2 px-4 py-3 text-white bg-gradient-to-r from-green-500 to-green-700 rounded-lg hover:from-green-600 hover:to-green-800 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                },
                isLoading ? React.createElement("i", { className: "fas fa-spinner fa-spin" }) : React.createElement("i", { className: "fas fa-database" }),
                React.createElement("span", null, isLoading ? 'جاري التهيئة...' : 'ابدأ تهيئة قاعدة البيانات')
            ),
            error && React.createElement(
                "p",
                { className: "text-red-500 text-sm text-center mt-4" },
                error
            )
        )
    );
};

export default SeedData;
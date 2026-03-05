import React, { useState } from 'react';
import useStore from '../../lib/store';
import SectionHeader from '../shared/SectionHeader';

const Notifications: React.FC = () => {
    const { sendBroadcast } = useStore();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSending(true);
        try {
            await sendBroadcast(message);
            setMessage('');
            alert('تم إرسال الإشعار بنجاح');
        } catch (error) {
            console.error(error);
            alert('فشل إرسال الإشعار');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-bullhorn" title="إرسال إشعارات عامة" />
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            نص الإشعار
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            rows={4}
                            placeholder="اكتب رسالتك هنا..."
                            required
                        />
                        <p className="text-sm text-gray-500 mt-2">
                            سيتم إرسال هذا الإشعار لجميع المستخدمين (تطبيق وويب) وسيظهر حتى لو التطبيق مغلق (للمستخدمين المشتركين).
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={isSending}
                        className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    >
                        {isSending ? 'جاري الإرسال...' : 'إرسال الإشعار'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Notifications;

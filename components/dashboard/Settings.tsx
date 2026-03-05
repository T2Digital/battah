import React, { useState, useEffect } from 'react';
import useStore from '../../lib/store';
import SectionHeader from '../shared/SectionHeader';

const Settings: React.FC = () => {
    const { appData, updateSettings, addToast } = useStore();
    const settings = appData?.settings || {
        enableIPRestriction: false,
        enableTimeRestriction: false,
        workStartTime: "09:00",
        workEndTime: "23:00"
    };

    const [localSettings, setLocalSettings] = useState(settings);
    const [currentIP, setCurrentIP] = useState<string>('');
    const [isLoadingIP, setIsLoadingIP] = useState(false);

    useEffect(() => {
        if (appData?.settings) {
            setLocalSettings(appData.settings);
        }
    }, [appData?.settings]);

    const fetchCurrentIP = async () => {
        setIsLoadingIP(true);
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            setCurrentIP(data.ip);
            setLocalSettings(prev => ({ ...prev, allowedIP: data.ip }));
        } catch (error) {
            console.error("Failed to fetch IP:", error);
            addToast("فشل في جلب عنوان IP الحالي", "error");
        } finally {
            setIsLoadingIP(false);
        }
    };

    const handleSave = async () => {
        try {
            await updateSettings(localSettings);
            addToast("تم حفظ الإعدادات بنجاح", "success");
        } catch (error) {
            console.error("Failed to save settings:", error);
            addToast("فشل في حفظ الإعدادات", "error");
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-cogs" title="الإعدادات العامة" />
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-8">
                
                {/* IP Restriction Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-network-wired text-primary"></i>
                        تقييد الدخول بالموقع (IP Restriction)
                    </h3>
                    <div className="flex items-center gap-4 mb-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={localSettings.enableIPRestriction}
                                onChange={(e) => setLocalSettings({...localSettings, enableIPRestriction: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                            <span className="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">تفعيل التقييد</span>
                        </label>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان IP المسموح به (الفرع)</label>
                            <input 
                                type="text" 
                                value={localSettings.allowedIP || ''}
                                onChange={(e) => setLocalSettings({...localSettings, allowedIP: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                                placeholder="مثال: 192.168.1.1"
                            />
                        </div>
                        <button 
                            onClick={fetchCurrentIP} 
                            disabled={isLoadingIP}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                        >
                            {isLoadingIP ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-globe"></i>}
                            استخدام IP الحالي
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        عند التفعيل، لن يتمكن الموظفون من تسجيل الدخول إلا إذا كان عنوان IP الخاص بهم يطابق العنوان المحدد أعلاه.
                    </p>
                </div>

                {/* Time Restriction Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-clock text-primary"></i>
                        تقييد الدخول بالوقت (Time Restriction)
                    </h3>
                    <div className="flex items-center gap-4 mb-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={localSettings.enableTimeRestriction}
                                onChange={(e) => setLocalSettings({...localSettings, enableTimeRestriction: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                            <span className="mr-3 text-sm font-medium text-gray-900 dark:text-gray-300">تفعيل التقييد</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بداية وقت العمل</label>
                            <input 
                                type="time" 
                                value={localSettings.workStartTime}
                                onChange={(e) => setLocalSettings({...localSettings, workStartTime: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نهاية وقت العمل</label>
                            <input 
                                type="time" 
                                value={localSettings.workEndTime}
                                onChange={(e) => setLocalSettings({...localSettings, workEndTime: e.target.value})}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        عند التفعيل، لن يتمكن الموظفون من تسجيل الدخول خارج هذه الأوقات.
                    </p>
                </div>

                {/* Broadcast Notification Section */}
                <div className="border-b dark:border-gray-700 pb-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <i className="fas fa-bullhorn text-primary"></i>
                        إرسال إشعار عام للمستخدمين
                    </h3>
                    <div className="flex flex-col gap-4">
                        <textarea
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                            rows={3}
                            placeholder="اكتب نص الإشعار هنا..."
                            id="broadcast-message"
                        ></textarea>
                        <button
                            onClick={async () => {
                                const msg = (document.getElementById('broadcast-message') as HTMLTextAreaElement).value;
                                if (!msg) return alert('الرجاء كتابة رسالة');
                                try {
                                    await useStore.getState().sendBroadcast(msg);
                                    (document.getElementById('broadcast-message') as HTMLTextAreaElement).value = '';
                                    addToast('تم إرسال الإشعار بنجاح', 'success');
                                } catch (e) {
                                    console.error(e);
                                    addToast('فشل إرسال الإشعار', 'error');
                                }
                            }}
                            className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            <i className="fas fa-paper-plane ml-2"></i>
                            إرسال للجميع
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        سيظهر هذا الإشعار لجميع المستخدمين الذين يفتحون التطبيق.
                    </p>
                </div>

                <div className="flex justify-end pt-4">
                    <button 
                        onClick={handleSave} 
                        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition shadow-md flex items-center gap-2"
                    >
                        <i className="fas fa-save"></i>
                        حفظ الإعدادات
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Settings;

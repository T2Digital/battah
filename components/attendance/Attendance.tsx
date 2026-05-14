import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Attendance as AttendanceType, Employee } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import { formatDate, formatDateTime, calculateHours } from '../../lib/utils';
import useStore from '../../lib/store';

interface AttendanceProps {
    attendance: AttendanceType[];
    setAttendance: (attendance: AttendanceType[]) => void;
    employees: Employee[];
}

const AttendanceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: Omit<AttendanceType, 'id'> & { id?: number }) => void;
    recordToEdit: AttendanceType | null;
    employees: Employee[];
}> = ({ isOpen, onClose, onSave, recordToEdit, employees }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        employeeId: 0,
        daysAttended: 0,
        notes: ''
    });

    React.useEffect(() => {
        if (recordToEdit) {
            setFormData({ 
                date: recordToEdit.date,
                employeeId: recordToEdit.employeeId,
                daysAttended: recordToEdit.daysAttended || 0,
                notes: recordToEdit.notes || '' 
            });
        } else {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                employeeId: employees[0]?.id || 0,
                daysAttended: 0,
                notes: ''
            });
        }
    }, [recordToEdit, isOpen, employees]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'employeeId' || name === 'daysAttended' ? Number(value) : value 
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(recordToEdit ? { ...formData, id: recordToEdit.id } : formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={recordToEdit ? 'تعديل سجل الحضور' : 'تسجيل حضور جديد'} onSave={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">الموظف *</label>
                    <select name="employeeId" value={formData.employeeId} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700">
                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ (الشهر/الفترة) *</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">عدد أيام الحضور *</label>
                    <input type="number" name="daysAttended" value={formData.daysAttended === 0 ? '' : formData.daysAttended} onChange={handleChange} required min="0" step="0.5" className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ملاحظات</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700"></textarea>
                </div>
            </div>
        </Modal>
    );
}

const Attendance: React.FC<AttendanceProps> = ({ attendance, setAttendance, employees }) => {
    const { fetchDataByDateRange } = useStore();
    const [isModalOpen, setModalOpen] = useState(false);
    const [isBiometricSetupOpen, setBiometricSetupOpen] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState<AttendanceType | null>(null);
    const [filters, setFilters] = useState({ dateFrom: '', dateTo: '' });
    const [filterPeriod, setFilterPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');

    const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'غير معروف';

    const handleAdd = () => {
        setRecordToEdit(null);
        setModalOpen(true);
    };

    const handleEdit = (record: AttendanceType) => {
        setRecordToEdit(record);
        setModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذا السجل؟')) {
            setAttendance(attendance.filter(a => a.id !== id));
        }
    };
    
    const handleSave = (record: Omit<AttendanceType, 'id'> & { id?: number }) => {
        if (record.id) {
            setAttendance(attendance.map(a => a.id === record.id ? { ...a, ...record } : a));
        } else {
            const newId = Math.max(0, ...attendance.map(a => a.id)) + 1;
            setAttendance([...attendance, { ...record, id: newId }]);
        }
        setModalOpen(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            // Expected Format: [Employee Name, Date (YYYY-MM-DD), Days Attended]
            const newRecords: AttendanceType[] = [];
            let maxId = Math.max(0, ...attendance.map(a => a.id));

            data.slice(1).forEach((row: any) => {
                const empName = row[0];
                const dateRaw = row[1];
                const daysAttendedRaw = row[2];

                const employee = employees.find(e => e.name === empName);
                if (employee) {
                    let dateStr = dateRaw;
                    // Handle Excel serial date
                    if (typeof dateRaw === 'number') {
                         const dateObj = new Date((dateRaw - (25567 + 2)) * 86400 * 1000);
                         dateStr = dateObj.toISOString().split('T')[0];
                    }

                    maxId++;
                    newRecords.push({
                        id: maxId,
                        employeeId: employee.id,
                        date: dateStr,
                        daysAttended: Number(daysAttendedRaw) || 0,
                        notes: 'تم الاستيراد من ملف إكسيل'
                    });
                }
            });

            if (newRecords.length > 0) {
                // Pass only new records to setAttendance (which upserts)
                setAttendance(newRecords);
                alert(`تم استيراد ${newRecords.length} سجل بنجاح.`);
            } else {
                alert("لم يتم العثور على بيانات صالحة أو لم يتم التعرف على أسماء الموظفين. تأكد من تطابق الأسماء مع النظام.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const attendanceWithDetails = useMemo(() => {
        return attendance
            .filter(att => {
                let dateMatch = true;
                if (filters.dateFrom && filters.dateTo) {
                    const attDate = new Date(att.date);
                    attDate.setHours(0, 0, 0, 0);
                    const from = new Date(filters.dateFrom);
                    from.setHours(0, 0, 0, 0);
                    const to = new Date(filters.dateTo);
                    to.setHours(0, 0, 0, 0);
                    dateMatch = attDate >= from && attDate <= to;
                }
                return dateMatch;
            })
            .map(att => ({
                ...att,
                employeeName: getEmployeeName(att.employeeId)
            })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [attendance, employees, filters]);

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-clock" title="الحضور والانصراف">
                <div className="flex gap-2">
                    <button onClick={() => setBiometricSetupOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-md">
                        <i className="fas fa-fingerprint"></i>
                        ربط جهاز البصمة
                    </button>
                    <label className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 transition shadow-md cursor-pointer">
                        <i className="fas fa-file-excel"></i>
                        استيراد ملف
                        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                        <i className="fas fa-plus"></i>
                        إضافة سجل حضور
                    </button>
                </div>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 flex-wrap">
                <select value={filterPeriod} onChange={e => {
                    setFilterPeriod(e.target.value as any);
                    if (e.target.value === 'daily') {
                        setFilters(f => ({ ...f, dateFrom: new Date().toISOString().split('T')[0], dateTo: new Date().toISOString().split('T')[0] }));
                    } else if (e.target.value === 'monthly') {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), now.getMonth(), 1);
                        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                        setFilters(f => ({ ...f, dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] }));
                    } else if (e.target.value === 'yearly') {
                        const now = new Date();
                        const start = new Date(now.getFullYear(), 0, 1);
                        const end = new Date(now.getFullYear(), 11, 31);
                        setFilters(f => ({ ...f, dateFrom: start.toISOString().split('T')[0], dateTo: end.toISOString().split('T')[0] }));
                    }
                }} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                    <option value="daily">يومي</option>
                    <option value="monthly">شهري</option>
                    <option value="yearly">سنوي</option>
                </select>
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">من:</span>
                    <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <div className="flex gap-2 items-center">
                    <span className="text-sm text-gray-500">إلى:</span>
                    <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                </div>
                <button 
                    onClick={() => {
                        if (filters.dateFrom && filters.dateTo) {
                            fetchDataByDateRange('attendance', filters.dateFrom, filters.dateTo);
                        }
                    }}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    title="جلب بيانات من الخادم"
                >
                    <i className="fas fa-cloud-download-alt"></i>
                </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">التاريخ (الشهر/الفترة)</th>
                            <th scope="col" className="px-6 py-3">اسم الموظف</th>
                            <th scope="col" className="px-6 py-3">عدد أيام الحضور</th>
                            <th scope="col" className="px-6 py-3">ملاحظات</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceWithDetails.map(att => (
                            <tr key={att.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 whitespace-nowrap" dir="ltr">{formatDateTime(att.date, att.timestamp)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{att.employeeName}</td>
                                <td className="px-6 py-4 font-bold">{att.daysAttended || 0}</td>
                                <td className="px-6 py-4">{att.notes}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button onClick={() => handleEdit(att)} className="text-blue-500 hover:text-blue-700 text-lg"><i className="fas fa-edit"></i></button>
                                    <button onClick={() => handleDelete(att.id)} className="text-red-500 hover:text-red-700 text-lg"><i className="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AttendanceModal 
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                recordToEdit={recordToEdit}
                employees={employees}
            />

            <Modal 
                isOpen={isBiometricSetupOpen} 
                onClose={() => setBiometricSetupOpen(false)} 
                title="إعدادات الربط المباشر مع جهاز البصمة (ZKTeco/Online)"
                saveLabel="حسناً، فهمت"
                onSave={(e) => { e.preventDefault(); setBiometricSetupOpen(false); }}
            >
                <div className="space-y-4 text-gray-800 dark:text-gray-200 leading-relaxed text-sm md:text-base">
                    <p className="font-semibold text-primary">
                        نحن جاهزون تماماً للربط مع جميع أنواع أجهزة البصمة (الحديثة والقديمة).
                    </p>
                    
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <i className="fas fa-wifi text-green-500"></i>
                            أولاً: إذا كان الجهاز حديثاً (يدعم ADMS / Cloud Server)
                        </h3>
                        <p className="mb-2 text-gray-700 dark:text-gray-300">
                            في أجهزة <strong>ZKTeco</strong> الحديثة، ادخل إلى (إعدادات الشبكة) ثم (إعدادات الخادم السحابي / ADMS) واضبط الآتي:
                        </p>
                        <ul className="list-disc list-inside mb-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <li><strong>عنوان الخادم (Server Address):</strong> ضع رابط التطبيق <strong>بدون</strong> (https://) <br/>
                                <code className="bg-gray-200 dark:bg-gray-700 p-1 px-2 rounded ml-1 text-blue-600 dark:text-blue-400 font-mono inline-block mt-1" dir="ltr">
                                    {window.location.host}
                                </code>
                            </li>
                            <li><strong>منفذ الخادم (Server Port):</strong> 443</li>
                            <li><strong>تفعيل HTTPS:</strong> نعم (Yes)</li>
                        </ul>
                        <p className="text-sm text-gray-500">
                            *الجهاز تلقائياً سيقوم بإرسال البصمات إلى مسار <code dir="ltr">/iclock/cdata</code> وقد قمنا بتجهيز النظام لاستقبالها فوراً. 
                            (إذا كان جهازك يطلب Webhook URL صريح، استخدم: <code dir="ltr">{window.location.origin}/api/biometric-webhook</code>).
                        </p>
                    </div>

                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <i className="fas fa-network-wired text-blue-500"></i>
                            ثانياً: إذا كان الجهاز عادياً (شبكة داخلية LAN / وايفاي محلي فقط)
                        </h3>
                        <p className="mb-2">جهزنا لك سكربت وسيط (Bridge Agent) يتم تشغيله على أي كمبيوتر في المحل بنفس شبكة جهاز البصمة، حيث يقوم بسحب بصمات الموظفين لحظياً وإرسالها للنظام.</p>
                        <div className="flex flex-col sm:flex-row gap-2 mt-2">
                            <a 
                                href="/bridge-agent.js" 
                                download="bridge-agent.js" 
                                className="inline-flex items-center justify-center gap-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/60 transition"
                            >
                                <i className="fas fa-file-code"></i>
                                1. تحميل السكربت (Bridge Agent)
                            </a>
                            <a 
                                href="/install-service.js" 
                                download="install-service.js" 
                                className="inline-flex items-center justify-center gap-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/60 transition"
                            >
                                <i className="fas fa-cogs"></i>
                                2. أداة التثبيت في الخلفية
                            </a>
                        </div>
                        
                        <details className="text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-3 mt-3">
                            <summary className="font-semibold cursor-pointer text-blue-600 dark:text-blue-400">خطوات التشغيل الدائم والمخفي لمعالجة البصمة (اضغط للفتح):</summary>
                            <p className="mt-2 text-green-700 dark:text-green-400 font-medium">حتى لا يتم فتح أي شاشة سوداء للموظف، الأداة سيتم تشغيلها كـ (Windows Service) خدمة تابعة للويندوز تعمل في الخلفية فور تشغيل الحاسوب تلقائياً.</p>
                            <ol className="list-decimal list-inside mt-2 space-y-2 text-gray-700 dark:text-gray-300">
                                <li>قم بتثبيت برنامج <strong>Node.js</strong> على أي كمبيوتر متصل بنفس شبكة المحل.</li>
                                <li>ضع ملف <code>bridge-agent.js</code> وملف <code>install-service.js</code> معاً في مجلد واحد (مثلاً على الـ C).</li>
                                <li>قم بإنشاء ملف نصي في نفس المجلد باسم <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.env</code> وضع فيه الإعدادات الآتية لحفظ رابط النظام وIP البصمة:
                                    <pre className="bg-gray-100 dark:bg-gray-900 p-2 mt-1 rounded text-left text-xs" dir="ltr">
DEVICE_IP=192.168.1.201{'\n'}
DEVICE_PORT=4370{'\n'}
SYSTEM_WEBHOOK_URL={window.location.origin}/api/biometric-webhook
                                    </pre>
                                </li>
                                <li>افتح موجة الأوامر كمسؤول (Run as Administrator) داخل هذا المجلد.</li>
                                <li>اكتب الأمر الآتي لتحميل الحزم المطلوبة: <br/> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 mt-1 inline-block rounded text-red-500" dir="ltr">npm install node-zklib axios dotenv node-windows</code></li>
                                <li>اكتب أمر التنصيب الآتي مرة واحدة فقط: <br/> <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 mt-1 inline-block rounded text-red-500" dir="ltr">node install-service.js</code></li>
                            </ol>
                            <p className="mt-3 text-xs font-semibold text-gray-500 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                * مبروك! الآن البرنامج تم تنصيبه في نظام الويندوز، وسيعمل في الخلفية تلقائياً للأبد ويقوم بسحب البصمات وإلقائها في النظام لحظياً دون أن يرى الموظف أي شيء.
                            </p>
                        </details>
                        <p className="text-xs text-gray-500 mt-2">
                            *يجب تنصيب Node.js وتشغيل السكربت حسب التعليمات المكتوبة بداخل الملف.
                        </p>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg mt-4 border border-yellow-200 dark:border-yellow-700">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            <strong>ملاحظة هامة:</strong> لكي يتم التعرف على الموظف بشكل صحيح، يجب الدخول إلى شاشة (الموظفين) والتأكد من إدخال <strong>"رقم البصمة"</strong> لكل موظف ليتطابق تماماً مع رقمه المبرمج داخل جهاز البصمة.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Attendance;
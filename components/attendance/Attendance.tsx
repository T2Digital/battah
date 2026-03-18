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
        </div>
    );
};

export default Attendance;
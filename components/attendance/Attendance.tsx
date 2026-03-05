import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Attendance as AttendanceType, Employee } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import Modal from '../shared/Modal';
import { formatDate, calculateHours } from '../../lib/utils';

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
        checkIn: '08:00',
        checkOut: '17:00',
        notes: ''
    });

    React.useEffect(() => {
        if (recordToEdit) {
            setFormData({ 
                date: recordToEdit.date,
                employeeId: recordToEdit.employeeId,
                checkIn: recordToEdit.checkIn || '08:00',
                checkOut: recordToEdit.checkOut || '17:00',
                notes: recordToEdit.notes || '' 
            });
        } else {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                employeeId: employees[0]?.id || 0,
                checkIn: '08:00',
                checkOut: '17:00',
                notes: ''
            });
        }
    }, [recordToEdit, isOpen, employees]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'employeeId' ? Number(value) : value }));
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ *</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">وقت الحضور *</label>
                    <input type="time" name="checkIn" value={formData.checkIn} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">وقت الانصراف *</label>
                    <input type="time" name="checkOut" value={formData.checkOut} onChange={handleChange} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700" />
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
    const [isModalOpen, setModalOpen] = useState(false);
    const [recordToEdit, setRecordToEdit] = useState<AttendanceType | null>(null);

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

            // Expected Format: [Employee Name, Date (YYYY-MM-DD), CheckIn (HH:mm), CheckOut (HH:mm)]
            const newRecords: AttendanceType[] = [];
            let maxId = Math.max(0, ...attendance.map(a => a.id));

            data.slice(1).forEach((row: any) => {
                const empName = row[0];
                const dateRaw = row[1];
                const checkInRaw = row[2];
                const checkOutRaw = row[3];

                const employee = employees.find(e => e.name === empName);
                if (employee) {
                    let dateStr = dateRaw;
                    // Handle Excel serial date
                    if (typeof dateRaw === 'number') {
                         const dateObj = new Date((dateRaw - (25567 + 2)) * 86400 * 1000);
                         dateStr = dateObj.toISOString().split('T')[0];
                    }

                    let checkIn = checkInRaw;
                    if (typeof checkInRaw === 'number') {
                        const totalSeconds = Math.floor(checkInRaw * 86400);
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        checkIn = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    }

                    let checkOut = checkOutRaw;
                    if (typeof checkOutRaw === 'number') {
                        const totalSeconds = Math.floor(checkOutRaw * 86400);
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        checkOut = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    }

                    maxId++;
                    newRecords.push({
                        id: maxId,
                        employeeId: employee.id,
                        date: dateStr,
                        checkIn: checkIn,
                        checkOut: checkOut,
                        notes: 'Imported from Excel'
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
        return attendance.map(att => ({
            ...att,
            employeeName: getEmployeeName(att.employeeId),
            totalHours: calculateHours(att.checkIn, att.checkOut)
        })).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [attendance, employees]);

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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">التاريخ</th>
                            <th scope="col" className="px-6 py-3">اسم الموظف</th>
                            <th scope="col" className="px-6 py-3">الحضور</th>
                            <th scope="col" className="px-6 py-3">الانصراف</th>
                            <th scope="col" className="px-6 py-3">إجمالي الساعات</th>
                            <th scope="col" className="px-6 py-3">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceWithDetails.map(att => (
                            <tr key={att.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4">{formatDate(att.date)}</td>
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{att.employeeName}</td>
                                <td className="px-6 py-4">{att.checkIn}</td>
                                <td className="px-6 py-4">{att.checkOut}</td>
                                <td className="px-6 py-4 font-bold">{att.totalHours.toFixed(2)}</td>
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
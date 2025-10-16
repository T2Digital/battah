

import React, { useState, useMemo } from 'react';
// Fix: Corrected import path
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
            // FIX: Ensure 'notes' is a string and provide fallbacks for optional checkIn/checkOut to match form state type.
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
                <button onClick={handleAdd} className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md">
                    <i className="fas fa-plus"></i>
                    تسجيل حضور
                </button>
            </SectionHeader>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-x-auto">
                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">التاريخ</th>
                            <th scope="col" className="px-6 py-3">اسم الموظف</th>
                            <th scope="col" className="px-6 py-3">وقت الحضور</th>
                            <th scope="col" className="px-6 py-3">وقت الانصراف</th>
                            <th scope="col" className="px-6 py-3">عدد الساعات</th>
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
                                <td className={`px-6 py-4 font-bold ${att.totalHours < 8 ? 'text-red-500' : 'text-green-500'}`}>{att.totalHours.toFixed(2)} ساعة</td>
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
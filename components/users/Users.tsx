import React, { useState } from 'react';
import useStore from '../../lib/store';
import { User, Role, Branch } from '../../types';
import SectionHeader from '../shared/SectionHeader';
import UserModal from './UserModal';
import ConfirmationModal from '../shared/ConfirmationModal';

const Users: React.FC = () => {
    const { users, createUser, updateUser, deleteUser } = useStore(state => ({
        users: state.appData?.users || [],
        createUser: state.createUser,
        updateUser: state.updateUser,
        deleteUser: state.deleteUser
    }));

    const [isModalOpen, setModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleAddUser = () => {
        setUserToEdit(null);
        setModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setUserToEdit(user);
        setModalOpen(true);
    };

    const handleSaveUser = async (userData: any) => {
        if (userData.id) {
            await updateUser(userData.id, {
                name: userData.name,
                role: userData.role,
                branch: userData.branch,
                permissions: userData.permissions,
                ...(userData.password ? { password: userData.password } : {})
            });
        } else {
            await createUser(
                userData.email,
                userData.password,
                userData.role,
                userData.branch,
                userData.name,
                userData.permissions
            );
        }
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        setIsDeleting(true);
        try {
            await deleteUser(userToDelete.id);
            setUserToDelete(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    const roleLabels: Record<Role, string> = {
        [Role.Admin]: 'مدير عام',
        [Role.BranchManager]: 'مدير فرع',
        [Role.Accountant]: 'محاسب',
        [Role.Seller]: 'بائع',
    };

    const branchLabels: Record<Branch, string> = {
        'main': 'الرئيسي',
        'branch1': 'فرع 1',
        'branch2': 'فرع 2',
        'branch3': 'فرع 3',
    };

    return (
        <div className="animate-fade-in space-y-6">
            <SectionHeader icon="fa-users-cog" title="إدارة المستخدمين والصلاحيات">
                <button 
                    onClick={handleAddUser} 
                    className="px-4 py-2 bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-dark transition shadow-md"
                >
                    <i className="fas fa-user-plus"></i>
                    إضافة مستخدم
                </button>
            </SectionHeader>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">الاسم</th>
                                <th className="px-6 py-3">البريد الإلكتروني</th>
                                <th className="px-6 py-3">الدور</th>
                                <th className="px-6 py-3">الفرع</th>
                                <th className="px-6 py-3">الصلاحيات</th>
                                <th className="px-6 py-3">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {user.name.charAt(0)}
                                            </div>
                                            {user.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{user.username}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                            ${user.role === Role.Admin ? 'bg-purple-100 text-purple-800' : 
                                              user.role === Role.BranchManager ? 'bg-blue-100 text-blue-800' :
                                              user.role === Role.Accountant ? 'bg-green-100 text-green-800' :
                                              'bg-gray-100 text-gray-800'}`}>
                                            {roleLabels[user.role]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{branchLabels[user.branch]}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">
                                            {user.permissions?.length || 0} قسم
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-3">
                                        <button 
                                            onClick={() => handleEditUser(user)} 
                                            className="text-blue-500 hover:text-blue-700 text-lg"
                                            title="تعديل"
                                        >
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        {user.role !== Role.Admin && (
                                            <button 
                                                onClick={() => setUserToDelete(user)} 
                                                className="text-red-500 hover:text-red-700 text-lg"
                                                title="حذف"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-gray-500">لا يوجد مستخدمين مسجلين.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <UserModal 
                    isOpen={isModalOpen} 
                    onClose={() => setModalOpen(false)} 
                    onSave={handleSaveUser} 
                    existingUser={userToEdit} 
                />
            )}

            {userToDelete && (
                <ConfirmationModal
                    isOpen={!!userToDelete}
                    onClose={() => setUserToDelete(null)}
                    onConfirm={confirmDeleteUser}
                    title="حذف مستخدم"
                    message={`هل أنت متأكد من حذف المستخدم "${userToDelete.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                    isLoading={isDeleting}
                    requireSecurityCheck={true}
                />
            )}
        </div>
    );
};

export default Users;

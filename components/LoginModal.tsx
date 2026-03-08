

import React, { useState } from 'react';
// Fix: Corrected import path
import useStore from '../lib/store';

const LoginModal: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const login = useStore(state => state.login);

    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            // The onAuthStateChanged listener in App.tsx will handle the rest.
        } catch (error: any) {
             if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
            } else {
                setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
            }
            console.error("Login failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-8 m-4 animate-fade-in-down">
                <div className="text-center mb-6">
                    <img src="https://i.ibb.co/LDdGwd87/5-1.png" alt="Logo" className="h-20 w-auto mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white">🔐 تسجيل الدخول للنظام</h3>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="loginEmail" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">👤 البريد الإلكتروني</label>
                        <input
                            type="email"
                            id="loginEmail"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary transition"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="loginPassword"className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">🔑 كلمة المرور</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="loginPassword"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary transition"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 px-4 py-3 text-white bg-gradient-to-r from-primary to-primary-light rounded-lg hover:from-primary-dark hover:to-primary transition-transform transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-in-alt"></i>}
                            <span>{isLoading ? 'جاري الدخول...' : 'دخول'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;

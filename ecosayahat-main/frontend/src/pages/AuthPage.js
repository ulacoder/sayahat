import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export const AuthPage = () => {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'tourist'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const user = await login(formData.email, formData.password);
        toast.success(`Welcome back, ${user.name}!`);
      } else {
        const user = await register(formData.email, formData.password, formData.name, formData.role);
        toast.success(`Welcome to EcoSayahat, ${user.name}!`);
      }
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-emerald-600 mb-2" style={{ fontFamily: 'Outfit' }}>EcoSayahat</h1>
          <p className="text-slate-600">{t('welcome')}</p>
        </div>

        <div data-testid="auth-form" className="bg-white rounded-2xl shadow-xl border border-emerald-100 p-8">
          <div className="flex gap-2 mb-6 bg-emerald-50 p-1 rounded-full">
            <button
              data-testid="login-tab"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                isLogin ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              {t('login')}
            </button>
            <button
              data-testid="register-tab"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all ${
                !isLogin ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              {t('register')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('name')}</label>
                <input
                  data-testid="name-input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('email')}</label>
              <input
                data-testid="email-input"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('password')}</label>
              <input
                data-testid="password-input"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 transition-all"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('role')}</label>
                <select
                  data-testid="role-select"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 transition-all"
                >
                  <option value="tourist">{t('tourist')}</option>
                  <option value="taxi_driver">{t('taxi_driver')}</option>
                  <option value="admin">{t('admin')}</option>
                </select>
              </div>
            )}

            <button
              data-testid="auth-submit-btn"
              type="submit"
              className="w-full py-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all duration-300 shadow-lg shadow-emerald-500/20 font-medium active:scale-95"
            >
              {isLogin ? t('login') : t('register')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
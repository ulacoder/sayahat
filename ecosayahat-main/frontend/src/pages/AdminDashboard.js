import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Globe, LogOut, Users, ShoppingCart, CheckSquare, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchReviews();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await axios.get(`${API}/admin/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch reviews', error);
    }
  };

  const handleReviewAction = async (reviewId, action) => {
    try {
      await axios.post(`${API}/admin/reviews/${reviewId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Review ${action}d`);
      fetchReviews();
      fetchStats();
    } catch (error) {
      toast.error(`Failed to ${action} review`);
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white">
      <header className="bg-white/90 backdrop-blur-lg border-b border-emerald-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="text-2xl font-bold text-emerald-600" style={{ fontFamily: 'Outfit' }}>
              EcoSayahat - Admin
            </button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white border border-emerald-100 rounded-full px-3 py-2">
                <Globe size={18} className="text-emerald-600" />
                <select
                  data-testid="language-selector"
                  value={i18n.language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="ru">RU</option>
                  <option value="en">EN</option>
                  <option value="kz">KZ</option>
                </select>
              </div>

              <button onClick={logout} className="text-slate-600 hover:text-emerald-600 transition-colors p-2">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-slate-800 mb-8" style={{ fontFamily: 'Outfit' }}>{t('statistics')}</h1>

        {stats && (
          <div data-testid="stats-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
              <Users className="mb-4" size={32} />
              <p className="text-white/80 text-sm mb-1">{t('totalUsers')}</p>
              <p className="text-4xl font-bold">{stats.total_users}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
              <ShoppingCart className="mb-4" size={32} />
              <p className="text-white/80 text-sm mb-1">{t('totalOrders')}</p>
              <p className="text-4xl font-bold">{stats.total_orders}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <CheckSquare className="mb-4" size={32} />
              <p className="text-white/80 text-sm mb-1">{t('completedTasks')}</p>
              <p className="text-4xl font-bold">{stats.total_tasks_completed}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white">
              <MessageSquare className="mb-4" size={32} />
              <p className="text-white/80 text-sm mb-1">{t('pendingReviews')}</p>
              <p className="text-4xl font-bold">{stats.pending_reviews}</p>
            </div>
          </div>
        )}

        <h2 className="text-3xl font-bold text-slate-800 mb-6" style={{ fontFamily: 'Outfit' }}>{t('reviewModeration')}</h2>
        <div data-testid="reviews-list" className="space-y-4">
          {reviews.filter(r => r.status === 'pending').map(review => (
            <div key={review.id} data-testid={`review-card-${review.id}`} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-slate-800">{review.user_name}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      ))}
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full font-semibold">{t('pending')}</span>
                  </div>
                  <p className="text-slate-600">{review.comment}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    data-testid={`approve-review-btn-${review.id}`}
                    onClick={() => handleReviewAction(review.id, 'approve')}
                    className="bg-emerald-500 text-white px-4 py-2 rounded-full hover:bg-emerald-600 transition-colors text-sm font-medium"
                  >
                    {t('approve')}
                  </button>
                  <button
                    data-testid={`reject-review-btn-${review.id}`}
                    onClick={() => handleReviewAction(review.id, 'reject')}
                    className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors text-sm font-medium"
                  >
                    {t('reject')}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {reviews.filter(r => r.status === 'pending').length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <p className="text-slate-500">{t('pendingReviews')}: 0</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Globe } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const RegionSelection = () => {
  const { t, i18n } = useTranslation();
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [regions, setRegions] = useState([]);
  const [ecocoins, setEcocoins] = useState(0);

  useEffect(() => {
    fetchRegions();
    fetchBalance();
  }, []);

  const fetchRegions = async () => {
    try {
      const response = await axios.get(`${API}/regions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRegions(response.data);
    } catch (error) {
      console.error('Failed to fetch regions', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${API}/ecocoins/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEcocoins(response.data.balance);
    } catch (error) {
      console.error('Failed to fetch balance', error);
    }
  };

  const handleRegionSelect = (regionId) => {
    if (user.role === 'tourist') {
      navigate(`/tourist/${regionId}`);
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const getRegionName = (region) => {
    return region[`name_${i18n.language}`] || region.name_en;
  };

  const getRegionDescription = (region) => {
    return region[`description_${i18n.language}`] || region.description_en;
  };

  if (user?.role === 'taxi_driver') {
    navigate('/taxi');
    return null;
  }

  if (user?.role === 'admin') {
    navigate('/admin');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <header className="bg-white/80 backdrop-blur-lg border-b border-emerald-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-emerald-600" style={{ fontFamily: 'Outfit' }}>EcoSayahat</h1>
            
            <div className="flex items-center gap-4">
              <div data-testid="ecocoins-wallet" className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-2 rounded-full shadow-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
                <span className="font-semibold">{ecocoins}</span>
              </div>

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

              <button
                data-testid="logout-btn"
                onClick={logout}
                className="text-slate-600 hover:text-emerald-600 text-sm font-medium transition-colors"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'Outfit' }}>
            {t('selectRegion')}
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            {t('missionText')}
          </p>
        </div>

        <div data-testid="regions-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regions.map((region, index) => (
            <button
              key={region.id}
              data-testid={`region-card-${region.id}`}
              onClick={() => handleRegionSelect(region.id)}
              className={`group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${
                index === 0 || index === 1 ? 'md:col-span-1 lg:col-span-1 h-80' : 'h-80'
              }`}
            >
              <img
                src={region.image_url}
                alt={getRegionName(region)}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Outfit' }}>
                    {getRegionName(region)}
                  </h3>
                  <p className="text-sm text-white/90 line-clamp-2">
                    {getRegionDescription(region)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};
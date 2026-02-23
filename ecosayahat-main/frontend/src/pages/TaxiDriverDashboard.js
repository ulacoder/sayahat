import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Globe, LogOut, Zap } from 'lucide-react';
import { toast } from 'sonner';
import L from 'leaflet';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const chargingIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjRkZCMDIwIiBzdHJva2U9IiNGRkIwMjAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWdvbiBwb2ludHM9IjEzIDIgMyAxNCA xMiAxNCA4IDE4IDIxIDYgMTIgNiAxNiAyIDEzIDIiLz48L3N2Zz4=',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

export const TaxiDriverDashboard = () => {
  const { t, i18n } = useTranslation();
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [chargingStations, setChargingStations] = useState([]);
  const [userLocation, setUserLocation] = useState([51.1694, 71.4491]);

  useEffect(() => {
    fetchOrders();
    fetchChargingStations();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.error('Geolocation error:', error)
      );
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/taxi/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    }
  };

  const fetchChargingStations = async () => {
    try {
      const response = await axios.get(`${API}/charging-stations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChargingStations(response.data);
    } catch (error) {
      console.error('Failed to fetch charging stations', error);
    }
  };

  const acceptOrder = async (orderId) => {
    try {
      await axios.post(`${API}/taxi/accept/${orderId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(t('acceptOrder'));
      fetchOrders();
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-white">
      <header className="bg-white/90 backdrop-blur-lg border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="text-2xl font-bold text-emerald-600" style={{ fontFamily: 'Outfit' }}>
              EcoSayahat - Taxi
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

      <main className="flex-1 flex overflow-hidden">
        <div className="w-1/2 p-6 overflow-y-auto">
          <h2 className="text-2xl font-bold text-slate-800 mb-6" style={{ fontFamily: 'Outfit' }}>{t('availableOrders')}</h2>
          <div data-testid="orders-list" className="space-y-4">
            {orders.filter(o => o.status === 'pending').map(order => (
              <div key={order.id} data-testid={`order-card-${order.id}`} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all">
                <div className="mb-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-emerald-600 font-semibold">{t('from')}:</span>
                    <span className="text-slate-700">{order.from_location}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-600 font-semibold">{t('to')}:</span>
                    <span className="text-slate-700">{order.to_location}</span>
                  </div>
                </div>
                <button
                  data-testid={`accept-order-btn-${order.id}`}
                  onClick={() => acceptOrder(order.id)}
                  className="w-full bg-emerald-500 text-white py-3 rounded-full hover:bg-emerald-600 transition-colors font-medium"
                >
                  {t('acceptOrder')}
                </button>
              </div>
            ))}
            {orders.filter(o => o.status === 'pending').length === 0 && (
              <div className="text-center text-slate-500 mt-12">
                <p>{t('availableOrders')}: 0</p>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-6 mt-12" style={{ fontFamily: 'Outfit' }}>{t('myOrders')}</h2>
          <div className="space-y-4">
            {orders.filter(o => o.status === 'accepted').map(order => (
              <div key={order.id} className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">{t('approved')}</span>
                </div>
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-emerald-700 font-semibold">{t('from')}:</span>
                  <span className="text-slate-700">{order.from_location}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-700 font-semibold">{t('to')}:</span>
                  <span className="text-slate-700">{order.to_location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div data-testid="taxi-map" className="w-1/2 p-6">
          <div className="h-full rounded-2xl overflow-hidden shadow-xl">
            <MapContainer center={userLocation} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <Marker position={userLocation}>
                <Popup>Your Location</Popup>
              </Marker>
              {chargingStations.map(station => (
                <Marker key={station.id} position={[station.latitude, station.longitude]} icon={chargingIcon}>
                  <Popup>
                    <div className="text-center">
                      <Zap className="text-yellow-500 inline" size={20} />
                      <strong>{station.name}</strong>
                      <br />
                      <span className="text-sm">{station.availability ? 'Available' : 'Busy'}</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </main>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Globe, LogOut, Map as MapIcon, Landmark, Car, Hotel as HotelIcon, CheckSquare, Info, Star, Send, X, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const TouristDashboard = () => {
  const { regionId } = useParams();
  const { t, i18n } = useTranslation();
  const { token, logout, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('map');
  const [attractions, setAttractions] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [ecocoins, setEcocoins] = useState(0);
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [showBookingModal, setShowBookingModal] = useState(null);
  const [bookingData, setBookingData] = useState({ checkIn: '', checkOut: '', guests: 2 });
  const [taxiOrder, setTaxiOrder] = useState({ from: '', to: '', fromLat: 0, fromLng: 0, toLat: 0, toLng: 0 });
  const [contactForm, setContactForm] = useState({ name: user?.name || '', email: user?.email || '', message: '' });

  useEffect(() => {
    fetchData();
    getUserLocation();
  }, [regionId]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setUserLocation([51.1694, 71.4491]);
        }
      );
    } else {
      setUserLocation([51.1694, 71.4491]);
    }
  };

  const fetchData = async () => {
    try {
      const [attractionsRes, hotelsRes, tasksRes, balanceRes] = await Promise.all([
        axios.get(`${API}/regions/${regionId}/attractions`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/hotels/${regionId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/ecocoins/balance`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setAttractions(attractionsRes.data);
      setHotels(hotelsRes.data);
      setTasks(tasksRes.data);
      setEcocoins(balanceRes.data.balance);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const fetchAttractionReviews = async (attractionId) => {
    try {
      const response = await axios.get(`${API}/attractions/${attractionId}/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch reviews', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedAttraction || !newReview.comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    try {
      await axios.post(
        `${API}/attractions/${selectedAttraction.id}/reviews`,
        { attraction_id: selectedAttraction.id, rating: newReview.rating, comment: newReview.comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Review submitted for moderation');
      setNewReview({ rating: 5, comment: '' });
      fetchAttractionReviews(selectedAttraction.id);
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  const handleBookHotel = async () => {
    if (!bookingData.checkIn || !bookingData.checkOut) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/hotels/book?hotel_id=${showBookingModal.id}&check_in=${bookingData.checkIn}&check_out=${bookingData.checkOut}&guests=${bookingData.guests}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Booking successful! Payment completed.');
      setShowBookingModal(null);
      setBookingData({ checkIn: '', checkOut: '', guests: 2 });
      fetchData();
    } catch (error) {
      toast.error('Booking failed');
    }
  };

  const handleOrderTaxi = async () => {
    if (!taxiOrder.from || !taxiOrder.to) {
      toast.error('Please enter pickup and destination');
      return;
    }

    // Mock coordinates based on current location
    const fromCoords = userLocation || [51.1694, 71.4491];
    const toCoords = [fromCoords[0] + 0.1, fromCoords[1] + 0.1];

    try {
      await axios.post(
        `${API}/taxi/order`,
        {
          from_location: taxiOrder.from,
          to_location: taxiOrder.to,
          from_lat: fromCoords[0],
          from_lng: fromCoords[1],
          to_lat: toCoords[0],
          to_lng: toCoords[1]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Taxi order placed! Driver will accept soon.');
      setTaxiOrder({ from: '', to: '', fromLat: 0, fromLng: 0, toLat: 0, toLng: 0 });
    } catch (error) {
      toast.error('Failed to order taxi');
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.message.trim()) {
      toast.error('Please write a message');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/contact/send?name=${encodeURIComponent(contactForm.name)}&email=${encodeURIComponent(contactForm.email)}&message=${encodeURIComponent(contactForm.message)}`,
        {}
      );
      toast.success(`Message sent to ${response.data.contact_email}`);
      setContactForm({ ...contactForm, message: '' });
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleTaskSubmit = async (taskId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result.split(',')[1];
          try {
            await axios.post(
              `${API}/tasks/submit`,
              { task_id: taskId, image_base64: base64 },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(t('submitTask') + ' - ' + t('pending'));
            setTimeout(fetchData, 3000);
          } catch (error) {
            toast.error('Failed to submit task');
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const getText = (item, field) => {
    return item[`${field}_${i18n.language}`] || item[`${field}_en`] || '';
  };

  const handleAttractionClick = async (attraction) => {
    setSelectedAttraction(attraction);
    await fetchAttractionReviews(attraction.id);
  };

  const tabs = [
    { id: 'map', label: t('map'), icon: MapIcon },
    { id: 'attractions', label: t('attractions'), icon: Landmark },
    { id: 'taxi', label: t('taxi'), icon: Car },
    { id: 'hotels', label: t('hotels'), icon: HotelIcon },
    { id: 'tasks', label: t('tasks'), icon: CheckSquare },
    { id: 'about', label: t('about'), icon: Info }
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-emerald-50 to-white">
      <header className="bg-white/90 backdrop-blur-lg border-b border-emerald-100 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="text-2xl font-bold text-emerald-600" style={{ fontFamily: 'Outfit' }}>
              EcoSayahat
            </button>
            
            <div className="flex items-center gap-4">
              <div data-testid="ecocoins-balance" className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-2 rounded-full shadow-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                </svg>
                <span className="font-semibold">{ecocoins}</span>
              </div>

              <div className="flex items-center gap-2 bg-white border border-emerald-100 rounded-full px-3 py-2">
                <Globe size={18} className="text-emerald-600" />
                <select
                  data-testid="language-switch"
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

          <div className="flex gap-2 mt-4 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  data-testid={`tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'map' && (
          <div data-testid="map-tab" className="h-full rounded-2xl overflow-hidden shadow-xl">
            {userLocation && (
              <MapContainer center={userLocation} zoom={8} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                <Marker position={userLocation}>
                  <Popup>You are here</Popup>
                </Marker>
                {attractions.map(attraction => (
                  <Marker key={attraction.id} position={[attraction.latitude, attraction.longitude]}>
                    <Popup>
                      <strong>{getText(attraction, 'name')}</strong>
                      <br />
                      {getText(attraction, 'description').substring(0, 100)}...
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        )}

        {activeTab === 'attractions' && (
          <div data-testid="attractions-tab" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attractions.map(attraction => (
              <div
                key={attraction.id}
                data-testid={`attraction-card-${attraction.id}`}
                onClick={() => handleAttractionClick(attraction)}
                className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <img src={attraction.image_url} alt={getText(attraction, 'name')} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Outfit' }}>
                    {getText(attraction, 'name')}
                  </h3>
                  <p className="text-slate-600 text-sm line-clamp-3 mb-3">
                    {getText(attraction, 'description')}
                  </p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={16} className={`${i < Math.round(attraction.average_rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                    ))}
                    <span className="text-sm text-slate-600 ml-2">({attraction.review_count})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'taxi' && (
          <div data-testid="taxi-tab" className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-6" style={{ fontFamily: 'Outfit' }}>{t('orderTaxi')}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('from')}</label>
                  <input
                    data-testid="taxi-from-input"
                    type="text"
                    value={taxiOrder.from}
                    onChange={(e) => setTaxiOrder({ ...taxiOrder, from: e.target.value })}
                    placeholder="Enter pickup location"
                    className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('to')}</label>
                  <input
                    data-testid="taxi-to-input"
                    type="text"
                    value={taxiOrder.to}
                    onChange={(e) => setTaxiOrder({ ...taxiOrder, to: e.target.value })}
                    placeholder="Enter destination"
                    className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 transition-all"
                  />
                </div>

                <button
                  data-testid="order-taxi-btn"
                  onClick={handleOrderTaxi}
                  className="w-full py-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors text-lg font-medium shadow-lg shadow-emerald-500/20"
                >
                  {t('orderTaxi')}
                </button>
              </div>

              <div className="mt-8 p-6 bg-emerald-50 rounded-xl">
                <h3 className="font-semibold text-emerald-800 mb-2">Eco Electric Vehicles</h3>
                <p className="text-sm text-emerald-700">Our eco-taxis are 100% electric, helping reduce carbon emissions and protect the environment.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hotels' && (
          <div data-testid="hotels-tab" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hotels.map(hotel => (
              <div key={hotel.id} data-testid={`hotel-card-${hotel.id}`} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300">
                <img src={hotel.image_url} alt={hotel.name} className="w-full h-48 object-cover" />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit' }}>{hotel.name}</h3>
                    {hotel.is_partner && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-3 py-1 rounded-full font-semibold">
                        {t('partner')}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-sm mb-4">{hotel.description}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-emerald-600">{hotel.price_per_night}</span>
                      <span className="text-slate-600 text-sm ml-1">₸/night</span>
                    </div>
                    <button
                      data-testid={`book-hotel-btn-${hotel.id}`}
                      onClick={() => setShowBookingModal(hotel)}
                      className="bg-emerald-500 text-white px-6 py-2 rounded-full hover:bg-emerald-600 transition-colors text-sm font-medium"
                    >
                      {t('bookNow')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div data-testid="tasks-tab" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map(task => (
              <div key={task.id} data-testid={`task-card-${task.id}`} className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-2xl transition-all duration-300">
                <h3 className="text-xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Outfit' }}>
                  {getText(task, 'title')}
                </h3>
                <p className="text-slate-600 text-sm mb-4">{getText(task, 'description')}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full">
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
                    </svg>
                    <span className="font-bold text-emerald-600">{task.reward_coins} {t('coins')}</span>
                  </div>
                  <button
                    onClick={() => handleTaskSubmit(task.id)}
                    className="bg-emerald-500 text-white px-6 py-2 rounded-full hover:bg-emerald-600 transition-colors text-sm font-medium"
                  >
                    {t('submitTask')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'about' && (
          <div data-testid="about-tab" className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
              <h2 className="text-3xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'Outfit' }}>{t('mission')}</h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">{t('missionText')}</p>
              
              <h3 className="text-2xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'Outfit' }}>{t('authors')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {['Nurtas Ulagat', 'Esbulat Arslan', 'Yertaiuly Beibarys', 'Tolendi Abilmansur'].map(author => (
                  <div key={author} className="bg-emerald-50 rounded-xl p-4 text-center">
                    <p className="font-semibold text-slate-800">{author}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-2xl font-bold text-slate-800 mb-4" style={{ fontFamily: 'Outfit' }}>Contact Us</h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Message</label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 resize-none"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors font-medium shadow-lg shadow-emerald-500/20"
                >
                  <Send size={18} />
                  Send Message to contact@ecosayahat.kz
                </button>
              </form>
            </div>

            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl shadow-xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Outfit' }}>{t('recyclingScheme')}</h3>
              <p className="text-white/90 text-lg">{t('recyclingText')}</p>
            </div>
          </div>
        )}
      </main>

      {/* Attraction Modal */}
      {selectedAttraction && (
        <div data-testid="attraction-modal" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedAttraction(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Outfit' }}>
                    {getText(selectedAttraction, 'name')}
                  </h2>
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={20} className={`${i < Math.round(selectedAttraction.average_rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                    ))}
                    <span className="text-slate-600 ml-2">({selectedAttraction.review_count} reviews)</span>
                  </div>
                </div>
                <button
                  data-testid="close-modal-btn"
                  onClick={() => setSelectedAttraction(null)}
                  className="text-slate-500 hover:text-slate-700 p-2"
                >
                  <X size={24} />
                </button>
              </div>

              <p className="text-slate-600 mb-6 text-lg leading-relaxed">{getText(selectedAttraction, 'description')}</p>

              {selectedAttraction.vr_url && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-3 flex items-center justify-between">
                    <span>{t('view360')}</span>
                    <span className="text-xs text-slate-500 font-normal bg-slate-100 px-3 py-1 rounded-full">
                      Demo 360° view
                    </span>
                  </h3>
                  <div className="rounded-xl overflow-hidden shadow-lg border border-slate-200">
                    <iframe
                      src={selectedAttraction.vr_url}
                      width="100%"
                      height="450"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`360° view of ${getText(selectedAttraction, 'name')}`}
                    ></iframe>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 text-center italic">
                    360° demo view. Final version will be attraction-specific.
                  </p>
                </div>
              )}

              {/* Reviews Section */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-800 mb-4">{t('reviews')}</h3>
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                  {reviews.length === 0 ? (
                    <p className="text-slate-500">No reviews yet. Be the first to review!</p>
                  ) : (
                    reviews.map(review => (
                      <div key={review.id} className="bg-emerald-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-800">{review.user_name}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} className={`${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600 text-sm">{review.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Review Form */}
                <div className="bg-white border border-emerald-100 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-800 mb-3">{t('addReview')}</h4>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-slate-600">{t('rating')}:</span>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setNewReview({ ...newReview, rating })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={24}
                          className={`${rating <= newReview.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    placeholder={t('yourReview')}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30 resize-none mb-3"
                  ></textarea>
                  <button
                    onClick={handleSubmitReview}
                    className="w-full py-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors text-sm font-medium"
                  >
                    {t('submit')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hotel Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBookingModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Outfit' }}>Book {showBookingModal.name}</h3>
              <button onClick={() => setShowBookingModal(null)} className="text-slate-500 hover:text-slate-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={bookingData.checkIn}
                  onChange={(e) => setBookingData({ ...bookingData, checkIn: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} />
                  Check-out Date
                </label>
                <input
                  type="date"
                  value={bookingData.checkOut}
                  onChange={(e) => setBookingData({ ...bookingData, checkOut: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Users size={16} />
                  Number of Guests
                </label>
                <input
                  type="number"
                  min="1"
                  value={bookingData.guests}
                  onChange={(e) => setBookingData({ ...bookingData, guests: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 bg-emerald-50/30"
                />
              </div>

              <div className="bg-emerald-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-700">Price per night:</span>
                  <span className="text-xl font-bold text-emerald-600">{showBookingModal.price_per_night} ₸</span>
                </div>
                {showBookingModal.is_partner && (
                  <p className="text-sm text-emerald-700">✓ EcoCoins accepted (up to 100 coins discount)</p>
                )}
              </div>

              <button
                onClick={handleBookHotel}
                className="w-full py-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors text-lg font-medium shadow-lg shadow-emerald-500/20"
              >
                Confirm Booking & Pay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

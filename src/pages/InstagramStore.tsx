import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Instagram, Link as LinkIcon, TrendingUp, Heart, Eye, CheckCircle, AlertCircle, X } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  category: string;
  pricePer1000: number;
  minQuantity: number;
  maxQuantity: number;
  description: string;
  isActive: boolean;
}

const MOCK_POSTS = [
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1516245834210-c4c142787335?q=80&w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?q=80&w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=400&h=400&fit=crop',
];

const InstagramStore: React.FC = () => {
  const { user, profile } = useAuth();
  const [username, setUsername] = useState('');
  const [isLinked, setIsLinked] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  
  const [services, setServices] = useState<Service[]>([]);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Order Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;
    const qServices = query(collection(db, 'services'), where('isActive', '==', true));
    const unsubServices = onSnapshot(qServices, (snapshot) => {
      const svcs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      // Filter primarily for Instagram services if they exist, otherwise show all
      const igServices = svcs.filter(s => s.category.toLowerCase().includes('instagram') || s.category.toLowerCase().includes('ig'));
      setServices(igServices.length > 0 ? igServices : svcs);
    });
    return () => unsubServices();
  }, [user]);

  const handleLinkAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setIsLinking(true);
    // Simulate API call to fetch Instagram profile
    setTimeout(() => {
      setIsLinked(true);
      setIsLinking(false);
    }, 1500);
  };

  const openBoostModal = (postIndex: number | null) => {
    setSelectedPost(postIndex);
    setError('');
    setSuccess('');
    if (services.length > 0) {
      setSelectedServiceId(services[0].id);
      setQuantity(services[0].minQuantity);
    }
    setIsModalOpen(true);
  };

  const selectedService = services.find(s => s.id === selectedServiceId);
  const totalPrice = selectedService ? (quantity * selectedService.pricePer1000) / 1000 : 0;

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!selectedService || !user || !profile) return;
    
    if (quantity < selectedService.minQuantity || quantity > selectedService.maxQuantity) {
      setError(`Quantity must be between ${selectedService.minQuantity} and ${selectedService.maxQuantity}`);
      return;
    }

    if (profile.walletBalance < totalPrice) {
      setError('Insufficient funds. Please top up your wallet.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const newOrderRef = doc(collection(db, 'orders'));
      
      const targetLink = selectedPost !== null 
        ? `https://instagram.com/p/post_${selectedPost}_${username}` 
        : `https://instagram.com/${username}`;

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User does not exist!");
        
        const currentBalance = userDoc.data().walletBalance;
        if (currentBalance < totalPrice) {
          throw new Error("Insufficient funds.");
        }

        transaction.update(userRef, { walletBalance: currentBalance - totalPrice });
        transaction.set(newOrderRef, {
          userId: user.uid,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          link: targetLink,
          quantity,
          totalPrice,
          status: 'Pending',
          createdAt: serverTimestamp()
        });
      });

      setSuccess('Order placed successfully! Check your dashboard.');
      setTimeout(() => setIsModalOpen(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 mb-4 shadow-lg">
            <Instagram className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Instagram Growth Store</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Link your Instagram account to instantly access a personalized storefront for boosting your profile and recent posts.
          </p>
        </div>

        {!isLinked ? (
          /* Link Account Section */
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-md mx-auto text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Connect Account</h2>
            <p className="text-sm text-slate-500 mb-6">Enter your Instagram username to generate your custom store. No password required.</p>
            
            <form onSubmit={handleLinkAccount}>
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-medium">@</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="username"
                  className="block w-full pl-8 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                />
              </div>
              <button
                type="submit"
                disabled={isLinking || !username}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-70 flex items-center justify-center"
              >
                {isLinking ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div> Connecting...</>
                ) : (
                  'Create My Store'
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Linked Store Dashboard */
          <div className="space-y-8">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500">
                  <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-white">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">@{username}</h2>
                  <div className="flex items-center text-emerald-600 text-sm font-medium mt-1">
                    <CheckCircle className="w-4 h-4 mr-1" /> Store Connected
                  </div>
                  <div className="flex gap-4 mt-3 text-sm text-slate-600">
                    <div><span className="font-bold text-slate-900">1,240</span> Posts</div>
                    <div><span className="font-bold text-slate-900">14.5k</span> Followers</div>
                    <div><span className="font-bold text-slate-900">320</span> Following</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => openBoostModal(null)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center shadow-sm"
                >
                  <TrendingUp className="w-5 h-5 mr-2" /> Boost Profile
                </button>
                <button 
                  onClick={() => setIsLinked(false)}
                  className="px-6 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors text-sm"
                >
                  Change Account
                </button>
              </div>
            </div>

            {/* Recent Posts Grid */}
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                Recent Posts <span className="ml-2 text-sm font-normal text-slate-500">(Select to boost)</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {MOCK_POSTS.map((imgUrl, idx) => (
                  <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                    <img src={imgUrl} alt={`Post ${idx}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                      <div className="flex gap-4 text-white font-medium">
                        <span className="flex items-center"><Heart className="w-5 h-5 mr-1 fill-current" /> 1.2k</span>
                        <span className="flex items-center"><Eye className="w-5 h-5 mr-1" /> 4.5k</span>
                      </div>
                      <button 
                        onClick={() => openBoostModal(idx)}
                        className="px-4 py-2 bg-white text-slate-900 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors"
                      >
                        Boost Post
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Order Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedPost !== null ? 'Boost Post' : 'Boost Profile'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start"><AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />{error}</div>}
                {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-start"><CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />{success}</div>}

                <form onSubmit={handleOrder}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Service</label>
                    <select 
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      value={selectedServiceId}
                      onChange={(e) => {
                        setSelectedServiceId(e.target.value);
                        const svc = services.find(s => s.id === e.target.value);
                        if (svc) setQuantity(svc.minQuantity);
                      }}
                    >
                      {services.map(svc => (
                        <option key={svc.id} value={svc.id}>
                          {svc.name} - {svc.pricePer1000} OMR/1k
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedService && (
                    <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-xl border border-blue-100">
                      {selectedService.description}
                      <div className="mt-2 text-xs font-medium text-blue-600">
                        Min: {selectedService.minQuantity.toLocaleString()} | Max: {selectedService.maxQuantity.toLocaleString()}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                    <input 
                      type="number" 
                      required
                      min={selectedService?.minQuantity || 1}
                      max={selectedService?.maxQuantity || 100000}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>

                  <div className="mb-6 p-4 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-200">
                    <span className="text-slate-600 font-medium">Total Charge:</span>
                    <span className="text-2xl font-bold text-blue-600">{totalPrice.toFixed(3)} OMR</span>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || !selectedService || !!success}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Processing...' : 'Place Order'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InstagramStore;

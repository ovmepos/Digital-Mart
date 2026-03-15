import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Instagram, Link as LinkIcon, TrendingUp, Heart, Eye, CheckCircle, AlertCircle, X, Loader2, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [plans, setPlans] = useState<any[]>([]);
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
    }, (error) => handleFirestoreError(error, OperationType.GET, 'services'));
    return () => unsubServices();
  }, [user]);

  useEffect(() => {
    const unsubPlans = onSnapshot(collection(db, 'subscriptionPlans'), (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'subscriptionPlans'));
    return () => unsubPlans();
  }, []);

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

  const getDiscountedPrice = (price: number) => {
    if (!profile?.planId) return price;

    // Check if plan is expired
    if (profile.planExpiresAt) {
      const expiry = profile.planExpiresAt.toDate ? profile.planExpiresAt.toDate() : new Date(profile.planExpiresAt);
      if (expiry < new Date()) return price;
    }

    const plan = plans.find(p => p.id === profile.planId);
    if (!plan || !plan.isActive) return price;
    return price * (1 - plan.discountPercentage / 100);
  };

  const selectedService = services.find(s => s.id === selectedServiceId);
  const basePrice = selectedService ? (quantity * selectedService.pricePer1000) / 1000 : 0;
  const totalPrice = getDiscountedPrice(basePrice);

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
    <div className="min-h-screen bg-slate-50 py-12 md:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="mb-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 mb-8 shadow-2xl shadow-pink-200 animate-pulse">
            <Instagram className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">Instagram Booster</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Link your Instagram account to instantly access a personalized storefront for boosting your profile and recent posts.
          </p>
        </div>

        {!isLinked ? (
          /* Link Account Section */
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-10 md:p-16 max-w-xl mx-auto text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500"></div>
            
            <div className="w-20 h-20 bg-blue-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8">
              <LinkIcon className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Connect Account</h2>
            <p className="text-slate-500 mb-10 leading-relaxed">Enter your Instagram username to generate your custom store. <span className="font-bold text-slate-900">No password required.</span></p>
            
            <form onSubmit={handleLinkAccount} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-black text-xl">@</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="username"
                  className="block w-full pl-14 pr-6 py-5 bg-slate-50 border-none rounded-[1.5rem] text-slate-900 font-black text-lg focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                />
              </div>
              <button
                type="submit"
                disabled={isLinking || !username}
                className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all duration-300 shadow-xl shadow-slate-200 hover:shadow-blue-200 disabled:opacity-70 flex items-center justify-center gap-3"
              >
                {isLinking ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
                ) : (
                  <>Create My Store <TrendingUp className="w-4 h-4" /></>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          /* Linked Store Dashboard */
          <div className="space-y-12">
            {/* Profile Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-200 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-10"
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full p-1.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 shadow-xl">
                    <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-white">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`} alt="Avatar" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full border-4 border-white shadow-lg">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="text-center md:text-left">
                  <h2 className="text-4xl font-black text-slate-900 mb-2">@{username}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-6 mt-6">
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-900">1,240</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Posts</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100"></div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-900">14.5k</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Followers</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100"></div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-slate-900">320</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Following</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-4 w-full md:w-auto">
                <button 
                  onClick={() => openBoostModal(null)}
                  className="px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all duration-300 shadow-xl shadow-slate-200 hover:shadow-blue-200 flex items-center justify-center gap-2"
                >
                  <TrendingUp className="w-5 h-5" /> Boost Profile
                </button>
                <button 
                  onClick={() => setIsLinked(false)}
                  className="px-10 py-4 bg-slate-50 text-slate-500 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Change Account
                </button>
              </div>
            </motion.div>

            {/* Recent Posts Grid */}
            <div>
              <div className="flex items-center justify-between mb-8 px-4">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Recent Posts</h3>
                <span className="text-sm font-bold text-slate-400">Select a post to boost</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
                {MOCK_POSTS.map((imgUrl, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group relative aspect-square rounded-[2.5rem] overflow-hidden bg-slate-100 border border-slate-200 shadow-sm hover:shadow-2xl transition-all duration-500"
                  >
                    <img src={imgUrl} alt={`Post ${idx}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center">
                      <div className="flex gap-6 text-white mb-8">
                        <div className="text-center">
                          <Heart className="w-6 h-6 mb-1 mx-auto fill-pink-500 text-pink-500" />
                          <span className="text-sm font-black">1.2k</span>
                        </div>
                        <div className="text-center">
                          <Eye className="w-6 h-6 mb-1 mx-auto text-blue-400" />
                          <span className="text-sm font-black">4.5k</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => openBoostModal(idx)}
                        className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all duration-300 shadow-xl"
                      >
                        Boost Post
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Order Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden relative"
            >
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {selectedPost !== null ? 'Boost Post' : 'Boost Profile'}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Configure your growth package</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white text-slate-400 hover:text-slate-900 rounded-2xl shadow-sm transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-10">
                {error && (
                  <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold flex items-center border border-red-100">
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="mb-8 p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-bold flex items-center border border-emerald-100">
                    <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                    {success}
                  </div>
                )}

                <form onSubmit={handleOrder} className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Select Service</label>
                    <select 
                      className="w-full p-5 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                      value={selectedServiceId}
                      onChange={(e) => {
                        setSelectedServiceId(e.target.value);
                        const svc = services.find(s => s.id === e.target.value);
                        if (svc) setQuantity(svc.minQuantity);
                      }}
                    >
                      {services.map(svc => (
                        <option key={svc.id} value={svc.id}>
                          {svc.name} - {svc.pricePer1000.toFixed(3)} OMR
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedService && (
                    <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <p className="text-sm text-blue-900 leading-relaxed mb-4">{selectedService.description}</p>
                      <div className="flex gap-4">
                        <span className="px-3 py-1 bg-white text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                          Min: {selectedService.minQuantity.toLocaleString()}
                        </span>
                        <span className="px-3 py-1 bg-white text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm">
                          Max: {selectedService.maxQuantity.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Quantity</label>
                    <input 
                      type="number" 
                      required
                      min={selectedService?.minQuantity || 1}
                      max={selectedService?.maxQuantity || 100000}
                      className="w-full p-5 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                    />
                  </div>

                  <div className="p-8 bg-slate-900 rounded-[2rem] flex justify-between items-center shadow-xl shadow-slate-200">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Charge</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-white">{totalPrice.toFixed(3)} <span className="text-sm font-bold opacity-50 text-white">OMR</span></p>
                        {basePrice !== totalPrice && (
                          <p className="text-sm font-bold text-slate-500 line-through">{basePrice.toFixed(3)} OMR</p>
                        )}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                      <Zap className="w-6 h-6 text-yellow-400 fill-current" />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading || !selectedService || !!success}
                    className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all duration-300 shadow-xl shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                    ) : (
                      <>Place Order <TrendingUp className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
};

export default InstagramStore;

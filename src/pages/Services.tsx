import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Search, Filter, ShoppingCart, Star, X, CheckCircle, AlertCircle, Heart, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { addDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface Service {
  id: string;
  name: string;
  category: string;
  pricePer1000: number;
  minQuantity: number;
  maxQuantity: number;
  description: string;
  averageTime?: string;
  features?: string[];
  type?: string;
  imageUrl?: string;
}

const getCategoryImage = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('instagram') || cat.includes('ig')) return 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&h=300&fit=crop';
  if (cat.includes('youtube') || cat.includes('yt')) return 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=400&h=300&fit=crop';
  if (cat.includes('tiktok')) return 'https://images.unsplash.com/photo-1611605698335-8b1569810432?q=80&w=400&h=300&fit=crop';
  if (cat.includes('twitter') || cat.includes('x')) return 'https://images.unsplash.com/photo-1611605698323-b1e99cfd37ea?q=80&w=400&h=300&fit=crop';
  return 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=400&h=300&fit=crop';
};

const Services: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [plans, setPlans] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  
  // Buy Modal State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [orderLoading, setOrderLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState<string | null>(null);
  const [wishlistLoading, setWishlistLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(collection(db, 'services'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const svcs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setServices(svcs);
        
        const plansSnapshot = await getDocs(collection(db, 'subscriptionPlans'));
        setPlans(plansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        setCategoriesData(categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const categories = ['All', ...categoriesData.filter(c => c.isActive).map(c => c.name)];

  const getServiceCategoryImage = (categoryName: string) => {
    const cat = categoriesData.find(c => c.name === categoryName);
    if (cat?.imageUrl) return cat.imageUrl;
    return getCategoryImage(categoryName);
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBuyClick = (service: Service) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedService(service);
    setQuantity(service.minQuantity);
    setLink('');
    setError('');
    setSuccess('');
  };

  const getDiscountedPrice = (price: number) => {
    if (!profile?.planId) return price;
    const plan = plans.find(p => p.id === profile.planId);
    if (!plan || !plan.isActive) return price;
    return price * (1 - plan.discountPercentage / 100);
  };

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !user || !profile) return;
    
    setError('');
    setSuccess('');
    
    if (quantity < selectedService.minQuantity || quantity > selectedService.maxQuantity) {
      setError(`Quantity must be between ${selectedService.minQuantity} and ${selectedService.maxQuantity}`);
      return;
    }

    const basePrice = (quantity * selectedService.pricePer1000) / 1000;
    const totalPrice = getDiscountedPrice(basePrice);

    if (profile.walletBalance < totalPrice) {
      setError('Insufficient funds. Please top up your wallet in the dashboard.');
      return;
    }

    setOrderLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const newOrderRef = doc(collection(db, 'orders'));
      const newTransactionRef = doc(collection(db, 'transactions'));

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
          link,
          quantity,
          totalPrice,
          status: 'Pending',
          createdAt: serverTimestamp()
        });
        transaction.set(newTransactionRef, {
          userId: user.uid,
          amount: -totalPrice,
          type: 'order',
          description: `Order: ${selectedService.name} (Qty: ${quantity})`,
          createdAt: serverTimestamp()
        });
      });

      setSuccess('Order placed successfully!');
      setTimeout(() => setSelectedService(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleAddToCart = async (service: Service) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setCartLoading(service.id);
    try {
      await addDoc(collection(db, 'cart'), {
        userId: user.uid,
        serviceId: service.id,
        serviceName: service.name,
        quantity: service.minQuantity,
        price: service.pricePer1000,
        createdAt: serverTimestamp()
      });
      setSuccess('Added to cart!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Failed to add to cart: ' + err.message);
    } finally {
      setCartLoading(null);
    }
  };

  const toggleWishlist = async (serviceId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setWishlistLoading(serviceId);
    try {
      const userRef = doc(db, 'users', user.uid);
      const isInWishlist = profile?.wishlist?.includes(serviceId);

      if (isInWishlist) {
        await updateDoc(userRef, {
          wishlist: arrayRemove(serviceId)
        });
      } else {
        await updateDoc(userRef, {
          wishlist: arrayUnion(serviceId)
        });
      }
    } catch (err: any) {
      console.error("Wishlist error:", err);
    } finally {
      setWishlistLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Digital Catalog</h1>
          <p className="text-lg text-slate-600 max-w-2xl">Premium digital growth services tailored for your success. Scale your presence with confidence.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters - Responsive */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 flex items-center">
                  <Filter className="w-5 h-5 mr-2 text-blue-600" /> Categories
                </h3>
                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">{categories.length - 1}</span>
              </div>
              <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`whitespace-nowrap lg:w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                      selectedCategory === category 
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 translate-x-1' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search Bar */}
            <div className="bg-white p-1.5 rounded-3xl shadow-sm border border-slate-200 mb-8 flex items-center focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
              <div className="pl-4">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search premium services..."
                className="block w-full pl-3 pr-4 py-4 border-transparent bg-transparent focus:ring-0 focus:border-transparent text-base font-medium text-slate-900 placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-32">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No services found</h3>
                <p className="text-slate-500">Try adjusting your search or filters to find what you're looking for.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                {filteredServices.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
                  >
                    <div className="h-56 overflow-hidden relative">
                      <img 
                        src={service.imageUrl || getServiceCategoryImage(service.category)} 
                        alt={service.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white/95 backdrop-blur-md text-slate-900 shadow-lg">
                          {service.category}
                        </span>
                        {service.type && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white shadow-lg">
                            {service.type}
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => toggleWishlist(service.id)}
                        disabled={wishlistLoading === service.id}
                        className={`absolute top-4 right-4 p-3 rounded-2xl backdrop-blur-md transition-all duration-300 shadow-lg ${
                          profile?.wishlist?.includes(service.id)
                            ? 'bg-red-500 text-white scale-110'
                            : 'bg-white/90 text-slate-400 hover:text-red-500 hover:scale-110'
                        }`}
                      >
                        {wishlistLoading === service.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Heart className={`w-5 h-5 ${profile?.wishlist?.includes(service.id) ? 'fill-current' : ''}`} />
                        )}
                      </button>
                    </div>
                    
                    <div className="p-6 flex-grow flex flex-col">
                      <div className="flex items-center mb-3">
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 ml-2 tracking-wider">4.9 RATING</span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors">{service.name}</h3>
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2 leading-relaxed">{service.description}</p>
                      
                      <div className="flex flex-wrap gap-1.5 mb-6">
                        {service.averageTime && (
                          <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-100">
                            ⏱ {service.averageTime}
                          </span>
                        )}
                        {service.features && service.features.slice(0, 2).map((feature, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100">
                            ✓ {feature}
                          </span>
                        ))}
                      </div>
                      
                      <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Starting Price</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900">
                              {getDiscountedPrice(service.pricePer1000).toFixed(3)}
                            </span>
                            <span className="text-xs font-bold text-slate-500">OMR</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAddToCart(service)}
                            disabled={cartLoading === service.id}
                            className="p-3 bg-slate-50 text-slate-900 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200 hover:border-blue-200"
                          >
                            {cartLoading === service.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => handleBuyClick(service)}
                            className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 hover:shadow-blue-200"
                          >
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buy Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2 text-blue-600" /> Checkout
              </h3>
              <button onClick={() => setSelectedService(null)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex gap-4 mb-4 pb-4 border-b border-slate-100">
                <img src={getServiceCategoryImage(selectedService.category)} alt="Product" className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                <div>
                  <h4 className="font-bold text-slate-900 line-clamp-2 text-sm">{selectedService.name}</h4>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <p className="text-blue-600 font-bold">{getDiscountedPrice(selectedService.pricePer1000).toFixed(3)} OMR <span className="text-xs text-slate-500 font-normal">/ 1k</span></p>
                    {getDiscountedPrice(selectedService.pricePer1000) < selectedService.pricePer1000 && (
                      <p className="text-xs text-slate-400 line-through">{selectedService.pricePer1000.toFixed(3)}</p>
                    )}
                  </div>
                </div>
              </div>

              {(selectedService.averageTime || (selectedService.features && selectedService.features.length > 0)) && (
                <div className="mb-6 pb-6 border-b border-slate-100">
                  {selectedService.averageTime && (
                    <p className="text-sm text-slate-600 mb-2">
                      <span className="font-semibold text-slate-800">Average Time:</span> {selectedService.averageTime}
                    </p>
                  )}
                  {selectedService.features && selectedService.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedService.features.map((feature, idx) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                          {feature}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start"><AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />{error}</div>}
              {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-start"><CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />{success}</div>}

              <form onSubmit={handleOrder}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Link</label>
                  <input 
                    type="url" 
                    required
                    placeholder="https://..."
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-end mb-1">
                    <label className="block text-sm font-medium text-slate-700">Quantity</label>
                    <span className="text-xs text-slate-500">Min: {selectedService.minQuantity} | Max: {selectedService.maxQuantity}</span>
                  </div>
                  <input 
                    type="number" 
                    required
                    min={selectedService.minQuantity}
                    max={selectedService.maxQuantity}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>

                <div className="mb-6 p-4 bg-slate-900 rounded-xl flex justify-between items-center shadow-inner">
                  <span className="text-slate-300 font-medium">Total Price:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-white block">
                      {getDiscountedPrice((quantity * selectedService.pricePer1000) / 1000).toFixed(3)} OMR
                    </span>
                    {getDiscountedPrice(selectedService.pricePer1000) < selectedService.pricePer1000 && (
                      <span className="text-sm text-slate-400 line-through block">
                        {((quantity * selectedService.pricePer1000) / 1000).toFixed(3)} OMR
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={orderLoading || !!success}
                  className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20"
                >
                  {orderLoading ? 'Processing...' : 'Confirm Purchase'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Services;

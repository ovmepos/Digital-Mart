import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Search, Filter, ShoppingCart, Star, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Service {
  id: string;
  name: string;
  category: string;
  pricePer1000: number;
  minQuantity: number;
  maxQuantity: number;
  description: string;
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
  
  // Buy Modal State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [orderLoading, setOrderLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const q = query(collection(db, 'services'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const svcs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setServices(svcs);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];

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

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !user || !profile) return;
    
    setError('');
    setSuccess('');
    
    if (quantity < selectedService.minQuantity || quantity > selectedService.maxQuantity) {
      setError(`Quantity must be between ${selectedService.minQuantity} and ${selectedService.maxQuantity}`);
      return;
    }

    const totalPrice = (quantity * selectedService.pricePer1000) / 1000;

    if (profile.walletBalance < totalPrice) {
      setError('Insufficient funds. Please top up your wallet in the dashboard.');
      return;
    }

    setOrderLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const newOrderRef = doc(collection(db, 'orders'));

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
      });

      setSuccess('Order placed successfully!');
      setTimeout(() => setSelectedService(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Digital Catalog</h1>
          <p className="text-slate-600">Browse our premium digital products and services.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2" /> Categories
              </h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      selectedCategory === category 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-100'
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
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 mb-6 flex items-center">
              <div className="pl-4">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                className="block w-full pl-3 pr-4 py-3 border-transparent bg-transparent focus:ring-0 focus:border-transparent sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-32">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-2xl border border-slate-200">
                <p className="text-slate-500 text-lg">No products found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredServices.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col group"
                  >
                    <div className="h-48 overflow-hidden relative">
                      <img 
                        src={getCategoryImage(service.category)} 
                        alt={service.category} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white/90 backdrop-blur-sm text-slate-900 shadow-sm">
                          {service.category}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5 flex-grow flex flex-col">
                      <div className="flex items-center mb-2">
                        <div className="flex text-yellow-400 text-sm">
                          <Star className="w-4 h-4 fill-current" />
                          <Star className="w-4 h-4 fill-current" />
                          <Star className="w-4 h-4 fill-current" />
                          <Star className="w-4 h-4 fill-current" />
                          <Star className="w-4 h-4 fill-current" />
                        </div>
                        <span className="text-xs text-slate-400 ml-2">(4.9)</span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-2">{service.name}</h3>
                      <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-grow">{service.description}</p>
                      
                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-slate-100">
                        <div>
                          <p className="text-xs text-slate-500 font-medium mb-1">Price per 1k</p>
                          <p className="text-xl font-extrabold text-blue-600">
                            {service.pricePer1000.toFixed(3)} <span className="text-sm font-medium text-slate-500">OMR</span>
                          </p>
                        </div>
                        <button 
                          onClick={() => handleBuyClick(service)}
                          className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md"
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </button>
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
              <div className="flex gap-4 mb-6 pb-6 border-b border-slate-100">
                <img src={getCategoryImage(selectedService.category)} alt="Product" className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                <div>
                  <h4 className="font-bold text-slate-900 line-clamp-2 text-sm">{selectedService.name}</h4>
                  <p className="text-blue-600 font-bold mt-1">{selectedService.pricePer1000.toFixed(3)} OMR <span className="text-xs text-slate-500 font-normal">/ 1k</span></p>
                </div>
              </div>

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
                  <span className="text-2xl font-bold text-white">
                    {((quantity * selectedService.pricePer1000) / 1000).toFixed(3)} OMR
                  </span>
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

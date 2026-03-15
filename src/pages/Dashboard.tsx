import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Clock, CheckCircle, Loader, XCircle, ShoppingBag, TrendingUp, Wallet, Crown } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  category: string;
  pricePer1000: number;
  minQuantity: number;
  maxQuantity: number;
  description: string;
  isActive: boolean;
  imageUrl?: string;
}

interface Order {
  id: string;
  serviceId: string;
  serviceName: string;
  link: string;
  quantity: number;
  totalPrice: number;
  status: 'Pending' | 'Processing' | 'Completed' | 'Canceled';
  createdAt: any;
}

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [manualTransfers, setManualTransfers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  
  // Form state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;

    // Fetch active services
    const qServices = query(collection(db, 'services'), where('isActive', '==', true));
    const unsubServices = onSnapshot(qServices, (snapshot) => {
      const svcs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      setServices(svcs);
      if (svcs.length > 0 && !selectedCategory) {
        setSelectedCategory(svcs[0].category);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'services'));

    // Fetch user orders
    const qOrders = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      // Sort by createdAt descending locally
      ords.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(ords);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'orders'));

    // Fetch user manual transfers
    const qManual = query(collection(db, 'manualTransfers'), where('userId', '==', user.uid));
    const unsubManual = onSnapshot(qManual, (snapshot) => {
      const transfers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      transfers.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setManualTransfers(transfers);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'manualTransfers'));

    // Fetch plans
    const qPlans = query(collection(db, 'subscriptionPlans'), where('isActive', '==', true));
    const unsubPlans = onSnapshot(qPlans, (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'subscriptionPlans'));

    // Fetch categories
    const qCategories = query(collection(db, 'categories'), where('isActive', '==', true));
    const unsubCategories = onSnapshot(qCategories, (snapshot) => {
      setCategoriesData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'categories'));

    return () => {
      unsubServices();
      unsubOrders();
      unsubManual();
      unsubPlans();
      unsubCategories();
    };
  }, [user]);

  const categories = categoriesData.length > 0 ? categoriesData.map(c => c.name) : Array.from(new Set(services.map(s => s.category)));
  const filteredServices = services.filter(s => s.category === selectedCategory);
  const selectedService = services.find(s => s.id === selectedServiceId) || filteredServices[0];

  useEffect(() => {
    if (filteredServices.length > 0 && (!selectedServiceId || !filteredServices.find(s => s.id === selectedServiceId))) {
      setSelectedServiceId(filteredServices[0].id);
    }
  }, [selectedCategory, filteredServices]);

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
      // Use a transaction to deduct balance and create order securely
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
      setLink('');
      setQuantity(selectedService.minQuantity);
    } catch (err: any) {
      setError(err.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'Processing': return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'Completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'Canceled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Dashboard Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div className="flex-1">
            <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">My Dashboard</h1>
            <p className="text-lg text-slate-600">Manage your orders and track your digital growth in real-time.</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            {profile?.planId && (
              <div className="flex items-center bg-slate-900 px-6 py-4 rounded-3xl shadow-xl shadow-slate-200 border border-slate-800 text-white group hover:scale-105 transition-transform duration-300">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-transform">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Active Plan</p>
                  <p className="text-lg font-bold">
                    {plans.find(p => p.id === profile.planId)?.name || 'Premium'}
                  </p>
                  {profile.planExpiresAt && (() => {
                    const expiry = profile.planExpiresAt.toDate ? profile.planExpiresAt.toDate() : new Date(profile.planExpiresAt);
                    const isExpired = expiry < new Date();
                    return (
                      <p className={`text-[10px] font-bold ${isExpired ? 'text-red-400' : 'text-slate-500'}`}>
                        {isExpired ? 'Expired: ' : 'Expires: '} {expiry.toLocaleDateString()}
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}
            
            <div className="flex items-center bg-white px-6 py-4 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 group hover:scale-105 transition-transform duration-300">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mr-4 group-hover:rotate-12 transition-transform">
                <Wallet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Balance</p>
                <p className="text-2xl font-black text-slate-900">{profile?.walletBalance.toFixed(3)} <span className="text-xs font-bold text-slate-400">OMR</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Quick Order Form */}
          <div className="lg:col-span-4">
            <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 sticky top-24">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                  <ShoppingBag className="w-6 h-6 mr-3 text-blue-600" /> Quick Order
                </h2>
              </div>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm text-red-800 font-bold">{error}</p>
                </div>
              )}
              
              {success && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm text-emerald-800 font-bold">{success}</p>
                </div>
              )}

              <form onSubmit={handleOrder} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Category</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Service</label>
                  <select 
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                    value={selectedServiceId}
                    onChange={(e) => {
                      setSelectedServiceId(e.target.value);
                      const svc = services.find(s => s.id === e.target.value);
                      if (svc) setQuantity(svc.minQuantity);
                    }}
                  >
                    {filteredServices.map(svc => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedService && (
                  <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                    <p className="text-sm text-slate-700 leading-relaxed font-medium mb-3">{selectedService.description}</p>
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1 bg-white rounded-lg text-[10px] font-black text-blue-600 uppercase tracking-wider border border-blue-100">
                        Min: {selectedService.minQuantity.toLocaleString()}
                      </div>
                      <div className="px-3 py-1 bg-white rounded-lg text-[10px] font-black text-blue-600 uppercase tracking-wider border border-blue-100">
                        Max: {selectedService.maxQuantity.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Target Link</label>
                  <input 
                    type="url" 
                    required
                    placeholder="https://instagram.com/..." 
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Quantity</label>
                  <input 
                    type="number" 
                    required
                    min={selectedService?.minQuantity || 1}
                    max={selectedService?.maxQuantity || 100000}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>

                <div className="p-6 bg-slate-900 rounded-3xl flex justify-between items-center shadow-2xl shadow-slate-200">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Charge</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">{totalPrice.toFixed(3)}</span>
                      <span className="text-xs font-bold text-slate-400">OMR</span>
                    </div>
                  </div>
                  {totalPrice < basePrice && (
                    <div className="px-3 py-1 bg-blue-600 rounded-lg text-[10px] font-black text-white uppercase tracking-wider animate-pulse">
                      Save {(basePrice - totalPrice).toFixed(3)}
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !selectedService}
                  className="w-full bg-blue-600 text-white py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 transition-all shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-1 active:translate-y-0"
                >
                  {loading ? 'Processing Order...' : 'Place Order Now'}
                </button>
              </form>
            </div>
          </div>

          {/* Order History */}
          <div className="lg:col-span-8">
            <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden">
              <div className="px-8 py-8 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                  <TrendingUp className="w-6 h-6 mr-3 text-blue-600" /> Order History
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Updates</span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Details</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Charge</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-32 text-center">
                          <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                              <ShoppingBag className="w-10 h-10 text-slate-200" />
                            </div>
                            <p className="text-xl font-black text-slate-900 mb-2">No orders yet</p>
                            <p className="text-slate-500 text-sm font-medium">Start your digital growth journey by placing your first order today.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className="text-xs font-black text-slate-400 font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mr-4 overflow-hidden border border-slate-200 group-hover:scale-110 transition-transform">
                                {services.find(s => s.id === order.serviceId)?.imageUrl ? (
                                  <img src={services.find(s => s.id === order.serviceId)?.imageUrl} alt={order.serviceName} className="w-full h-full object-cover" />
                                ) : (
                                  <ShoppingBag className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-black text-slate-900 truncate mb-1">{order.serviceName}</span>
                                <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 truncate max-w-[200px] flex items-center">
                                  {order.link.replace(/^https?:\/\/(www\.)?/, '')}
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className="text-sm font-black text-slate-900">{order.quantity.toLocaleString()}</span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-black text-slate-900">{order.totalPrice.toFixed(3)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">OMR</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className={`inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                              ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                order.status === 'Processing' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                                order.status === 'Canceled' ? 'bg-red-50 text-red-600 border border-red-100' : 
                                'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                              <span className="mr-2">{getStatusIcon(order.status)}</span>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Manual Transfers History */}
            <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden mt-8">
              <div className="px-8 py-8 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                  <Wallet className="w-6 h-6 mr-3 text-emerald-600" /> Wallet History
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {manualTransfers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-16 text-center">
                          <p className="text-slate-500 text-sm font-medium">No wallet transactions found.</p>
                        </td>
                      </tr>
                    ) : (
                      manualTransfers.map((t) => (
                        <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className="text-xs font-black text-slate-400 font-mono">#{t.id.slice(0, 8).toUpperCase()}</span>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-black text-slate-900">{t.amount.toFixed(3)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">OMR</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 whitespace-nowrap">
                            <span className={`inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                              ${t.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                t.status === 'Rejected' ? 'bg-red-50 text-red-600 border border-red-100' : 
                                'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            {t.adminNotes ? (
                              <p className="text-xs font-bold text-red-600 leading-relaxed">{t.adminNotes}</p>
                            ) : (
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">---</span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-xs font-bold text-slate-400">
                            {t.createdAt?.toDate().toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

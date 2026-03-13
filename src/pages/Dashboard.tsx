import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { Clock, CheckCircle, Loader, XCircle, ShoppingBag, TrendingUp, Wallet } from 'lucide-react';

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

interface Order {
  id: string;
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
    });

    // Fetch user orders
    const qOrders = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      // Sort by createdAt descending locally
      ords.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(ords);
    });

    return () => {
      unsubServices();
      unsubOrders();
    };
  }, [user]);

  const categories = Array.from(new Set(services.map(s => s.category)));
  const filteredServices = services.filter(s => s.category === selectedCategory);
  const selectedService = services.find(s => s.id === selectedServiceId) || filteredServices[0];

  useEffect(() => {
    if (filteredServices.length > 0 && (!selectedServiceId || !filteredServices.find(s => s.id === selectedServiceId))) {
      setSelectedServiceId(filteredServices[0].id);
    }
  }, [selectedCategory, filteredServices]);

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
      // Use a transaction to deduct balance and create order securely
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
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Dashboard Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">My Dashboard</h1>
            <p className="text-slate-600 mt-1">Manage your orders and track your digital growth.</p>
          </div>
          <div className="flex items-center bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Available Balance</p>
              <p className="text-xl font-bold text-slate-900">{profile?.walletBalance.toFixed(3)} OMR</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Quick Order Form */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-sm rounded-2xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold mb-6 text-slate-900 flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2 text-blue-600" /> Quick Order
              </h2>
              
              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">{error}</div>}
              {success && <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-100">{success}</div>}

              <form onSubmit={handleOrder}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                  <select 
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Service</label>
                  <select 
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                    value={selectedServiceId}
                    onChange={(e) => {
                      setSelectedServiceId(e.target.value);
                      const svc = services.find(s => s.id === e.target.value);
                      if (svc) setQuantity(svc.minQuantity);
                    }}
                  >
                    {filteredServices.map(svc => (
                      <option key={svc.id} value={svc.id}>
                        {svc.name} - {svc.pricePer1000} OMR / 1k
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
                  <input 
                    type="number" 
                    required
                    min={selectedService?.minQuantity || 1}
                    max={selectedService?.maxQuantity || 100000}
                    className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>

                <div className="mb-6 p-4 bg-slate-900 rounded-xl flex justify-between items-center shadow-inner">
                  <span className="text-slate-300 font-medium">Total Charge:</span>
                  <span className="text-2xl font-bold text-white">{totalPrice.toFixed(3)} OMR</span>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !selectedService}
                  className="w-full bg-blue-600 text-white py-3.5 px-4 rounded-xl font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>
              </form>
            </div>
          </div>

          {/* Order History */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-blue-600" /> Order History
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Link</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Charge</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center">
                            <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
                            <p className="text-lg font-medium text-slate-900">No orders yet</p>
                            <p className="text-sm">Your order history will appear here.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-500">#{order.id.slice(0, 6)}</td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-medium">{order.serviceName}</td>
                          <td className="px-6 py-4 text-sm text-blue-600 truncate max-w-[150px]">
                            <a href={order.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                              {order.link}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-medium">{order.quantity.toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">{order.totalPrice.toFixed(3)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold
                              ${order.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 
                                order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 
                                order.status === 'Canceled' ? 'bg-red-100 text-red-800' : 
                                'bg-yellow-100 text-yellow-800'}`}>
                              {getStatusIcon(order.status)}
                              <span className="ml-1.5">{order.status}</span>
                            </span>
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

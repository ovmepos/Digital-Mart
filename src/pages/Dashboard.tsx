import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, runTransaction } from 'firebase/firestore';
import { Clock, CheckCircle, Loader, XCircle } from 'lucide-react';

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
      case 'Completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Canceled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Order Form */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-gray-900">New Order</h2>
            
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>}

            <form onSubmit={handleOrder}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    const svc = services.find(s => s.id === e.target.value);
                    if (svc) setQuantity(svc.minQuantity);
                  }}
                >
                  {filteredServices.map(svc => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name} - {svc.pricePer1000} OMR / 1000
                    </option>
                  ))}
                </select>
              </div>

              {selectedService && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-md">
                  {selectedService.description}
                  <div className="mt-2 text-xs text-blue-600">
                    Min: {selectedService.minQuantity} | Max: {selectedService.maxQuantity}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://..." 
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input 
                  type="number" 
                  required
                  min={selectedService?.minQuantity || 1}
                  max={selectedService?.maxQuantity || 100000}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>

              <div className="mb-6 p-4 bg-gray-50 rounded-md flex justify-between items-center border border-gray-200">
                <span className="text-gray-600 font-medium">Charge:</span>
                <span className="text-xl font-bold text-blue-600">{totalPrice.toFixed(3)} OMR</span>
              </div>

              <button 
                type="submit" 
                disabled={loading || !selectedService}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Submit Order'}
              </button>
            </form>
          </div>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Order History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Link</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charge</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No orders found.</td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.id.slice(0, 8)}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{order.serviceName}</td>
                        <td className="px-6 py-4 text-sm text-blue-600 truncate max-w-[150px]">
                          <a href={order.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {order.link}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.totalPrice.toFixed(3)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                              order.status === 'Processing' ? 'bg-blue-100 text-blue-800' : 
                              order.status === 'Canceled' ? 'bg-red-100 text-red-800' : 
                              'bg-yellow-100 text-yellow-800'}`}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">{order.status}</span>
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
  );
};

export default Dashboard;

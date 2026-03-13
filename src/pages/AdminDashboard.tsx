import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Navigate } from 'react-router-dom';
import { Users, ShoppingCart, Settings, PlusCircle } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'services'>('orders');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // New Service Form
  const [newService, setNewService] = useState({
    name: '', category: '', pricePer1000: 0, minQuantity: 100, maxQuantity: 10000, description: '', isActive: true
  });

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const unsubOrders = onSnapshot(query(collection(db, 'orders')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubServices = onSnapshot(query(collection(db, 'services')), (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubOrders();
      unsubUsers();
      unsubServices();
    };
  }, [profile]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (profile?.role !== 'admin') return <Navigate to="/" />;

  const updateOrderStatus = async (orderId: string, status: string) => {
    await updateDoc(doc(db, 'orders', orderId), { status });
  };

  const updateUserBalance = async (userId: string, currentBalance: number, amount: number) => {
    const newBalance = currentBalance + amount;
    if (newBalance >= 0) {
      await updateDoc(doc(db, 'users', userId), { walletBalance: newBalance });
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'services'), {
        ...newService,
        createdAt: serverTimestamp()
      });
      setNewService({ name: '', category: '', pricePer1000: 0, minQuantity: 100, maxQuantity: 10000, description: '', isActive: true });
      alert('Service added!');
    } catch (err: any) {
      alert('Error adding service: ' + err.message);
    }
  };

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'services', serviceId), { isActive: !currentStatus });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>
      
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`pb-2 px-4 font-medium flex items-center ${activeTab === 'orders' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ShoppingCart className="w-5 h-5 mr-2" /> Orders
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-2 px-4 font-medium flex items-center ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users className="w-5 h-5 mr-2" /> Users
        </button>
        <button 
          onClick={() => setActiveTab('services')}
          className={`pb-2 px-4 font-medium flex items-center ${activeTab === 'services' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Settings className="w-5 h-5 mr-2" /> Services
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="px-6 py-4 text-sm text-gray-500">{order.id.slice(0, 6)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{order.userId.slice(0, 6)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.serviceName}</td>
                  <td className="px-6 py-4 text-sm text-blue-600 max-w-xs truncate"><a href={order.link} target="_blank" rel="noreferrer">{order.link}</a></td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.quantity}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <select 
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="border rounded p-1 text-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Completed">Completed</option>
                      <option value="Canceled">Canceled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance (OMR)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Add Funds</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.role}</td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">{u.walletBalance.toFixed(3)}</td>
                  <td className="px-6 py-4 text-sm flex space-x-2">
                    <button onClick={() => updateUserBalance(u.id, u.walletBalance, 1)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">+1</button>
                    <button onClick={() => updateUserBalance(u.id, u.walletBalance, 5)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">+5</button>
                    <button onClick={() => updateUserBalance(u.id, u.walletBalance, 10)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">+10</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center"><PlusCircle className="w-5 h-5 mr-2" /> Add Service</h3>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Name</label>
                <input type="text" required value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full border p-2 rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Category</label>
                <input type="text" required value={newService.category} onChange={e => setNewService({...newService, category: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="e.g., Instagram" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Price/1000</label>
                  <input type="number" step="0.001" required value={newService.pricePer1000} onChange={e => setNewService({...newService, pricePer1000: Number(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Min Qty</label>
                  <input type="number" required value={newService.minQuantity} onChange={e => setNewService({...newService, minQuantity: Number(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Description</label>
                <textarea required value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full border p-2 rounded text-sm" rows={2}></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700">Create Service</button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/1k</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map(s => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.category}</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{s.pricePer1000} OMR</td>
                    <td className="px-6 py-4 text-sm">
                      <button 
                        onClick={() => toggleServiceStatus(s.id, s.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {s.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

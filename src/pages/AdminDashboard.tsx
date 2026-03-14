import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, runTransaction, setDoc } from 'firebase/firestore';
import { Navigate } from 'react-router-dom';
import { Users, ShoppingCart, Settings, PlusCircle, Trash2, CreditCard, Edit2, Image as ImageIcon, Wallet, Crown, Layers, Tag } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'services' | 'transactions' | 'gateways' | 'plans' | 'manual_transfers' | 'categories' | 'types'>('orders');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [manualTransfers, setManualTransfers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);

  // New Service Form
  const [newService, setNewService] = useState({
    name: '', category: '', pricePer1000: 0, minQuantity: 100, maxQuantity: 10000, description: '', averageTime: '', features: '', type: 'Service', isActive: true, imageUrl: ''
  });
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // New Category Form
  const [newCategory, setNewCategory] = useState({ name: '', imageUrl: '', isActive: true });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // New Type Form
  const [newType, setNewType] = useState({ name: '', isActive: true });
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

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

    const unsubTransactions = onSnapshot(query(collection(db, 'transactions')), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubGateways = onSnapshot(query(collection(db, 'paymentGateways')), (snapshot) => {
      setGateways(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubPlans = onSnapshot(query(collection(db, 'subscriptionPlans')), (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubManualTransfers = onSnapshot(query(collection(db, 'manualTransfers')), (snapshot) => {
      setManualTransfers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCategories = onSnapshot(query(collection(db, 'categories')), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubTypes = onSnapshot(query(collection(db, 'serviceTypes')), (snapshot) => {
      setServiceTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubOrders();
      unsubUsers();
      unsubServices();
      unsubTransactions();
      unsubGateways();
      unsubPlans();
      unsubManualTransfers();
      unsubCategories();
      unsubTypes();
    };
  }, [profile]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (profile?.role !== 'admin') return <Navigate to="/" />;

  const updateOrderStatus = async (orderId: string, currentStatus: string, newStatus: string, userId: string, totalPrice: number, serviceName: string) => {
    if (currentStatus === newStatus) return;

    try {
      const orderRef = doc(db, 'orders', orderId);
      
      if (newStatus === 'Canceled' && currentStatus !== 'Canceled') {
        // Refund the user
        const userRef = doc(db, 'users', userId);
        const newTransactionRef = doc(collection(db, 'transactions'));
        
        await runTransaction(db, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) throw new Error("User not found");
          
          const currentBalance = userDoc.data().walletBalance;
          transaction.update(userRef, { walletBalance: currentBalance + totalPrice });
          transaction.update(orderRef, { status: newStatus });
          transaction.set(newTransactionRef, {
            userId: userId,
            amount: totalPrice,
            type: 'refund',
            description: `Refund for canceled order: ${serviceName}`,
            createdAt: serverTimestamp()
          });
        });
      } else {
        await updateDoc(orderRef, { status: newStatus });
      }
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  };

  const updateUserBalance = async (userId: string, currentBalance: number, amount: number) => {
    const newBalance = currentBalance + amount;
    if (newBalance >= 0) {
      try {
        const userRef = doc(db, 'users', userId);
        const newTransactionRef = doc(collection(db, 'transactions'));
        
        await runTransaction(db, async (transaction) => {
          transaction.update(userRef, { walletBalance: newBalance });
          transaction.set(newTransactionRef, {
            userId: userId,
            amount: amount,
            type: amount > 0 ? 'topup' : 'adjustment',
            description: `Admin balance adjustment`,
            createdAt: serverTimestamp()
          });
        });
      } catch (err) {
        console.error("Failed to update balance:", err);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setNewService({ ...newService, imageUrl: dataUrl });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = {
        ...newService,
        features: typeof newService.features === 'string' ? newService.features.split(',').map(f => f.trim()).filter(f => f) : newService.features,
      };

      if (editingServiceId) {
        await updateDoc(doc(db, 'services', editingServiceId), serviceData);
        setEditingServiceId(null);
      } else {
        await addDoc(collection(db, 'services'), {
          ...serviceData,
          createdAt: serverTimestamp()
        });
      }
      setNewService({ name: '', category: '', pricePer1000: 0, minQuantity: 100, maxQuantity: 10000, description: '', averageTime: '', features: '', type: 'Service', isActive: true, imageUrl: '' });
    } catch (err: any) {
      console.error('Error saving service: ' + err.message);
    }
  };

  const handleEditService = (service: any) => {
    setEditingServiceId(service.id);
    setNewService({
      name: service.name,
      category: service.category,
      pricePer1000: service.pricePer1000,
      minQuantity: service.minQuantity,
      maxQuantity: service.maxQuantity,
      description: service.description,
      averageTime: service.averageTime || '',
      features: Array.isArray(service.features) ? service.features.join(', ') : (service.features || ''),
      type: service.type || 'Service',
      isActive: service.isActive,
      imageUrl: service.imageUrl || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'services', serviceId), { isActive: !currentStatus });
  };

  const handleDeleteOrder = async (orderId: string) => {
    await deleteDoc(doc(db, 'orders', orderId));
  };

  const handleDeleteUser = async (userId: string) => {
    await deleteDoc(doc(db, 'users', userId));
  };

  const handleDeleteService = async (serviceId: string) => {
    await deleteDoc(doc(db, 'services', serviceId));
  };

  const handleUpdateGateway = async (gatewayId: string, data: any) => {
    try {
      const gatewayRef = doc(db, 'paymentGateways', gatewayId);
      await setDoc(gatewayRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error("Error updating gateway:", err);
    }
  };

  const handleApproveManualTransfer = async (transfer: any) => {
    try {
      const userRef = doc(db, 'users', transfer.userId);
      const transferRef = doc(db, 'manualTransfers', transfer.id);
      const newTransactionRef = doc(collection(db, 'transactions'));

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");

        const currentBalance = userDoc.data().walletBalance || 0;
        transaction.update(userRef, { walletBalance: currentBalance + transfer.amount });
        transaction.update(transferRef, { status: 'approved', updatedAt: serverTimestamp() });
        transaction.set(newTransactionRef, {
          userId: transfer.userId,
          amount: transfer.amount,
          type: 'topup',
          description: `Manual Transfer Approved`,
          createdAt: serverTimestamp()
        });
      });
    } catch (err) {
      console.error("Error approving transfer:", err);
    }
  };

  const handleRejectManualTransfer = async (transferId: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'manualTransfers', transferId), {
        status: 'rejected',
        adminNotes: notes,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error rejecting transfer:", err);
    }
  };

  const [newPlan, setNewPlan] = useState({
    name: '', discountPercentage: 0, price: 0, description: '', isActive: true
  });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'subscriptionPlans'), {
        ...newPlan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewPlan({ name: '', discountPercentage: 0, price: 0, description: '', isActive: true });
    } catch (err) {
      console.error("Error adding plan:", err);
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanId) return;
    try {
      await updateDoc(doc(db, 'subscriptionPlans', editingPlanId), {
        ...newPlan,
        updatedAt: serverTimestamp()
      });
      setEditingPlanId(null);
      setNewPlan({ name: '', discountPercentage: 0, price: 0, description: '', isActive: true });
    } catch (err) {
      console.error("Error updating plan:", err);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategoryId) {
        await updateDoc(doc(db, 'categories', editingCategoryId), newCategory);
        setEditingCategoryId(null);
      } else {
        await addDoc(collection(db, 'categories'), { ...newCategory, createdAt: serverTimestamp() });
      }
      setNewCategory({ name: '', imageUrl: '', isActive: true });
    } catch (err) {
      console.error("Error saving category:", err);
    }
  };

  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTypeId) {
        await updateDoc(doc(db, 'serviceTypes', editingTypeId), newType);
        setEditingTypeId(null);
      } else {
        await addDoc(collection(db, 'serviceTypes'), { ...newType, createdAt: serverTimestamp() });
      }
      setNewType({ name: '', isActive: true });
    } catch (err) {
      console.error("Error saving type:", err);
    }
  };

  const handleCategoryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setNewCategory({ ...newCategory, imageUrl: canvas.toDataURL('image/jpeg', 0.7) });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleEditPlan = (plan: any) => {
    setEditingPlanId(plan.id);
    setNewPlan({
      name: plan.name,
      discountPercentage: plan.discountPercentage,
      price: plan.price,
      description: plan.description,
      isActive: plan.isActive
    });
  };

  const handleDeletePlan = async (planId: string) => {
    await deleteDoc(doc(db, 'subscriptionPlans', planId));
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'subscriptionPlans', planId), { isActive: !currentStatus });
  };

  const updateUserPlan = async (userId: string, planId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { planId: planId || '' });
    } catch (err) {
      console.error("Error updating user plan:", err);
    }
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
        <button 
          onClick={() => setActiveTab('transactions')}
          className={`pb-2 px-4 font-medium flex items-center ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <CreditCard className="w-5 h-5 mr-2" /> Pay History
        </button>
        <button 
          onClick={() => setActiveTab('gateways')}
          className={`pb-2 px-4 font-medium flex items-center ${activeTab === 'gateways' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Wallet className="w-5 h-5 mr-2" /> Gateways
        </button>
        <button 
          onClick={() => setActiveTab('plans')}
          className={`pb-2 px-4 font-medium flex items-center ${activeTab === 'plans' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Crown className="w-5 h-5 mr-2" /> Plans
        </button>
        <button 
          onClick={() => setActiveTab('manual_transfers')}
          className={`pb-2 px-4 font-medium flex items-center ${activeTab === 'manual_transfers' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <ImageIcon className="w-5 h-5 mr-2" /> Manual Pay
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`pb-2 px-4 font-medium flex items-center ${activeTab === 'categories' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Layers className="w-5 h-5 mr-2" /> Categories
        </button>
        <button 
          onClick={() => setActiveTab('types')}
          className={`pb-2 px-4 font-medium flex items-center ${activeTab === 'types' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Tag className="w-5 h-5 mr-2" /> Types
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
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center">
                      {services.find(s => s.id === order.serviceId)?.imageUrl ? (
                        <img src={services.find(s => s.id === order.serviceId)?.imageUrl} alt={order.serviceName} className="w-8 h-8 rounded object-cover mr-2" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center mr-2">
                          <ShoppingCart className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      {order.serviceName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-blue-600 max-w-xs truncate"><a href={order.link} target="_blank" rel="noreferrer">{order.link}</a></td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.quantity}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex items-center space-x-2">
                    <select 
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, order.status, e.target.value, order.userId, order.totalPrice, order.serviceName)}
                      className="border rounded p-1 text-sm"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Completed">Completed</option>
                      <option value="Canceled">Canceled</option>
                    </select>
                    <button onClick={() => handleDeleteOrder(order.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance (OMR)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Add Funds</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.role}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <select 
                      value={u.planId || ''}
                      onChange={(e) => updateUserPlan(u.id, e.target.value)}
                      className="border rounded p-1 text-xs"
                    >
                      <option value="">None</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">{u.walletBalance.toFixed(3)}</td>
                  <td className="px-6 py-4 text-sm flex space-x-2">
                    <button onClick={() => updateUserBalance(u.id, u.walletBalance, 1)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">+1</button>
                    <button onClick={() => updateUserBalance(u.id, u.walletBalance, 5)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">+5</button>
                    <button onClick={() => updateUserBalance(u.id, u.walletBalance, 10)} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200">+10</button>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center">
                {editingServiceId ? <Edit2 className="w-5 h-5 mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />} 
                {editingServiceId ? 'Edit Service' : 'Add Service'}
              </h3>
              {editingServiceId && (
                <button 
                  onClick={() => {
                    setEditingServiceId(null);
                    setNewService({ name: '', category: '', pricePer1000: 0, minQuantity: 100, maxQuantity: 10000, description: '', averageTime: '', features: '', type: 'Service', isActive: true, imageUrl: '' });
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={handleAddService} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Name</label>
                <input type="text" required value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full border p-2 rounded text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Category</label>
                  <select 
                    required 
                    value={newService.category} 
                    onChange={e => setNewService({...newService, category: e.target.value})} 
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Type</label>
                  <select 
                    required 
                    value={newService.type} 
                    onChange={e => setNewService({...newService, type: e.target.value})} 
                    className="w-full border p-2 rounded text-sm"
                  >
                    <option value="">Select Type</option>
                    {serviceTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Image (Optional)</label>
                <div className="flex items-center space-x-4">
                  {newService.imageUrl && (
                    <img src={newService.imageUrl} alt="Preview" className="w-12 h-12 object-cover rounded border" />
                  )}
                  <label className="flex-1 cursor-pointer bg-gray-50 border border-gray-300 border-dashed rounded-md p-2 flex items-center justify-center hover:bg-gray-100">
                    <ImageIcon className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-xs text-gray-500">Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Price/1000</label>
                  <input type="number" step="0.001" required value={newService.pricePer1000} onChange={e => setNewService({...newService, pricePer1000: Number(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Average Time</label>
                  <input type="text" value={newService.averageTime} onChange={e => setNewService({...newService, averageTime: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="e.g., 1-2 hours" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700">Min Qty</label>
                  <input type="number" required value={newService.minQuantity} onChange={e => setNewService({...newService, minQuantity: Number(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Max Qty</label>
                  <input type="number" required value={newService.maxQuantity} onChange={e => setNewService({...newService, maxQuantity: Number(e.target.value)})} className="w-full border p-2 rounded text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Features (comma separated)</label>
                <input type="text" value={newService.features} onChange={e => setNewService({...newService, features: e.target.value})} className="w-full border p-2 rounded text-sm" placeholder="e.g., High Quality, Fast Delivery" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Description</label>
                <textarea required value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full border p-2 rounded text-sm" rows={2}></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700">
                {editingServiceId ? 'Update Service' : 'Create Service'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/1k</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map(s => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 text-sm">
                      {s.imageUrl ? (
                        <img src={s.imageUrl} alt={s.name} className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.category}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{s.type || 'Service'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{s.pricePer1000} OMR</td>
                    <td className="px-6 py-4 text-sm">
                      <button 
                        onClick={() => toggleServiceStatus(s.id, s.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {s.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm flex space-x-2">
                      <button onClick={() => handleEditService(s)} className="text-blue-500 hover:text-blue-700 p-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteService(s.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount (OMR)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()).map(t => (
                <tr key={t.id}>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.id.slice(0, 6)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.userId.slice(0, 6)}</td>
                  <td className={`px-6 py-4 text-sm font-bold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount.toFixed(3)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      t.type === 'topup' ? 'bg-green-100 text-green-800' : 
                      t.type === 'order' ? 'bg-blue-100 text-blue-800' : 
                      t.type === 'refund' ? 'bg-purple-100 text-purple-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{t.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {t.createdAt?.toDate().toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Gateways Tab */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* PayPal Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-blue-600" /> PayPal
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateGateway('paypal', {
                name: 'PayPal',
                isActive: formData.get('isActive') === 'true',
                config: {
                  clientId: formData.get('clientId'),
                  secret: formData.get('secret'),
                  mode: formData.get('mode')
                }
              });
            }} className="space-y-4">
              {(() => {
                const gw = gateways.find(g => g.id === 'paypal') || { isActive: false, config: { clientId: '', secret: '', mode: 'sandbox' } };
                return (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Status</label>
                      <select name="isActive" defaultValue={gw.isActive ? 'true' : 'false'} className="w-full border p-2 rounded text-sm">
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Client ID</label>
                      <input type="text" name="clientId" defaultValue={gw.config.clientId} className="w-full border p-2 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Secret</label>
                      <input type="password" name="secret" defaultValue={gw.config.secret} className="w-full border p-2 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Mode</label>
                      <select name="mode" defaultValue={gw.config.mode} className="w-full border p-2 rounded text-sm">
                        <option value="sandbox">Sandbox</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700">
                      Save PayPal Settings
                    </button>
                  </>
                );
              })()}
            </form>
          </div>

          {/* Thawani Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-emerald-600" /> Thawani
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateGateway('thawani', {
                name: 'Thawani',
                isActive: formData.get('isActive') === 'true',
                config: {
                  publishableKey: formData.get('publishableKey'),
                  secretKey: formData.get('secretKey'),
                  mode: formData.get('mode')
                }
              });
            }} className="space-y-4">
              {(() => {
                const gw = gateways.find(g => g.id === 'thawani') || { isActive: false, config: { publishableKey: '', secretKey: '', mode: 'test' } };
                return (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Status</label>
                      <select name="isActive" defaultValue={gw.isActive ? 'true' : 'false'} className="w-full border p-2 rounded text-sm">
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Publishable Key</label>
                      <input type="text" name="publishableKey" defaultValue={gw.config.publishableKey} className="w-full border p-2 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Secret Key</label>
                      <input type="password" name="secretKey" defaultValue={gw.config.secretKey} className="w-full border p-2 rounded text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Mode</label>
                      <select name="mode" defaultValue={gw.config.mode} className="w-full border p-2 rounded text-sm">
                        <option value="test">Test</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded text-sm font-medium hover:bg-emerald-700">
                      Save Thawani Settings
                    </button>
                  </>
                );
              })()}
            </form>
          </div>

          {/* Manual Transfer Settings */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-purple-600" /> Manual Transfer
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleUpdateGateway('manual', {
                name: 'Manual Transfer',
                isActive: formData.get('isActive') === 'true',
                config: {
                  bankDetails: formData.get('bankDetails'),
                  upiId: formData.get('upiId'),
                  whatsappNumber: formData.get('whatsappNumber'),
                  instructions: formData.get('instructions')
                }
              });
            }} className="space-y-4">
              {(() => {
                const gw = gateways.find(g => g.id === 'manual') || { isActive: false, config: { bankDetails: '', upiId: '', whatsappNumber: '', instructions: '' } };
                return (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Status</label>
                      <select name="isActive" defaultValue={gw.isActive ? 'true' : 'false'} className="w-full border p-2 rounded text-sm">
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Bank Details</label>
                      <textarea name="bankDetails" defaultValue={gw.config.bankDetails} className="w-full border p-2 rounded text-sm" rows={2} placeholder="Bank Name, Account No, IFSC..."></textarea>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">UPI ID</label>
                      <input type="text" name="upiId" defaultValue={gw.config.upiId} className="w-full border p-2 rounded text-sm" placeholder="example@upi" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">WhatsApp Number (with country code)</label>
                      <input type="text" name="whatsappNumber" defaultValue={gw.config.whatsappNumber} className="w-full border p-2 rounded text-sm" placeholder="e.g., 96812345678" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">QR Code Image</label>
                      <div className="flex items-center space-x-4">
                        {gw.config.qrCodeUrl && (
                          <img src={gw.config.qrCodeUrl} alt="QR Code" className="w-12 h-12 object-cover rounded border" />
                        )}
                        <label className="flex-1 cursor-pointer bg-gray-50 border border-gray-300 border-dashed rounded-md p-2 flex items-center justify-center hover:bg-gray-100">
                          <ImageIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-xs text-gray-500">Upload QR</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const MAX_WIDTH = 400;
                                  const MAX_HEIGHT = 400;
                                  let width = img.width;
                                  let height = img.height;
                                  if (width > height) {
                                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                                  } else {
                                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                                  }
                                  canvas.width = width; canvas.height = height;
                                  const ctx = canvas.getContext('2d');
                                  ctx?.drawImage(img, 0, 0, width, height);
                                  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                                  handleUpdateGateway('manual', { config: { ...gw.config, qrCodeUrl: dataUrl } });
                                };
                                img.src = event.target?.result as string;
                              };
                              reader.readAsDataURL(file);
                            }} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Instructions</label>
                      <textarea name="instructions" defaultValue={gw.config.instructions} className="w-full border p-2 rounded text-sm" rows={2} placeholder="Transfer funds and contact on WhatsApp..."></textarea>
                    </div>
                    <button type="submit" className="w-full bg-purple-600 text-white py-2 rounded text-sm font-medium hover:bg-purple-700">
                      Save Manual Settings
                    </button>
                  </>
                );
              })()}
            </form>
          </div>
        </div>
      )}
      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center">
                {editingPlanId ? <Edit2 className="w-5 h-5 mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />} 
                {editingPlanId ? 'Edit Plan' : 'Add Plan'}
              </h3>
              {editingPlanId && (
                <button 
                  onClick={() => {
                    setEditingPlanId(null);
                    setNewPlan({ name: '', discountPercentage: 0, price: 0, description: '', isActive: true });
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              )}
            </div>
            <form onSubmit={editingPlanId ? handleUpdatePlan : handleAddPlan} className="space-y-4">
              <input type="text" placeholder="Plan Name (e.g., Pro, VIP)" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full border p-2 rounded text-sm" required />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
                  <input type="number" placeholder="Discount %" value={newPlan.discountPercentage} onChange={e => setNewPlan({...newPlan, discountPercentage: Number(e.target.value)})} className="w-full border p-2 rounded text-sm" required min="0" max="100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Price (OMR)</label>
                  <input type="number" placeholder="Price" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: Number(e.target.value)})} className="w-full border p-2 rounded text-sm" required min="0" step="0.001" />
                </div>
              </div>
              <textarea placeholder="Description" value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full border p-2 rounded text-sm" rows={3}></textarea>
              <div className="flex items-center">
                <input type="checkbox" checked={newPlan.isActive} onChange={e => setNewPlan({...newPlan, isActive: e.target.checked})} className="mr-2" id="planActive" />
                <label htmlFor="planActive" className="text-sm">Active</label>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700">
                {editingPlanId ? 'Update Plan' : 'Add Plan'}
              </button>
            </form>
          </div>
          
          <div className="lg:col-span-2 bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map(p => (
                  <tr key={p.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-bold">{p.discountPercentage}%</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.price} OMR</td>
                    <td className="px-6 py-4 text-sm">
                      <button 
                        onClick={() => togglePlanStatus(p.id, p.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {p.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm flex space-x-2">
                      <button onClick={() => handleEditPlan(p)} className="text-blue-500 hover:text-blue-700 p-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePlan(p.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Manual Transfers Tab */}
      {activeTab === 'manual_transfers' && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proof</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {manualTransfers.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()).map(t => (
                <tr key={t.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {users.find(u => u.id === t.userId)?.name || t.userId.slice(0, 6)}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{t.amount.toFixed(3)} OMR</td>
                  <td className="px-6 py-4 text-sm">
                    {t.proofUrl ? (
                      <a href={t.proofUrl} target="_blank" rel="noreferrer">
                        <img src={t.proofUrl} alt="Proof" className="w-12 h-12 object-cover rounded border hover:scale-150 transition-transform" />
                      </a>
                    ) : 'No Proof'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      t.status === 'approved' ? 'bg-green-100 text-green-800' : 
                      t.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {t.createdAt?.toDate().toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm flex space-x-2">
                    {t.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleApproveManualTransfer(t)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button 
                          onClick={() => {
                            const notes = prompt('Enter rejection reason:');
                            if (notes) handleRejectManualTransfer(t.id, notes);
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              {editingCategoryId ? <Edit2 className="w-5 h-5 mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />}
              {editingCategoryId ? 'Edit Category' : 'Add Category'}
            </h3>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Name</label>
                <input type="text" required value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full border p-2 rounded text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">Logo / Image</label>
                <input type="file" accept="image/*" onChange={handleCategoryImageUpload} className="w-full text-xs" />
                {newCategory.imageUrl && (
                  <img src={newCategory.imageUrl} alt="Preview" className="mt-2 w-16 h-16 object-cover rounded border" />
                )}
              </div>
              <div className="flex items-center">
                <input type="checkbox" checked={newCategory.isActive} onChange={e => setNewCategory({...newCategory, isActive: e.target.checked})} className="mr-2" id="catActive" />
                <label htmlFor="catActive" className="text-sm">Active</label>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700">
                {editingCategoryId ? 'Update Category' : 'Add Category'}
              </button>
              {editingCategoryId && (
                <button type="button" onClick={() => { setEditingCategoryId(null); setNewCategory({ name: '', imageUrl: '', isActive: true }); }} className="w-full bg-gray-100 text-gray-600 py-2 rounded text-sm font-medium hover:bg-gray-200 mt-2">
                  Cancel
                </button>
              )}
            </form>
          </div>
          <div className="lg:col-span-2 bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Logo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map(cat => (
                  <tr key={cat.id}>
                    <td className="px-6 py-4">
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt={cat.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">No Logo</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{cat.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${cat.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {cat.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm flex space-x-2">
                      <button onClick={() => { setEditingCategoryId(cat.id); setNewCategory({ name: cat.name, imageUrl: cat.imageUrl || '', isActive: cat.isActive }); }} className="text-blue-500 hover:text-blue-700">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={async () => { if(confirm('Delete this category?')) await deleteDoc(doc(db, 'categories', cat.id)); }} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Types Tab */}
      {activeTab === 'types' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              {editingTypeId ? <Edit2 className="w-5 h-5 mr-2" /> : <PlusCircle className="w-5 h-5 mr-2" />}
              {editingTypeId ? 'Edit Type' : 'Add Type'}
            </h3>
            <form onSubmit={handleTypeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">Name</label>
                <input type="text" required value={newType.name} onChange={e => setNewType({...newType, name: e.target.value})} className="w-full border p-2 rounded text-sm" />
              </div>
              <div className="flex items-center">
                <input type="checkbox" checked={newType.isActive} onChange={e => setNewType({...newType, isActive: e.target.checked})} className="mr-2" id="typeActive" />
                <label htmlFor="typeActive" className="text-sm">Active</label>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded text-sm font-medium hover:bg-blue-700">
                {editingTypeId ? 'Update Type' : 'Add Type'}
              </button>
              {editingTypeId && (
                <button type="button" onClick={() => { setEditingTypeId(null); setNewType({ name: '', isActive: true }); }} className="w-full bg-gray-100 text-gray-600 py-2 rounded text-sm font-medium hover:bg-gray-200 mt-2">
                  Cancel
                </button>
              )}
            </form>
          </div>
          <div className="lg:col-span-2 bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {serviceTypes.map(t => (
                  <tr key={t.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {t.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm flex space-x-2">
                      <button onClick={() => { setEditingTypeId(t.id); setNewType({ name: t.name, isActive: t.isActive }); }} className="text-blue-500 hover:text-blue-700">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={async () => { if(confirm('Delete this type?')) await deleteDoc(doc(db, 'serviceTypes', t.id)); }} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
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

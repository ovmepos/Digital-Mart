import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, runTransaction, setDoc } from 'firebase/firestore';
import { Navigate } from 'react-router-dom';
import { Users, ShoppingCart, Settings, PlusCircle, Trash2, CreditCard, Edit2, Image as ImageIcon, Wallet, Crown, Layers, Tag, ShieldCheck, ShoppingBag, List, ArrowRightLeft, Bell, User } from 'lucide-react';

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
    name: '', discountPercentage: 0, price: 0, description: '', isActive: true, duration: 'monthly'
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
      isActive: plan.isActive,
      duration: plan.duration || 'monthly'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-20">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight">Admin <span className="text-blue-500">Panel</span></h1>
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Management</p>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          {[
            { id: 'orders', icon: ShoppingBag, label: 'Orders' },
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'services', icon: List, label: 'Services' },
            { id: 'categories', icon: Tag, label: 'Categories' },
            { id: 'types', icon: Layers, label: 'Service Types' },
            { id: 'transactions', icon: CreditCard, label: 'Transactions' },
            { id: 'gateways', icon: Wallet, label: 'Payment Gateways' },
            { id: 'plans', icon: Crown, label: 'Subscription Plans' },
            { id: 'manual_transfers', icon: ArrowRightLeft, label: 'Manual Transfers' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center px-4 py-3.5 rounded-2xl text-sm font-black transition-all duration-300 group ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">Administrator</p>
              <p className="text-[10px] font-bold text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight capitalize">
              {activeTab.replace(/([A-Z])/g, ' $1').replace('_', ' ')}
            </h2>
            <div className="h-6 w-px bg-slate-100 mx-2"></div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Online</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-10 bg-slate-50 custom-scrollbar">
          <div className="max-w-7xl mx-auto">

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Link</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {orders.map(order => (
                <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                  <td className="px-8 py-6 text-xs font-black text-slate-400 font-mono">#{order.id.slice(0, 6).toUpperCase()}</td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-600">
                    {users.find(u => u.id === order.userId)?.email || order.userId.slice(0, 8)}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mr-3 overflow-hidden border border-slate-200 group-hover:scale-110 transition-transform">
                        {services.find(s => s.id === order.serviceId)?.imageUrl ? (
                          <img src={services.find(s => s.id === order.serviceId)?.imageUrl} alt={order.serviceName} className="w-full h-full object-cover" />
                        ) : (
                          <ShoppingCart className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <span className="text-sm font-black text-slate-900">{order.serviceName}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <a href={order.link} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:text-blue-700 truncate max-w-[150px] block">
                      {order.link.replace(/^https?:\/\/(www\.)?/, '')}
                    </a>
                  </td>
                  <td className="px-8 py-6 text-sm font-black text-slate-900">{order.quantity.toLocaleString()}</td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                      ${order.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        order.status === 'Processing' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                        order.status === 'Canceled' ? 'bg-red-50 text-red-600 border border-red-100' : 
                        'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, order.status, e.target.value, order.userId, order.totalPrice, order.serviceName)}
                        className="px-3 py-1.5 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Completed">Completed</option>
                        <option value="Canceled">Canceled</option>
                      </select>
                      <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Funds</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {users.map(u => (
                <tr key={u.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                  <td className="px-8 py-6 text-sm font-black text-slate-900">{u.name}</td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-500">{u.email}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <select 
                      value={u.planId || ''}
                      onChange={(e) => updateUserPlan(u.id, e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                    >
                      <option value="">None</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-emerald-600">{u.walletBalance.toFixed(3)}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">OMR</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      {[1, 5, 10].map(amount => (
                        <button 
                          key={amount}
                          onClick={() => updateUserBalance(u.id, u.walletBalance, amount)} 
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black hover:bg-emerald-100 transition-colors"
                        >
                          +{amount}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100 sticky top-24">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                  {editingServiceId ? <Edit2 className="w-6 h-6 mr-3 text-blue-600" /> : <PlusCircle className="w-6 h-6 mr-3 text-blue-600" />} 
                  {editingServiceId ? 'Edit Service' : 'Add Service'}
                </h3>
                {editingServiceId && (
                  <button 
                    onClick={() => {
                      setEditingServiceId(null);
                      setNewService({ name: '', category: '', pricePer1000: 0, minQuantity: 100, maxQuantity: 10000, description: '', averageTime: '', features: '', type: 'Service', isActive: true, imageUrl: '' });
                    }}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <form onSubmit={handleAddService} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Name</label>
                  <input type="text" required value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Category</label>
                    <select 
                      required 
                      value={newService.category} 
                      onChange={e => setNewService({...newService, category: e.target.value})} 
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Type</label>
                    <select 
                      required 
                      value={newService.type} 
                      onChange={e => setNewService({...newService, type: e.target.value})} 
                      className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select</option>
                      {serviceTypes.map(t => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Image URL</label>
                  <div className="flex items-center gap-4">
                    {newService.imageUrl && (
                      <img src={newService.imageUrl} alt="Preview" className="w-14 h-14 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                    )}
                    <input 
                      type="url" 
                      placeholder="https://..."
                      value={newService.imageUrl} 
                      onChange={e => setNewService({...newService, imageUrl: e.target.value})} 
                      className="flex-1 px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Price/1k</label>
                    <input type="number" step="0.001" required value={newService.pricePer1000} onChange={e => setNewService({...newService, pricePer1000: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Avg Time</label>
                    <input type="text" value={newService.averageTime} onChange={e => setNewService({...newService, averageTime: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="e.g. 1-2 hours" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Min Qty</label>
                    <input type="number" required value={newService.minQuantity} onChange={e => setNewService({...newService, minQuantity: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Max Qty</label>
                    <input type="number" required value={newService.maxQuantity} onChange={e => setNewService({...newService, maxQuantity: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
                  <textarea required value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" rows={3}></textarea>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
                  {editingServiceId ? 'Update Service' : 'Create Service'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Service</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Price/1k</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {services.map(s => (
                  <tr key={s.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mr-4 overflow-hidden border border-slate-200 group-hover:scale-110 transition-transform">
                          {s.imageUrl ? (
                            <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <span className="text-sm font-black text-slate-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-500">{s.category}</td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {s.type || 'Service'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-blue-600">{s.pricePer1000.toFixed(3)}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">OMR</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => toggleServiceStatus(s.id, s.isActive)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                          ${s.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
                      >
                        {s.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditService(s)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteService(s.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {transactions.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()).map(t => (
                <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                  <td className="px-8 py-6 text-xs font-black text-slate-400 font-mono">#{t.id.slice(0, 6).toUpperCase()}</td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-600">
                    {users.find(u => u.id === t.userId)?.email || t.userId.slice(0, 8)}
                  </td>
                  <td className={`px-8 py-6 text-sm font-black ${t.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount.toFixed(3)} OMR
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                      t.type === 'topup' ? 'bg-emerald-50 text-emerald-600' : 
                      t.type === 'order' ? 'bg-blue-50 text-blue-600' : 
                      t.type === 'refund' ? 'bg-purple-50 text-purple-600' : 
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-500">{t.description}</td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-400">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* PayPal Settings */}
          <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center mb-8">
              <Wallet className="w-6 h-6 mr-3 text-blue-600" /> PayPal
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
            }} className="space-y-6">
              {(() => {
                const gw = gateways.find(g => g.id === 'paypal') || { isActive: false, config: { clientId: '', secret: '', mode: 'sandbox' } };
                return (
                  <>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
                      <select name="isActive" defaultValue={gw.isActive ? 'true' : 'false'} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer">
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Client ID</label>
                      <input type="text" name="clientId" defaultValue={gw.config.clientId} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Secret</label>
                      <input type="password" name="secret" defaultValue={gw.config.secret} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mode</label>
                      <select name="mode" defaultValue={gw.config.mode} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer">
                        <option value="sandbox">Sandbox</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
                      Save PayPal Settings
                    </button>
                  </>
                );
              })()}
            </form>
          </div>

          {/* Thawani Settings */}
          <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center mb-8">
              <CreditCard className="w-6 h-6 mr-3 text-emerald-600" /> Thawani
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
            }} className="space-y-6">
              {(() => {
                const gw = gateways.find(g => g.id === 'thawani') || { isActive: false, config: { publishableKey: '', secretKey: '', mode: 'test' } };
                return (
                  <>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
                      <select name="isActive" defaultValue={gw.isActive ? 'true' : 'false'} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer">
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Publishable Key</label>
                      <input type="text" name="publishableKey" defaultValue={gw.config.publishableKey} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Secret Key</label>
                      <input type="password" name="secretKey" defaultValue={gw.config.secretKey} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Mode</label>
                      <select name="mode" defaultValue={gw.config.mode} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer">
                        <option value="test">Test</option>
                        <option value="live">Live</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 text-white py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20">
                      Save Thawani Settings
                    </button>
                  </>
                );
              })()}
            </form>
          </div>

          {/* Manual Transfer Settings */}
          <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100">
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center mb-8">
              <Settings className="w-6 h-6 mr-3 text-purple-600" /> Manual Transfer
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
            }} className="space-y-6">
              {(() => {
                const gw = gateways.find(g => g.id === 'manual') || { isActive: false, config: { bankDetails: '', upiId: '', whatsappNumber: '', instructions: '' } };
                return (
                  <>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Status</label>
                      <select name="isActive" defaultValue={gw.isActive ? 'true' : 'false'} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer">
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Bank Details</label>
                      <textarea name="bankDetails" defaultValue={gw.config.bankDetails} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" rows={2} placeholder="Bank Name, Account No, IFSC..."></textarea>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">UPI ID</label>
                      <input type="text" name="upiId" defaultValue={gw.config.upiId} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="example@upi" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">WhatsApp Number</label>
                      <input type="text" name="whatsappNumber" defaultValue={gw.config.whatsappNumber} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="e.g., 96812345678" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">QR Code Image</label>
                      <div className="flex items-center gap-4">
                        {gw.config.qrCodeUrl && (
                          <img src={gw.config.qrCodeUrl} alt="QR Code" className="w-14 h-14 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                        )}
                        <label className="flex-1 cursor-pointer bg-slate-50 border-2 border-slate-200 border-dashed rounded-2xl p-4 flex items-center justify-center hover:bg-slate-100 transition-colors group">
                          <ImageIcon className="w-5 h-5 text-slate-400 mr-2 group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Upload QR</span>
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
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Instructions</label>
                      <textarea name="instructions" defaultValue={gw.config.instructions} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" rows={2} placeholder="Transfer funds and contact on WhatsApp..."></textarea>
                    </div>
                    <button type="submit" className="w-full bg-purple-600 text-white py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-600/20">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100 sticky top-24">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                  {editingPlanId ? <Edit2 className="w-6 h-6 mr-3 text-blue-600" /> : <PlusCircle className="w-6 h-6 mr-3 text-blue-600" />} 
                  {editingPlanId ? 'Edit Plan' : 'Add Plan'}
                </h3>
                {editingPlanId && (
                  <button 
                    onClick={() => {
                      setEditingPlanId(null);
                      setNewPlan({ name: '', discountPercentage: 0, price: 0, description: '', isActive: true, duration: 'monthly' });
                    }}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <form onSubmit={editingPlanId ? handleUpdatePlan : handleAddPlan} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Plan Name</label>
                  <input type="text" placeholder="e.g., Pro, VIP" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Discount %</label>
                    <input type="number" value={newPlan.discountPercentage} onChange={e => setNewPlan({...newPlan, discountPercentage: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" required min="0" max="100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Price (OMR)</label>
                    <input type="number" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: Number(e.target.value)})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" required min="0" step="0.001" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Duration</label>
                  <select 
                    value={newPlan.duration} 
                    onChange={e => setNewPlan({...newPlan, duration: e.target.value})} 
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                    required
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
                  <textarea value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" rows={3}></textarea>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <input type="checkbox" checked={newPlan.isActive} onChange={e => setNewPlan({...newPlan, isActive: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" id="planActive" />
                  <label htmlFor="planActive" className="text-sm font-bold text-slate-700">Active Plan</label>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
                  {editingPlanId ? 'Update Plan' : 'Create Plan'}
                </button>
              </form>
            </div>
          </div>
          
          <div className="lg:col-span-8 bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {plans.map(p => (
                  <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                    <td className="px-8 py-6 text-sm font-black text-slate-900">{p.name}</td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-emerald-600">{p.discountPercentage}% OFF</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-slate-900">{p.price.toFixed(3)}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">OMR</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {p.duration}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => togglePlanStatus(p.id, p.isActive)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                          ${p.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
                      >
                        {p.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditPlan(p)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeletePlan(p.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Proof</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {manualTransfers.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()).map(t => (
                <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900">{users.find(u => u.id === t.userId)?.name || 'Unknown'}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{users.find(u => u.id === t.userId)?.email}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-slate-900">{t.amount.toFixed(3)}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">OMR</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {t.proofUrl ? (
                      <a href={t.proofUrl} target="_blank" rel="noreferrer" className="block w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:scale-110 transition-transform">
                        <img src={t.proofUrl} alt="Proof" className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Proof</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                      ${t.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        t.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100' : 
                        'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-400">
                    {t.createdAt?.toDate().toLocaleString()}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      {t.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => handleApproveManualTransfer(t)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => {
                              const notes = prompt('Enter rejection reason:');
                              if (notes) handleRejectManualTransfer(t.id, notes);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100 sticky top-24">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center mb-8">
                {editingCategoryId ? <Edit2 className="w-6 h-6 mr-3 text-blue-600" /> : <PlusCircle className="w-6 h-6 mr-3 text-blue-600" />}
                {editingCategoryId ? 'Edit Category' : 'Add Category'}
              </h3>
              <form onSubmit={handleCategorySubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Name</label>
                  <input type="text" required value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Logo / Image</label>
                  <div className="flex items-center gap-4">
                    {newCategory.imageUrl && (
                      <img src={newCategory.imageUrl} alt="Preview" className="w-14 h-14 object-cover rounded-2xl border border-slate-200 shadow-sm" />
                    )}
                    <input type="file" accept="image/*" onChange={handleCategoryImageUpload} className="flex-1 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <input type="checkbox" checked={newCategory.isActive} onChange={e => setNewCategory({...newCategory, isActive: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" id="catActive" />
                  <label htmlFor="catActive" className="text-sm font-bold text-slate-700">Active Category</label>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
                  {editingCategoryId ? 'Update Category' : 'Add Category'}
                </button>
                {editingCategoryId && (
                  <button type="button" onClick={() => { setEditingCategoryId(null); setNewCategory({ name: '', imageUrl: '', isActive: true }); }} className="w-full bg-slate-100 text-slate-600 py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all mt-2">
                    Cancel
                  </button>
                )}
              </form>
            </div>
          </div>
          <div className="lg:col-span-8 bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {categories.map(cat => (
                  <tr key={cat.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                    <td className="px-8 py-6">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 group-hover:scale-110 transition-transform">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <Tag className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-slate-900">{cat.name}</td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                        ${cat.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {cat.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingCategoryId(cat.id); setNewCategory({ name: cat.name, imageUrl: cat.imageUrl || '', isActive: cat.isActive }); }} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={async () => { if(confirm('Delete this category?')) await deleteDoc(doc(db, 'categories', cat.id)); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100 sticky top-24">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center mb-8">
                {editingTypeId ? <Edit2 className="w-6 h-6 mr-3 text-blue-600" /> : <PlusCircle className="w-6 h-6 mr-3 text-blue-600" />}
                {editingTypeId ? 'Edit Type' : 'Add Type'}
              </h3>
              <form onSubmit={handleTypeSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Name</label>
                  <input type="text" required value={newType.name} onChange={e => setNewType({...newType, name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" />
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                  <input type="checkbox" checked={newType.isActive} onChange={e => setNewType({...newType, isActive: e.target.checked})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" id="typeActive" />
                  <label htmlFor="typeActive" className="text-sm font-bold text-slate-700">Active Type</label>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">
                  {editingTypeId ? 'Update Type' : 'Add Type'}
                </button>
                {editingTypeId && (
                  <button type="button" onClick={() => { setEditingTypeId(null); setNewType({ name: '', isActive: true }); }} className="w-full bg-slate-100 text-slate-600 py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all">
                    Cancel
                  </button>
                )}
              </form>
            </div>
          </div>
          <div className="lg:col-span-8 bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-50">
                {serviceTypes.map(t => (
                  <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors duration-300">
                    <td className="px-8 py-6 text-sm font-black text-slate-900">{t.name}</td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                        ${t.isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                        {t.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingTypeId(t.id); setNewType({ name: t.name, isActive: t.isActive }); }} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={async () => { if(confirm('Delete this type?')) await deleteDoc(doc(db, 'serviceTypes', t.id)); }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;

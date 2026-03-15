import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, runTransaction, setDoc } from 'firebase/firestore';
import { Navigate } from 'react-router-dom';
import { Users, ShoppingCart, Settings, PlusCircle, Trash2, CreditCard, Edit2, Image as ImageIcon, Wallet, Crown, Layers, Tag, ShieldCheck, ShoppingBag, List, ArrowRightLeft, Bell, User, Search, Filter, Calendar, CheckSquare, Square, AlertTriangle, Globe, RefreshCw, Link2, Menu, X } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'users' | 'services' | 'transactions' | 'gateways' | 'plans' | 'manual_transfers' | 'categories' | 'types' | 'api_integration'>('orders');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [gateways, setGateways] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [manualTransfers, setManualTransfers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [apiSettings, setApiSettings] = useState<any>(null);
  const [yoyoBalance, setYoyoBalance] = useState<number | null>(null);
  const [yoyoServices, setYoyoServices] = useState<any[]>([]);
  const [yoyoSearch, setYoyoSearch] = useState('');
  const [isFetchingYoyoServices, setIsFetchingYoyoServices] = useState(false);
  const [selectedProofImage, setSelectedProofImage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');

  const handleSaveApiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'apiSettings', 'yoyomedia'), {
        ...apiSettings,
        updatedAt: serverTimestamp()
      });
      alert('Settings saved successfully!');
    } catch (err) {
      console.error("Error saving API settings:", err);
      alert('Failed to save settings.');
    }
  };

  const fetchYoyoBalance = async () => {
    if (!apiSettings?.yoyoApiKey) {
      alert('Please save your API Key first.');
      return;
    }
    try {
      const response = await fetch('/api/yoyo/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: apiSettings.yoyoApiKey,
          action: 'balance'
        })
      });
      const data = await response.json();
      if (data.balance) {
        setYoyoBalance(Number(data.balance));
      } else {
        alert('Failed to fetch balance: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  };

  const fetchYoyoServices = async () => {
    if (!apiSettings?.yoyoApiKey) {
      alert('Please save your API Key first.');
      return;
    }
    setIsFetchingYoyoServices(true);
    try {
      const response = await fetch('/api/yoyo/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: apiSettings.yoyoApiKey,
          action: 'services'
        })
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setYoyoServices(data);
      } else {
        alert('Failed to fetch services: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error("Services fetch error:", err);
    } finally {
      setIsFetchingYoyoServices(false);
    }
  };

  const importYoyoService = async (yS: any) => {
    try {
      const profitMargin = apiSettings?.profitMargin || 50;
      const costPrice = Number(yS.rate);
      const sellPrice = costPrice * (1 + profitMargin / 100);

      const serviceData = {
        name: yS.name,
        category: yS.category || 'Uncategorized',
        pricePer1000: sellPrice,
        costPrice: costPrice,
        minQuantity: Number(yS.min),
        maxQuantity: Number(yS.max),
        yoyoServiceId: String(yS.service),
        isActive: true,
        type: 'Service',
        description: 'Imported from Yoyomedia. You can edit this description.',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'services'), serviceData);
      alert(`Service "${yS.name}" imported successfully!`);
    } catch (err: any) {
      alert('Import failed: ' + err.message);
    }
  };

  const handleSyncServices = async () => {
    if (!apiSettings?.yoyoApiKey) {
      alert('Please save your API Key first.');
      return;
    }
    setIsSyncing(true);
    setSyncStatus('Fetching services from Yoyomedia...');
    try {
      const response = await fetch('/api/yoyo/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: apiSettings.yoyoApiKey,
          action: 'services'
        })
      });
      const yoyoServices = await response.json();
      
      if (!Array.isArray(yoyoServices)) {
        throw new Error('Invalid response from API');
      }

      setSyncStatus(`Syncing ${yoyoServices.length} services...`);
      
      const profitMargin = apiSettings.profitMargin || 50;
      
      for (const yS of yoyoServices) {
        const existing = services.find(s => s.yoyoServiceId === String(yS.service));
        const costPrice = Number(yS.rate);
        const sellPrice = costPrice * (1 + profitMargin / 100);

        const serviceData: any = {
          pricePer1000: sellPrice,
          costPrice: costPrice,
          minQuantity: Number(yS.min),
          maxQuantity: Number(yS.max),
          yoyoServiceId: String(yS.service),
          updatedAt: serverTimestamp()
        };

        if (existing) {
          // Only update price and metadata, preserve user edited name/description
          await updateDoc(doc(db, 'services', existing.id), serviceData);
        } else {
          // New service from sync (optional: maybe don't auto-add if user wants selective)
          // For now, we'll keep auto-add but user can delete/deactivate
          await addDoc(collection(db, 'services'), {
            ...serviceData,
            name: yS.name,
            category: yS.category || 'Uncategorized',
            description: 'Imported from Yoyomedia.',
            isActive: true,
            type: 'Service',
            createdAt: serverTimestamp()
          });
        }
      }
      
      setSyncStatus('Sync completed successfully!');
      setTimeout(() => setSyncStatus(''), 3000);
    } catch (err: any) {
      console.error("Sync error:", err);
      setSyncStatus('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const checkYoyoOrderStatus = async (order: any) => {
    if (!order.yoyoOrderId || !apiSettings?.yoyoApiKey) return;
    try {
      const response = await fetch('/api/yoyo/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: apiSettings.yoyoApiKey,
          action: 'status',
          order: order.yoyoOrderId
        })
      });
      const data = await response.json();
      if (data.status) {
        // Map Yoyo status to our status
        let newStatus = order.status;
        if (data.status === 'Completed') newStatus = 'Completed';
        if (data.status === 'In progress' || data.status === 'Pending' || data.status === 'Processing') newStatus = 'Processing';
        if (data.status === 'Canceled') newStatus = 'Canceled';
        
        if (newStatus !== order.status) {
          await updateDoc(doc(db, 'orders', order.id), { status: newStatus });
        }
        alert(`Current Status: ${data.status}\nRemains: ${data.remains}`);
      }
    } catch (err) {
      console.error("Error checking status:", err);
      alert('Failed to check status.');
    }
  };

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
  
  // Orders Filtering & Bulk Actions
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [orderDateRange, setOrderDateRange] = useState<string>('All');
  const [orderLinkFilter, setOrderLinkFilter] = useState<string>('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    const unsubApiSettings = onSnapshot(doc(db, 'apiSettings', 'yoyomedia'), (doc) => {
      if (doc.exists()) {
        setApiSettings(doc.data());
      }
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
      unsubApiSettings();
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
    if (window.confirm("Are you sure you want to delete this order?")) {
      await deleteDoc(doc(db, 'orders', orderId));
    }
  };

  const handleBulkDeleteOrders = async () => {
    try {
      await Promise.all(selectedOrderIds.map(id => deleteDoc(doc(db, 'orders', id))));
      setSelectedOrderIds([]);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error("Failed to delete orders:", err);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = orderStatusFilter === 'All' || order.status === orderStatusFilter;
    const matchesLink = order.link.toLowerCase().includes(orderLinkFilter.toLowerCase());
    
    let matchesDate = true;
    if (orderDateRange !== 'All' && order.createdAt) {
      const orderDate = order.createdAt.toDate();
      const now = new Date();
      if (orderDateRange === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= sevenDaysAgo;
      } else if (orderDateRange === '24h') {
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= oneDayAgo;
      } else if (orderDateRange === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = orderDate >= thirtyDaysAgo;
      }
    }
    
    return matchesStatus && matchesLink && matchesDate;
  });

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
      alert('Transfer approved successfully!');
    } catch (err) {
      console.error("Error approving transfer:", err);
      alert('Failed to approve transfer. Check console for details.');
    }
  };

  const handleRejectManualTransfer = async (transferId: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'manualTransfers', transferId), {
        status: 'rejected',
        adminNotes: notes,
        updatedAt: serverTimestamp()
      });
      alert('Transfer rejected.');
    } catch (err) {
      console.error("Error rejecting transfer:", err);
      alert('Failed to reject transfer.');
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
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-40
        w-72 bg-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}
      `}>
        <div className={`p-8 border-b border-slate-800 flex items-center justify-between ${!isSidebarOpen && 'lg:px-4'}`}>
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'lg:hidden'}`}>
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tight">Digital <span className="text-blue-500">Mart</span></h1>
          </div>
          
          {!isSidebarOpen && (
            <div className="hidden lg:flex w-12 h-12 bg-blue-600 rounded-2xl items-center justify-center shadow-lg shadow-blue-500/20 mx-auto">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          )}

          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
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
            { id: 'api_integration', icon: Globe, label: 'API Integration' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                if (window.innerWidth < 1024) setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3.5 rounded-2xl text-sm font-black transition-all duration-300 group ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              } ${!isSidebarOpen && 'lg:justify-center lg:px-0'}`}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-white' : 'text-slate-500'} ${isSidebarOpen ? 'mr-3' : 'lg:mr-0'}`} />
              <span className={`${!isSidebarOpen && 'lg:hidden'}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={`p-6 border-t border-slate-800 ${!isSidebarOpen && 'lg:p-4'}`}>
          <div className={`bg-slate-800/50 rounded-2xl p-4 flex items-center gap-3 ${!isSidebarOpen && 'lg:justify-center lg:p-2'}`}>
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-blue-500" />
            </div>
            <div className={`min-w-0 ${!isSidebarOpen && 'lg:hidden'}`}>
              <p className="text-xs font-black text-white truncate">Administrator</p>
              <p className="text-[10px] font-bold text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-8 lg:px-10 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight capitalize">
              {activeTab.replace(/([A-Z])/g, ' $1').replace('_', ' ')}
            </h2>
            <div className="hidden sm:flex items-center gap-4 ml-4">
              <div className="h-6 w-px bg-slate-100"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
            <button className="p-2 lg:p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 lg:p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-slate-50 custom-scrollbar">
          <div className="max-w-7xl mx-auto">

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200 border border-slate-100 flex flex-wrap items-center gap-6">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by link..." 
                value={orderLinkFilter}
                onChange={(e) => setOrderLinkFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Canceled">Canceled</option>
                </select>
              </div>

              <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl">
                <Calendar className="w-4 h-4 text-slate-400" />
                <select 
                  value={orderDateRange}
                  onChange={(e) => setOrderDateRange(e.target.value)}
                  className="bg-transparent border-none text-xs font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                >
                  <option value="All">All Time</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>

            {selectedOrderIds.length > 0 && (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-3 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedOrderIds.length})
              </button>
            )}
          </div>

          <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-left w-10">
                    <button 
                      onClick={() => {
                        if (selectedOrderIds.length === filteredOrders.length) {
                          setSelectedOrderIds([]);
                        } else {
                          setSelectedOrderIds(filteredOrders.map(o => o.id));
                        }
                      }}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  </th>
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
                {filteredOrders.map(order => (
                  <tr key={order.id} className={`group hover:bg-slate-50/50 transition-colors duration-300 ${selectedOrderIds.includes(order.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => {
                          if (selectedOrderIds.includes(order.id)) {
                            setSelectedOrderIds(selectedOrderIds.filter(id => id !== order.id));
                          } else {
                            setSelectedOrderIds([...selectedOrderIds, order.id]);
                          }
                        }}
                        className={`${selectedOrderIds.includes(order.id) ? 'text-blue-600' : 'text-slate-300'} hover:text-blue-500 transition-colors`}
                      >
                        {selectedOrderIds.includes(order.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
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
                        {order.yoyoOrderId && (
                          <button onClick={() => checkYoyoOrderStatus(order)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Check API Status">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">No orders found</h3>
                <p className="text-slate-500">Try adjusting your filters to find what you're looking for.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-x-auto">
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
        <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Proof</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</th>
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
                      <button 
                        onClick={() => setSelectedProofImage(t.proofUrl)}
                        className="block w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:scale-110 transition-transform"
                      >
                        <img src={t.proofUrl} alt="Proof" className="w-full h-full object-cover" />
                      </button>
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
                  <td className="px-8 py-6">
                    {t.adminNotes ? (
                      <div className="flex items-center gap-2 group/note relative">
                        <Bell className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-500 truncate max-w-[150px]">{t.adminNotes}</span>
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover/note:block z-50">
                          <div className="bg-slate-900 text-white text-[10px] font-bold p-3 rounded-xl shadow-2xl min-w-[200px] leading-relaxed">
                            {t.adminNotes}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">---</span>
                    )}
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
          <div className="lg:col-span-8 bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-x-auto">
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
          <div className="lg:col-span-8 bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] border border-slate-100 overflow-x-auto">
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
      {/* API Integration Tab */}
      {activeTab === 'api_integration' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Settings Card */}
            <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center mb-8">
                <Settings className="w-6 h-6 mr-3 text-blue-600" />
                Yoyomedia API Settings
              </h3>
              <form onSubmit={handleSaveApiSettings} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">API URL</label>
                  <input type="text" disabled value="https://yoyomedia.in/api/v2" className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-400 font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">API Key</label>
                  <input 
                    type="password" 
                    required 
                    value={apiSettings?.yoyoApiKey || ''} 
                    onChange={e => setApiSettings({...apiSettings, yoyoApiKey: e.target.value})} 
                    placeholder="Enter your Yoyomedia API Key"
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Profit Margin (%)</label>
                  <input 
                    type="number" 
                    required 
                    value={apiSettings?.profitMargin || 50} 
                    onChange={e => setApiSettings({...apiSettings, profitMargin: Number(e.target.value)})} 
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500/20 transition-all" 
                  />
                  <p className="mt-2 text-[10px] text-slate-500 font-bold italic">Selling Price = API Price + (API Price * Margin / 100)</p>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-5 px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
                  Save Settings
                </button>
              </form>
            </div>

            {/* Status Card */}
            <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center mb-8">
                <Globe className="w-6 h-6 mr-3 text-blue-600" />
                API Status & Actions
              </h3>
              
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Yoyomedia Balance</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900">
                        {yoyoBalance !== null ? yoyoBalance.toFixed(2) : '---'}
                      </span>
                      <span className="text-sm font-bold text-slate-500 uppercase">USD</span>
                    </div>
                    <button 
                      onClick={fetchYoyoBalance}
                      className="p-3 bg-white text-slate-900 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-200 shadow-sm"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                  <h4 className="text-sm font-black text-blue-900 mb-2">Service Synchronization</h4>
                  <p className="text-xs text-blue-700 mb-6 leading-relaxed">
                    Fetch all services from Yoyomedia and update your local catalog. Existing services will be updated, and new ones will be added.
                  </p>
                  
                  <button 
                    onClick={handleSyncServices}
                    disabled={isSyncing}
                    className="w-full bg-blue-600 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    {isSyncing ? 'Syncing...' : 'Sync All Services'}
                  </button>
                  
                  {syncStatus && (
                    <p className="mt-4 text-center text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">
                      {syncStatus}
                    </p>
                  )}
                  <p className="mt-4 text-[10px] text-slate-500 font-bold text-center italic">
                    Note: "Sync All" will update prices for existing services and add new ones. 
                    Local name/description edits are preserved.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Browse Yoyo Services Section */}
          <div className="bg-white shadow-xl shadow-slate-200 rounded-[2.5rem] p-8 border border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
                  <Search className="w-6 h-6 mr-3 text-blue-600" />
                  Browse Yoyomedia Services
                </h3>
                {yoyoServices.length > 0 && (
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Search Yoyo services..." 
                      value={yoyoSearch}
                      onChange={e => setYoyoSearch(e.target.value)}
                      className="pl-10 pr-6 py-2 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 transition-all w-64"
                    />
                  </div>
                )}
              </div>
              <button 
                onClick={fetchYoyoServices}
                disabled={isFetchingYoyoServices}
                className="px-8 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2"
              >
                {isFetchingYoyoServices ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {yoyoServices.length > 0 ? 'Refresh List' : 'Load Services List'}
              </button>
            </div>

            {yoyoServices.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Name</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate/1k</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Min/Max</th>
                      <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-50">
                    {yoyoServices
                      .filter(yS => 
                        yS.name.toLowerCase().includes(yoyoSearch.toLowerCase()) || 
                        yS.category.toLowerCase().includes(yoyoSearch.toLowerCase()) ||
                        String(yS.service).includes(yoyoSearch)
                      )
                      .map(yS => {
                        const isImported = services.some(s => s.yoyoServiceId === String(yS.service));
                        return (
                        <tr key={yS.service} className="group hover:bg-slate-50/50 transition-colors duration-300">
                          <td className="px-8 py-6 text-xs font-black text-slate-400 font-mono">#{yS.service}</td>
                          <td className="px-8 py-6 text-sm font-bold text-slate-900">{yS.name}</td>
                          <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase">{yS.category}</td>
                          <td className="px-8 py-6 text-sm font-black text-blue-600">${yS.rate}</td>
                          <td className="px-8 py-6 text-xs font-bold text-slate-400">{yS.min} / {yS.max}</td>
                          <td className="px-8 py-6">
                            {isImported ? (
                              <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                Imported
                              </span>
                            ) : (
                              <button 
                                onClick={() => importYoyoService(yS)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                              >
                                Import
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {yoyoServices.length === 0 && !isFetchingYoyoServices && (
              <div className="p-12 text-center bg-slate-50 rounded-[2rem] border border-slate-100 border-dashed">
                <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">Click "Load Services List" to browse available services from Yoyomedia.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedProofImage && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md" onClick={() => setSelectedProofImage(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedProofImage(null)}
              className="absolute top-6 right-6 p-3 bg-white/90 backdrop-blur-sm text-slate-900 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all z-10 shadow-xl"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full h-full overflow-auto p-4 flex items-center justify-center bg-slate-50">
              <img src={selectedProofImage} alt="Payment Proof" className="max-w-full h-auto rounded-xl shadow-lg" />
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">Confirm Bulk Deletion</h3>
            <p className="text-slate-500 mb-10 leading-relaxed">
              Are you sure you want to delete <span className="font-black text-red-600">{selectedOrderIds.length}</span> selected orders? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDeleteOrders}
                className="flex-1 px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/20"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

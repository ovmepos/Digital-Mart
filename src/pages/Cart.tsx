import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { ShoppingCart, Trash2, ArrowRight, Loader2, AlertCircle, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Cart: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'cart'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCartItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const removeItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'cart', itemId));
    } catch (err) {
      console.error("Error removing item:", err);
    }
  };

  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) return;
    try {
      await updateDoc(doc(db, 'cart', itemId), { quantity: newQty });
    } catch (err) {
      console.error("Error updating quantity:", err);
    }
  };

  const updateLink = async (itemId: string, link: string) => {
    try {
      await updateDoc(doc(db, 'cart', itemId), { link });
    } catch (err) {
      console.error("Error updating link:", err);
    }
  };

  const totalPrice = cartItems.reduce((sum, item) => {
    const basePrice = (item.quantity * item.price) / 1000;
    return sum + basePrice;
  }, 0);

  const handleCheckout = async () => {
    if (!user || !profile) return;
    
    // Validate all items have links
    const missingLinks = cartItems.some(item => !item.link);
    if (missingLinks) {
      setError('Please provide target links for all items in your cart.');
      return;
    }

    if (profile.walletBalance < totalPrice) {
      setError('Insufficient funds. Please top up your wallet.');
      return;
    }

    setCheckoutLoading(true);
    setError('');
    try {
      const userRef = doc(db, 'users', user.uid);
      
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");
        
        const currentBalance = userDoc.data().walletBalance;
        if (currentBalance < totalPrice) throw new Error("Insufficient funds");

        // Deduct balance
        transaction.update(userRef, { walletBalance: currentBalance - totalPrice });

        // Create orders and transactions for each item
        for (const item of cartItems) {
          const newOrderRef = doc(collection(db, 'orders'));
          const newTransactionRef = doc(collection(db, 'transactions'));
          const itemPrice = (item.quantity * item.price) / 1000;

          transaction.set(newOrderRef, {
            userId: user.uid,
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            link: item.link,
            quantity: item.quantity,
            totalPrice: itemPrice,
            status: 'Pending',
            createdAt: serverTimestamp()
          });

          transaction.set(newTransactionRef, {
            userId: user.uid,
            amount: -itemPrice,
            type: 'order',
            description: `Order: ${item.serviceName} (Qty: ${item.quantity})`,
            createdAt: serverTimestamp()
          });

          // Delete from cart
          transaction.delete(doc(db, 'cart', item.id));
        }
      });

      setSuccess('Checkout successful! Your orders are being processed.');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.message || 'Checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading cart...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          <ShoppingCart className="w-8 h-8 mr-3 text-blue-600" />
          Shopping Cart
        </h1>
        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
          {cartItems.length} Items
        </span>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start">
          <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-sm text-emerald-600">{success}</p>
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
          <p className="text-slate-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
          <Link 
            to="/services" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Browse Services
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{item.serviceName}</h3>
                    <p className="text-sm text-slate-500">Price: {item.price.toFixed(3)} OMR / 1k</p>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target Link</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="url" 
                        placeholder="https://..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        value={item.link || ''}
                        onChange={(e) => updateLink(item.id, e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-sm text-slate-500 font-medium">Subtotal:</span>
                  <span className="font-bold text-slate-900 text-lg">
                    {((item.quantity * item.price) / 1000).toFixed(3)} OMR
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-slate-900 rounded-2xl p-6 text-white sticky top-24 shadow-xl">
              <h3 className="text-xl font-bold mb-6">Order Summary</h3>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>{totalPrice.toFixed(3)} OMR</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax</span>
                  <span>0.000 OMR</span>
                </div>
                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-blue-400">{totalPrice.toFixed(3)} OMR</span>
                </div>
              </div>

              <div className="mb-6 p-4 bg-slate-800 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-400 uppercase">Your Balance</span>
                  <span className="text-xs font-bold text-blue-400">
                    {profile?.walletBalance?.toFixed(3)} OMR
                  </span>
                </div>
                {profile?.walletBalance < totalPrice && (
                  <p className="text-[10px] text-red-400 mt-1">Insufficient funds. Please top up.</p>
                )}
              </div>

              <button 
                onClick={handleCheckout}
                disabled={checkoutLoading || cartItems.length === 0 || profile?.walletBalance < totalPrice}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkoutLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Checkout Now
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;

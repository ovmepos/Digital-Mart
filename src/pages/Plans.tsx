import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Crown, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  discountPercentage: number;
  price: number;
  description: string;
  isActive: boolean;
  duration: 'monthly' | 'yearly';
}

const Plans: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingPlanId, setBuyingPlanId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const q = query(collection(db, 'subscriptionPlans'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        // Sort by price ascending
        fetchedPlans.sort((a, b) => a.price - b.price);
        setPlans(fetchedPlans);
      } catch (err) {
        console.error("Error fetching plans:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleBuyPlan = async (plan: Plan) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!profile) return;

    setError('');
    setSuccess('');

    if (profile.planId === plan.id) {
      setError('You are already subscribed to this plan.');
      return;
    }

    if (profile.walletBalance < plan.price) {
      setError('Insufficient funds. Please top up your wallet in the dashboard.');
      return;
    }

    setBuyingPlanId(plan.id);

    try {
      const userRef = doc(db, 'users', user.uid);
      const transactionRef = doc(collection(db, 'transactions'));

      // Calculate expiration date
      const expiresAt = new Date();
      if (plan.duration === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User not found");

        const currentBalance = userDoc.data().walletBalance;
        if (currentBalance < plan.price) {
          throw new Error("Insufficient funds");
        }

        transaction.update(userRef, { 
          walletBalance: currentBalance - plan.price,
          planId: plan.id,
          planExpiresAt: expiresAt
        });

        transaction.set(transactionRef, {
          userId: user.uid,
          amount: -plan.price, // Should be negative for a deduction
          type: 'order',
          description: `Subscription to ${plan.name} Plan (${plan.duration})`,
          createdAt: serverTimestamp()
        });
      });

      setSuccess(`Successfully subscribed to ${plan.name} Plan!`);
    } catch (err: any) {
      setError(err.message || 'Failed to purchase plan.');
    } finally {
      setBuyingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-sm font-black uppercase tracking-widest mb-6 border border-blue-100"
          >
            <Crown className="w-4 h-4 mr-2" /> Premium Access
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 tracking-tight">Choose Your Power Plan</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">Unlock exclusive discounts, priority support, and premium features with our subscription plans.</p>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-6 bg-red-50 text-red-700 rounded-3xl flex items-start border border-red-100 shadow-sm">
            <AlertCircle className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {success && (
          <div className="max-w-3xl mx-auto mb-8 p-6 bg-emerald-50 text-emerald-700 rounded-3xl flex items-start border border-emerald-100 shadow-sm">
            <CheckCircle className="w-6 h-6 mr-4 flex-shrink-0 mt-0.5" />
            <p className="font-bold">{success}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm">
            <Crown className="w-20 h-20 text-slate-200 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-900 mb-2">No plans available</h3>
            <p className="text-slate-500">Check back later for new subscription options.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const isCurrentPlan = profile?.planId === plan.id;
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative bg-white rounded-[2.5rem] p-8 shadow-sm border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col ${
                    isCurrentPlan 
                      ? 'border-blue-500 scale-105 z-10' 
                      : 'border-slate-100'
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-xl">
                      Current Plan
                    </div>
                  )}

                  <div className="mb-8">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                      <Crown className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">{plan.name}</h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-slate-900 tracking-tighter">
                        {plan.price.toFixed(2)}
                      </span>
                      <span className="text-slate-400 font-bold">OMR/{plan.duration === 'yearly' ? 'yr' : 'mo'}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50 rounded-2xl p-6 mb-8 border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-800 font-black text-2xl">{plan.discountPercentage}% OFF</span>
                      <span className="text-emerald-600 text-xs font-black uppercase tracking-widest">Store Wide</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button
                      onClick={() => handleBuyPlan(plan)}
                      disabled={isCurrentPlan || buyingPlanId === plan.id}
                      className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 shadow-lg ${
                        isCurrentPlan
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-slate-900 text-white hover:bg-blue-600 shadow-slate-200 hover:shadow-blue-200'
                      }`}
                    >
                      {buyingPlanId === plan.id 
                        ? <div className="flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</div>
                        : isCurrentPlan 
                          ? 'Active Subscription' 
                          : 'Subscribe Now'}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;

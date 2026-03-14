import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Crown, CheckCircle, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Upgrade Your Experience</h1>
          <p className="text-xl text-slate-600">Get exclusive discounts on all our services by subscribing to a premium plan.</p>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-4 bg-red-50 text-red-700 rounded-xl flex items-start border border-red-100">
            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div className="max-w-3xl mx-auto mb-8 p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-start border border-emerald-100">
            <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
            <p>{success}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Crown className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No subscription plans available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const isCurrentPlan = profile?.planId === plan.id;
              
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`bg-white rounded-3xl overflow-hidden flex flex-col relative ${
                    isCurrentPlan 
                      ? 'ring-2 ring-blue-600 shadow-xl scale-105 z-10' 
                      : 'border border-slate-200 shadow-sm hover:shadow-lg transition-shadow'
                  }`}
                >
                  {isCurrentPlan && (
                    <div className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider text-center py-1.5 w-full absolute top-0 left-0">
                      Current Plan
                    </div>
                  )}
                  
                  <div className={`p-8 ${isCurrentPlan ? 'pt-10' : ''}`}>
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                      <Crown className="w-7 h-7 text-blue-600" />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                    <p className="text-slate-500 text-sm mb-6 min-h-[40px]">{plan.description}</p>
                    
                    <div className="flex items-baseline mb-6">
                      <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                      <span className="text-slate-500 ml-2 font-medium">OMR / {plan.duration}</span>
                    </div>
                    
                    <div className="bg-emerald-50 rounded-xl p-4 mb-8 border border-emerald-100">
                      <p className="text-emerald-800 font-bold text-lg text-center">
                        {plan.discountPercentage}% OFF
                      </p>
                      <p className="text-emerald-600 text-xs text-center mt-1 font-medium">on all services</p>
                    </div>
                    
                    <div className="mt-auto">
                      <button
                        onClick={() => handleBuyPlan(plan)}
                        disabled={isCurrentPlan || buyingPlanId === plan.id}
                        className={`w-full py-4 rounded-xl font-bold transition-all ${
                          isCurrentPlan
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-900 text-white hover:bg-blue-600 shadow-md hover:shadow-xl'
                        }`}
                      >
                        {buyingPlanId === plan.id 
                          ? 'Processing...' 
                          : isCurrentPlan 
                            ? 'Active' 
                            : 'Subscribe Now'}
                      </button>
                    </div>
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

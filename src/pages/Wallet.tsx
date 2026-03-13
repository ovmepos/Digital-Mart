import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { Wallet as WalletIcon, CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const Wallet: React.FC = () => {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    if (amount < 5) {
      setError('Minimum deposit is 5 OMR');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    // Simulate payment gateway delay
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          walletBalance: increment(amount)
        });
        setSuccess(true);
        setAmount(10);
      } catch (err: any) {
        setError('Failed to add funds: ' + err.message);
      } finally {
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          <WalletIcon className="w-8 h-8 mr-3 text-blue-600" />
          My Wallet
        </h1>
        <p className="text-slate-500 mt-2">Manage your funds and add balance to your account.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Balance Card */}
        <div className="md:col-span-1">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
            <div className="relative z-10">
              <p className="text-blue-100 font-medium mb-1">Available Balance</p>
              <h2 className="text-4xl font-bold tracking-tight">
                {profile?.walletBalance?.toFixed(3) || '0.000'} <span className="text-xl font-normal text-blue-200">OMR</span>
              </h2>
              
              <div className="mt-8 pt-6 border-t border-blue-500/30 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-200 uppercase tracking-wider">Account Holder</p>
                  <p className="font-medium truncate max-w-[150px]">{profile?.name}</p>
                </div>
                <WalletIcon className="w-8 h-8 text-blue-300 opacity-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Add Funds Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-slate-400" />
              Add Funds
            </h3>

            {success && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start">
                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-emerald-800">Payment Successful</h4>
                  <p className="text-sm text-emerald-600 mt-1">Your wallet has been credited successfully.</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800">Payment Failed</h4>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleAddFunds}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (OMR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-medium">OMR</span>
                  </div>
                  <input
                    type="number"
                    min="5"
                    step="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="block w-full pl-16 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-colors"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">Minimum deposit amount is 5 OMR.</p>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-2 border-blue-600 bg-blue-50 rounded-xl p-4 cursor-pointer flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-medium text-blue-900">Credit Card</span>
                  </div>
                  <div className="border border-slate-200 hover:border-slate-300 rounded-xl p-4 cursor-not-allowed opacity-60 flex items-center justify-center bg-slate-50">
                    <span className="font-medium text-slate-500">PayPal (Coming Soon)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  `Pay ${amount.toFixed(3)} OMR`
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;

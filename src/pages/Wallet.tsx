import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, collection, runTransaction, serverTimestamp, onSnapshot, query } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { Wallet as WalletIcon, CreditCard, CheckCircle, AlertCircle, Loader2, Building2, MessageCircle, Upload, QrCode } from 'lucide-react';
import { addDoc } from 'firebase/firestore';

const Wallet: React.FC = () => {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState<number>(10);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [gateways, setGateways] = useState<any[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [proofImage, setProofImage] = useState<string>('');
  const [manualPending, setManualPending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'paymentGateways'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gws = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((g: any) => g.isActive);
      setGateways(gws);
      if (gws.length > 0 && !selectedGateway) {
        setSelectedGateway(gws[0].id);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'paymentGateways'));
    return () => unsubscribe();
  }, []);

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    if (amount < 5) {
      setError('Minimum deposit is 5 OMR');
      return;
    }

    if (!selectedGateway) {
      setError('Please select a payment method');
      return;
    }

    if (selectedGateway === 'manual') {
      setLoading(true);
      try {
        await addDoc(collection(db, 'manualTransfers'), {
          userId: user.uid,
          amount: amount,
          proofUrl: proofImage,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        setSuccess(true);
        setManualPending(true);
        setProofImage('');
      } catch (err: any) {
        setError('Failed to submit transfer: ' + err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    // Simulate payment gateway delay (PayPal/Thawani integration would go here)
    setTimeout(async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const newTransactionRef = doc(collection(db, 'transactions'));

        await runTransaction(db, async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists()) throw new Error("User not found");

          const currentBalance = userDoc.data().walletBalance || 0;
          
          transaction.update(userRef, { walletBalance: currentBalance + amount });
          transaction.set(newTransactionRef, {
            userId: user.uid,
            amount: amount,
            type: 'topup',
            description: `Wallet Top-up via ${gateways.find(g => g.id === selectedGateway)?.name || 'Gateway'}`,
            createdAt: serverTimestamp()
          });
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
                {gateways.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No payment gateways available at the moment.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {gateways.map(gw => (
                      <div 
                        key={gw.id}
                        onClick={() => setSelectedGateway(gw.id)}
                        className={`border-2 rounded-xl p-4 cursor-pointer flex items-center justify-center transition-colors ${
                          selectedGateway === gw.id 
                            ? 'border-blue-600 bg-blue-50' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {gw.id === 'paypal' && <WalletIcon className={`w-5 h-5 mr-2 ${selectedGateway === gw.id ? 'text-blue-600' : 'text-slate-500'}`} />}
                        {gw.id === 'thawani' && <CreditCard className={`w-5 h-5 mr-2 ${selectedGateway === gw.id ? 'text-blue-600' : 'text-slate-500'}`} />}
                        {gw.id === 'manual' && <Building2 className={`w-5 h-5 mr-2 ${selectedGateway === gw.id ? 'text-blue-600' : 'text-slate-500'}`} />}
                        <span className={`font-medium ${selectedGateway === gw.id ? 'text-blue-900' : 'text-slate-700'}`}>
                          {gw.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedGateway === 'manual' && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <h4 className="text-sm font-medium text-purple-900 mb-2 flex items-center">
                      <MessageCircle className="w-4 h-4 mr-2" /> Manual Transfer Instructions
                    </h4>
                    <p className="text-sm text-purple-800 whitespace-pre-wrap mb-3">
                      {gateways.find(g => g.id === 'manual')?.config?.instructions}
                    </p>
                    <div className="bg-white p-3 rounded border border-purple-100 mb-3">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Bank Details</p>
                      <p className="text-sm font-mono text-slate-800 whitespace-pre-wrap">
                        {gateways.find(g => g.id === 'manual')?.config?.bankDetails}
                      </p>
                    </div>
                    {gateways.find(g => g.id === 'manual')?.config?.upiId && (
                      <div className="bg-white p-3 rounded border border-purple-100 mb-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">UPI ID</p>
                        <p className="text-sm font-mono text-slate-800">
                          {gateways.find(g => g.id === 'manual')?.config?.upiId}
                        </p>
                      </div>
                    )}

                    {gateways.find(g => g.id === 'manual')?.config?.qrCodeUrl && (
                      <div className="bg-white p-4 rounded border border-purple-100 mb-4 flex flex-col items-center">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Scan QR Code</p>
                        <img 
                          src={gateways.find(g => g.id === 'manual')?.config?.qrCodeUrl} 
                          alt="Payment QR" 
                          className="w-48 h-48 object-contain border rounded p-2"
                        />
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-purple-900 mb-2">
                        Upload Payment Proof (Screenshot)
                      </label>
                      <div className="flex items-center space-x-4">
                        {proofImage && (
                          <img src={proofImage} alt="Proof" className="w-16 h-16 object-cover rounded border" />
                        )}
                        <label className="flex-1 cursor-pointer bg-white border border-purple-200 border-dashed rounded-xl p-4 flex items-center justify-center hover:bg-purple-50 transition-colors">
                          <Upload className="w-5 h-5 text-purple-400 mr-2" />
                          <span className="text-sm text-purple-600 font-medium">
                            {proofImage ? 'Change Screenshot' : 'Upload Screenshot'}
                          </span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const MAX_WIDTH = 800;
                                  const MAX_HEIGHT = 800;
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
                                  setProofImage(canvas.toDataURL('image/jpeg', 0.6));
                                };
                                img.src = event.target?.result as string;
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <a 
                        href={`https://wa.me/${gateways.find(g => g.id === 'manual')?.config?.whatsappNumber}?text=${encodeURIComponent(`Hello, I've just submitted a manual transfer of ${amount} OMR. My User ID is: ${user?.uid}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 flex items-center"
                      >
                        <MessageCircle className="w-3 h-3 mr-1" /> Need help? Contact WhatsApp
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || gateways.length === 0 || (selectedGateway === 'manual' && !proofImage)}
                className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  selectedGateway === 'manual' ? 'Submit Payment Proof' : `Pay ${amount.toFixed(3)} OMR`
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

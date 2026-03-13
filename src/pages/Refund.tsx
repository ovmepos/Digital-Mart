import React from 'react';
import { RefreshCcw } from 'lucide-react';

const Refund: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mr-4">
              <RefreshCcw className="w-6 h-6 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Refund Policy</h1>
          </div>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Eligibility for Refunds</h3>
            <p className="text-slate-600 mb-6">Refunds are only issued if an order fails to deliver within the specified timeframe or if there is a technical error on our end that prevents the service from being fulfilled.</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. Non-Refundable Services</h3>
            <p className="text-slate-600 mb-6">Once an order has been successfully delivered and the service has been rendered, it is strictly non-refundable. Please ensure all links and details are correct before placing an order.</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Wallet Balance</h3>
            <p className="text-slate-600 mb-6">Funds deposited into your Digital Mart wallet are final and cannot be withdrawn or refunded to your original payment method. They can only be used to purchase services on our platform.</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Dispute Resolution</h3>
            <p className="text-slate-600 mb-6">If you experience an issue with an order, please contact our support team within 48 hours of the order completion date to seek a resolution.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Refund;

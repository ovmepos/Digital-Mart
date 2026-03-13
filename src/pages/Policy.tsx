import React from 'react';
import { Shield } from 'lucide-react';

const Policy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
          </div>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Information We Collect</h3>
            <p className="text-slate-600 mb-6">We collect information you provide directly to us when you create an account, make a purchase, or contact us for support. This may include your name, email address, and payment information.</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. How We Use Your Information</h3>
            <p className="text-slate-600 mb-6">We use the information we collect to provide, maintain, and improve our services, process transactions, and send you related information including confirmations and receipts.</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Information Sharing</h3>
            <p className="text-slate-600 mb-6">We do not share your personal information with third parties except as necessary to provide our services (e.g., payment processors) or when required by law.</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Data Security</h3>
            <p className="text-slate-600 mb-6">We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Policy;

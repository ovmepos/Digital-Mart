import React from 'react';
import { FileText } from 'lucide-react';

const Rules: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12">
          <div className="flex items-center mb-8">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mr-4">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Terms & Rules</h1>
          </div>
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-500 mb-6">Last updated: {new Date().toLocaleDateString()}</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Account Usage</h3>
            <p className="text-slate-600 mb-6">You are responsible for maintaining the confidentiality of your account credentials. Any activity that occurs under your account is your responsibility.</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. Prohibited Content</h3>
            <p className="text-slate-600 mb-6">You may not use our services for any illegal, unauthorized, or malicious purposes. This includes, but is not limited to, promoting hate speech, violence, or explicit content.</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Service Guarantees</h3>
            <p className="text-slate-600 mb-6">While we strive to provide the highest quality services, we do not guarantee exact delivery times or specific engagement metrics beyond what is explicitly stated in the service description.</p>
            
            <h3 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Account Termination</h3>
            <p className="text-slate-600 mb-6">We reserve the right to suspend or terminate your account at any time if we suspect a violation of these rules or any fraudulent activity.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules;

import React from 'react';
import { Instagram, Twitter, Linkedin, Facebook, Globe, Mail, MapPin, CheckCircle, ExternalLink } from 'lucide-react';

const BusinessProfile: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
          <div className="h-48 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>
          <div className="px-8 pb-8 relative">
            <div className="w-32 h-32 bg-white rounded-full p-2 absolute -top-16 shadow-lg border border-slate-100">
              <div className="w-full h-full bg-blue-50 rounded-full flex items-center justify-center overflow-hidden">
                <Globe className="w-12 h-12 text-blue-600" />
              </div>
            </div>
            
            <div className="mt-20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center">
                  Digital Mart
                  <CheckCircle className="w-6 h-6 text-blue-500 ml-2" />
                </h1>
                <p className="text-lg text-slate-500 mt-1">Premium Digital Growth Agency</p>
                
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-600">
                  <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-slate-400" /> Global Operations</span>
                  <span className="flex items-center"><Mail className="w-4 h-4 mr-1.5 text-slate-400" /> ovmepos@gmail.com</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                <a href="mailto:ovmepos@gmail.com" className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main Bio Content */}
          <div className="md:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">About the Business</h2>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 leading-relaxed mb-4">
                  Digital Mart is a leading digital growth agency specializing in social media enhancement and online presence optimization. Founded with the vision of helping creators, influencers, and businesses scale their digital footprint, we provide secure, fast, and reliable services.
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Our team of experts works tirelessly to ensure that our clients receive the highest quality engagement, followers, and digital marketing solutions available in the market. We believe in building long-term relationships through transparency, quality, and exceptional customer support.
                </p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-100">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">50K+</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Orders</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">10K+</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Clients</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">99%</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Satisfaction</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">24/7</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Support</div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links Sidebar */}
          <div className="md:col-span-1 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Official Links</h2>
              <div className="space-y-3">
                
                {/* Instagram */}
                <a href="#" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-pink-200 transition-all group">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center text-pink-600 group-hover:bg-pink-100 mr-3 transition-colors">
                      <Instagram className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">Instagram</div>
                      <div className="text-xs text-slate-500">@digitalmart</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-pink-500" />
                </a>

                {/* Twitter */}
                <a href="#" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-400 group-hover:bg-blue-100 mr-3 transition-colors">
                      <Twitter className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">Twitter / X</div>
                      <div className="text-xs text-slate-500">@digitalmart_hq</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-400" />
                </a>

                {/* LinkedIn */}
                <a href="#" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all group">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-700 group-hover:bg-blue-100 mr-3 transition-colors">
                      <Linkedin className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">LinkedIn</div>
                      <div className="text-xs text-slate-500">Digital Mart</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-700" />
                </a>

                {/* Facebook */}
                <a href="#" className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 mr-3 transition-colors">
                      <Facebook className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">Facebook</div>
                      <div className="text-xs text-slate-500">Digital Mart Official</div>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-600" />
                </a>

              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default BusinessProfile;

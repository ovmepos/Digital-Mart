import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, Zap, BarChart3, ShoppingBag, ArrowRight, Star, TrendingUp, Crown, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=2574&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-24 pb-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-sm font-semibold mb-6 border border-blue-500/30">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
              The #1 Digital Social Media Solutions
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
              Scale your digital <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">presence</span> instantly.
            </h1>
            <p className="text-xl text-slate-300 mb-10 leading-relaxed">
              Browse our catalog of premium digital growth services. From social media boosting to advanced analytics, get everything you need in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/services" 
                className="inline-flex justify-center items-center px-8 py-4 border border-transparent text-base font-bold rounded-xl text-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-lg shadow-white/10"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Start Shopping
              </Link>
              <Link 
                to="/ig-store" 
                className="inline-flex justify-center items-center px-8 py-4 border border-slate-700 text-base font-bold rounded-xl text-white hover:bg-slate-800 transition-colors"
              >
                Explore IG Store
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Categories Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 md:p-8 flex flex-wrap justify-center md:justify-between gap-8">
          {[
            { name: 'Instagram', icon: '📸', color: 'bg-pink-100 text-pink-600' },
            { name: 'YouTube', icon: '▶️', color: 'bg-red-100 text-red-600' },
            { name: 'TikTok', icon: '🎵', color: 'bg-slate-100 text-slate-900' },
            { name: 'Twitter', icon: '🐦', color: 'bg-blue-100 text-blue-500' },
            { name: 'Traffic', icon: '🌐', color: 'bg-emerald-100 text-emerald-600' },
          ].map((cat, i) => (
            <Link key={i} to="/services" className="flex flex-col items-center group cursor-pointer">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-3 ${cat.color} group-hover:scale-110 transition-transform shadow-sm`}>
                {cat.icon}
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Platform Navigation Section - New for Full Customization */}
      <div className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Explore Our Platform</h2>
            <p className="text-slate-600">Everything you need to manage and grow your digital assets.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { name: 'Shop', path: '/services', icon: <ShoppingBag className="w-6 h-6" />, desc: 'Browse Services', color: 'bg-blue-50 text-blue-600' },
              { name: 'Plans', path: '/plans', icon: <Crown className="w-6 h-6" />, desc: 'Subscription Deals', color: 'bg-emerald-50 text-emerald-600' },
              { name: 'Dashboard', path: '/dashboard', icon: <BarChart3 className="w-6 h-6" />, desc: 'Track Orders', color: 'bg-indigo-50 text-indigo-600' },
              { name: 'IG Store', path: '/ig-store', icon: <Star className="w-6 h-6" />, desc: 'Instagram Specials', color: 'bg-pink-50 text-pink-600' },
              { name: 'Wishlist', path: '/wishlist', icon: <Star className="w-6 h-6" />, desc: 'Saved Items', color: 'bg-amber-50 text-amber-600' },
              { name: 'Profile', path: '/profile/settings', icon: <Shield className="w-6 h-6" />, desc: 'Account Settings', color: 'bg-slate-50 text-slate-600' },
              { name: 'Wallet', path: '/wallet', icon: <Wallet className="w-6 h-6" />, desc: 'Manage Funds', color: 'bg-cyan-50 text-cyan-600' },
              { name: 'Admin', path: '/admin', icon: <Shield className="w-6 h-6" />, desc: 'Management', color: 'bg-red-50 text-red-600', adminOnly: true },
            ].filter(item => !item.adminOnly || profile?.role === 'admin').map((item, i) => (
              <Link 
                key={i} 
                to={item.path}
                className="group p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-center flex flex-col items-center"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${item.color} group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{item.name}</h3>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Trending Products Section */}
      <div className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2 flex items-center">
                <TrendingUp className="w-8 h-8 mr-3 text-blue-600" /> Trending Products
              </h2>
              <p className="text-slate-600 text-lg">Our most popular digital growth packages this week.</p>
            </div>
            <Link to="/services" className="hidden md:flex items-center text-blue-600 font-bold hover:text-blue-700">
              View All Catalog <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Premium IG Followers', cat: 'Instagram', price: '1.500', img: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&h=300&fit=crop' },
              { name: 'High Retention Views', cat: 'YouTube', price: '2.200', img: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=400&h=300&fit=crop' },
              { name: 'Viral TikTok Likes', cat: 'TikTok', price: '0.800', img: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?q=80&w=400&h=300&fit=crop' },
              { name: 'Targeted Web Traffic', cat: 'Traffic', price: '3.500', img: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?q=80&w=400&h=300&fit=crop' },
            ].map((prod, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-all group">
                <div className="h-40 overflow-hidden relative">
                  <img src={prod.img} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-white/90 backdrop-blur-sm text-slate-900 shadow-sm">
                      {prod.cat}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center mb-2">
                    <div className="flex text-yellow-400 text-sm">
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 line-clamp-1">{prod.name}</h3>
                  <div className="flex items-end justify-between pt-4 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 font-medium mb-1">Starting from</p>
                      <p className="text-lg font-extrabold text-blue-600">{prod.price} <span className="text-xs font-medium text-slate-500">OMR</span></p>
                    </div>
                    <Link to="/services" className="w-10 h-10 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
                      <ShoppingBag className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center md:hidden">
            <Link to="/services" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700">
              View All Catalog <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Shop With Digital Mart?</h2>
            <p className="text-slate-600 text-lg">We provide industry-leading solutions to help you scale your digital footprint efficiently and securely.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center"
            >
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Delivery</h3>
              <p className="text-slate-600">Our automated systems ensure your orders start processing the moment you checkout.</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center"
            >
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure Checkout</h3>
              <p className="text-slate-600">Your payments and data are protected with enterprise-grade security and encryption.</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center"
            >
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Real-time Tracking</h3>
              <p className="text-slate-600">Monitor your order progress in real-time through your personalized dashboard.</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to transform your digital presence?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto text-lg">Join thousands of professionals who trust Digital Mart for their growth needs.</p>
          <Link 
            to="/login" 
            className="inline-flex justify-center items-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-blue-600 bg-white hover:bg-slate-50 transition-colors shadow-lg"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;

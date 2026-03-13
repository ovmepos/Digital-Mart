import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Shield, Clock, BarChart3, Globe } from 'lucide-react';
import { motion } from 'motion/react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551434678-e076c223a692?q=80&w=2850&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
              Accelerate Your <span className="text-blue-500">Digital Growth</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed">
              Premium digital services designed to elevate your online presence. Fast delivery, secure transactions, and unparalleled quality for creators and brands.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/login" 
                className="inline-flex justify-center items-center px-8 py-3.5 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Get Started <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link 
                to="/services" 
                className="inline-flex justify-center items-center px-8 py-3.5 border border-slate-700 text-base font-medium rounded-lg text-slate-200 bg-slate-800/50 hover:bg-slate-800 transition-colors backdrop-blur-sm"
              >
                View Services
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Choose Digital Mart?</h2>
            <p className="text-slate-600 text-lg">We provide industry-leading solutions to help you scale your digital footprint efficiently and securely.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Lightning Fast</h3>
              <p className="text-slate-600 leading-relaxed">Automated processing ensures your orders begin instantly. Experience rapid delivery without compromising on quality.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-emerald-600">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure & Private</h3>
              <p className="text-slate-600 leading-relaxed">Your data and transactions are protected with enterprise-grade security. We never ask for your passwords.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6 text-indigo-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Real-time Analytics</h3>
              <p className="text-slate-600 leading-relaxed">Track your orders and monitor your growth through our intuitive, real-time customer dashboard.</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-extrabold text-blue-600 mb-2">10k+</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-blue-600 mb-2">5M+</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">Orders Completed</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-blue-600 mb-2">99.9%</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-extrabold text-blue-600 mb-2">24/7</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wide">Support</div>
            </div>
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
            className="inline-flex justify-center items-center px-8 py-3.5 border border-transparent text-base font-bold rounded-lg text-blue-600 bg-white hover:bg-slate-50 transition-colors shadow-lg"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;

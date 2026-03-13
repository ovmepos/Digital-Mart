import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Search, Filter, CheckCircle2 } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  category: string;
  pricePer1000: number;
  minQuantity: number;
  maxQuantity: number;
  description: string;
}

const Services: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const q = query(collection(db, 'services'), where('isActive', '==', true));
        const snapshot = await getDocs(q);
        const svcs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setServices(svcs);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Our Services</h1>
          <p className="text-lg text-slate-600">
            Explore our comprehensive suite of digital growth services. Transparent pricing, exceptional quality.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search services..."
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <Filter className="h-5 w-5 text-slate-400 mr-3 flex-shrink-0" />
            <div className="flex space-x-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-500 text-lg">No services found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {service.category}
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {service.pricePer1000.toFixed(3)} <span className="text-sm font-normal text-slate-500">OMR / 1k</span>
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{service.name}</h3>
                  <p className="text-slate-600 text-sm mb-6 line-clamp-3">{service.description}</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center text-sm text-slate-500">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                      Min Order: <span className="font-medium text-slate-900 ml-1">{service.minQuantity.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center text-sm text-slate-500">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                      Max Order: <span className="font-medium text-slate-900 ml-1">{service.maxQuantity.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                  <a 
                    href="/login" 
                    className="block w-full text-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                  >
                    Order Now
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Globe, Mail, MapPin, UserCircle, ExternalLink, ShieldCheck, Instagram, Facebook, Twitter, Youtube, Link as LinkIcon } from 'lucide-react';

const SocialLink = ({ url, platform, icon: Icon }: { url: string, platform: string, icon: any }) => {
  const [imgError, setImgError] = useState(false);

  const getAvatarUrl = () => {
    try {
      const urlObj = new URL(url);
      let username = '';
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (platform === 'instagram' || platform === 'twitter' || platform === 'facebook') {
        username = pathParts[0];
      } else if (platform === 'tiktok') {
        username = pathParts[0]?.startsWith('@') ? pathParts[0] : '';
      } else if (platform === 'youtube') {
        if (pathParts[0]?.startsWith('@')) username = pathParts[0];
        else if (pathParts[0] === 'c' || pathParts[0] === 'user') username = pathParts[1];
      }
      
      if (username) {
        return `https://unavatar.io/${platform}/${username}?fallback=false`;
      }
      return `https://unavatar.io/${urlObj.hostname}?fallback=false`;
    } catch (e) {
      return null;
    }
  };

  const avatarUrl = getAvatarUrl();

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group">
      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-4 group-hover:text-blue-600 overflow-hidden">
        {avatarUrl && !imgError ? (
          <img 
            src={avatarUrl} 
            alt={platform} 
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{platform}</p>
        <p className="text-sm font-medium text-slate-900 truncate">{url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</p>
      </div>
      <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0 text-slate-400 group-hover:text-blue-600" />
    </a>
  );
};

const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const q = query(collection(db, 'businessProfiles'), where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setError('Profile not found');
        } else {
          setProfile(querySnapshot.docs[0].data());
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError('Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    if (username) {
      fetchProfile();
    }
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <UserCircle className="w-24 h-24 text-slate-300 mb-4" />
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Profile Not Found</h1>
        <p className="text-slate-500 mb-8">The business profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 relative">
          {/* Cover Area */}
          <div className="h-32 sm:h-48 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
            <div className="absolute inset-0 bg-white/10 pattern-grid-lg"></div>
          </div>
          
          <div className="px-6 sm:px-10 pb-8">
            <div className="relative flex justify-between items-end -mt-16 sm:-mt-20 mb-6">
              <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center">
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt={profile.businessName} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle className="h-20 w-20 text-slate-300" />
                )}
              </div>
              <div className="pb-4 hidden sm:block">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-4 h-4 mr-1" /> Verified Partner
                </span>
              </div>
            </div>

            <div className="mt-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                {profile.businessName}
              </h1>
              <p className="text-lg text-blue-600 font-medium mt-1">
                @{profile.username}
              </p>
            </div>

            {profile.bio && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">About Us</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.contactEmail && (
                <a href={`mailto:${profile.contactEmail}`} className="flex items-center p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-4 group-hover:text-blue-600">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{profile.contactEmail}</p>
                  </div>
                </a>
              )}
              
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mr-4 group-hover:text-blue-600">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Website</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{profile.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0 text-slate-400 group-hover:text-blue-600" />
                </a>
              )}

              {profile.instagram && <SocialLink url={profile.instagram} platform="instagram" icon={Instagram} />}
              {profile.facebook && <SocialLink url={profile.facebook} platform="facebook" icon={Facebook} />}
              {profile.tiktok && <SocialLink url={profile.tiktok} platform="tiktok" icon={LinkIcon} />}
              {profile.twitter && <SocialLink url={profile.twitter} platform="twitter" icon={Twitter} />}
              {profile.youtube && <SocialLink url={profile.youtube} platform="youtube" icon={Youtube} />}
            </div>

          </div>
        </div>
        
        {/* Call to Action */}
        <div className="mt-8 text-center">
          <Link to="/services" className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5">
            View Our Services
          </Link>
        </div>

      </div>
    </div>
  );
};

export default PublicProfile;

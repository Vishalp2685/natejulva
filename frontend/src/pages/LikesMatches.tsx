import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Heart, HeartHandshake, Smile, 
  MapPin, CheckCircle, MessageCircleHeart, Info,
  ChevronLeft, Send, Clock, Check, CheckCheck, MessageSquare, Sparkles, Bell
} from 'lucide-react';
import { API_URL } from '../config';

interface PublicProfile {
  id: number;
  user: {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    age: number;
    gender: string;
  };
  height: string;
  religion: string;
  caste: string;
  marital_status: string;
  city: string;
  education: string;
  occupation: string;
  about_me: string;
  profile_photo: string | null;
}

interface Message {
  id: number;
  sender: number;
  sender_name: string;
  receiver: number;
  receiver_name: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

interface Conversation {
  profile: PublicProfile;
  last_message: Message | null;
  unread_count: number;
}

export const LikesMatches: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { cachedFetch, invalidateKey } = useCache();

  // Loading states per tab
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingSent, setLoadingSent] = useState(false);
  const [loadingReceived, setLoadingReceived] = useState(false);

  // Tab specific lists
  const [matchesList, setMatchesList] = useState<Conversation[]>([]);
  const [sentList, setSentList] = useState<PublicProfile[]>([]);
  const [receivedList, setReceivedList] = useState<PublicProfile[]>([]);

  // Pull-to-refresh drag states
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'matches' | 'received' | 'sent'>('matches');
  const [loading, setLoading] = useState(true);
  const [likedProfiles, setLikedProfiles] = useState<PublicProfile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Chat Integrated States
  const [selectedChatProfile, setSelectedChatProfile] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // F8: Track previous message count to only auto-scroll on new messages
  const prevMessageCount = useRef(0);
  // F6: Stable scalar dependency for chat polling
  const selectedPartnerId = selectedChatProfile?.user.id ?? null;

  const [viewportHeight, setViewportHeight] = useState(window.visualViewport ? window.visualViewport.height : window.innerHeight);

  const fetchAllData = async (forceRefreshTab?: 'matches' | 'received' | 'sent') => {
    if (forceRefreshTab) {
      if (forceRefreshTab === 'matches') setLoadingMatches(true);
      if (forceRefreshTab === 'received') setLoadingReceived(true);
      if (forceRefreshTab === 'sent') setLoadingSent(true);
    } else {
      setLoading(true);
    }

    try {
      const headers = { 'Authorization': `Token ${token}` };

      const fetchTab = async (tab: 'matches' | 'received' | 'sent', endpoint: string) => {
        try {
          const { data, ok } = await cachedFetch(endpoint, { headers });
          if (ok && data) {
            // F9: Removed sessionStorage caching — rely on CacheContext
            if (tab === 'matches') {
              setMatchesList(data);
              setConversations(data);
            } else if (tab === 'received') {
              setReceivedList(data);
              if (activeTab === 'received') setLikedProfiles(data);
            } else if (tab === 'sent') {
              setSentList(data);
              if (activeTab === 'sent') setLikedProfiles(data);
            }
          }
        } catch (err) {
          console.error(`Failed to fetch ${tab}`, err);
        }
      };

      if (forceRefreshTab) {
        let endpoint = '';
        if (forceRefreshTab === 'matches') endpoint = `${API_URL}/api/profiles/chat/conversations/`;
        else if (forceRefreshTab === 'received') endpoint = `${API_URL}/api/profiles/likes-received/`;
        else if (forceRefreshTab === 'sent') endpoint = `${API_URL}/api/profiles/likes-sent/`;
        await fetchTab(forceRefreshTab, endpoint);
      } else {
        // F2: Only fetch the active tab on initial load, not all 3
        let endpoint = '';
        if (activeTab === 'matches') endpoint = `${API_URL}/api/profiles/chat/conversations/`;
        else if (activeTab === 'received') endpoint = `${API_URL}/api/profiles/likes-received/`;
        else if (activeTab === 'sent') endpoint = `${API_URL}/api/profiles/likes-sent/`;
        await fetchTab(activeTab, endpoint);
      }
    } catch (err) {
      console.error("Failed to fetch matches data", err);
    } finally {
      setLoading(false);
      setLoadingMatches(false);
      setLoadingSent(false);
      setLoadingReceived(false);
    }
  };

  // F2: Lazy-load tab data when switching tabs
  const handleTabChange = (tab: 'matches' | 'received' | 'sent') => {
    setActiveTab(tab);
    setSuccessMessage(null);
    setSelectedChatProfile(null);

    if (tab === 'matches') {
      if (matchesList.length > 0) {
        setConversations(matchesList);
      } else {
        fetchAllData('matches');
      }
    } else if (tab === 'received') {
      if (receivedList.length > 0) {
        setLikedProfiles(receivedList);
      } else {
        fetchAllData('received');
      }
    } else if (tab === 'sent') {
      if (sentList.length > 0) {
        setLikedProfiles(sentList);
      } else {
        fetchAllData('sent');
      }
    }
  };

  // Touch Handlers for mobile pull-to-refresh
  const handleTouchStart = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      const maxDrag = 80;
      const elasticDrag = Math.min(diff * 0.4, maxDrag);
      setDragY(elasticDrag);
      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setDragY(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY >= 40) {
      let endpoint = '';
      if (activeTab === 'matches') endpoint = `${API_URL}/api/profiles/chat/conversations/`;
      else if (activeTab === 'received') endpoint = `${API_URL}/api/profiles/likes-received/`;
      else if (activeTab === 'sent') endpoint = `${API_URL}/api/profiles/likes-sent/`;
      
      if (endpoint) {
        invalidateKey(endpoint);
      }
      fetchAllData(activeTab);
    }
    setDragY(0);
  };

  // F9: Removed sessionStorage caching — just fetch fresh data
  useEffect(() => {
    if (!token) {
      navigate('/register?tab=login');
      return;
    }
    fetchAllData();
  }, [token]);

  useEffect(() => {
    if (!window.visualViewport) return;
    
    const handleResize = () => {
      setViewportHeight(window.visualViewport!.height);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport!.removeEventListener('resize', handleResize);
      window.visualViewport!.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Scroll to bottom when keyboard opens/closes
  useEffect(() => {
    if (selectedChatProfile && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [viewportHeight]);

  // F1: Reduced polling from 6s to 15s, pauses when tab hidden
  useEffect(() => {
    if (!token || activeTab !== 'matches' || selectedPartnerId) return;

    let interval: ReturnType<typeof setInterval>;

    const startPolling = () => {
      interval = setInterval(fetchLikesDataSilently, 15000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchLikesDataSilently();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token, activeTab, selectedPartnerId]);

  // F1 + F6: Reduced from 3.5s to 8s, uses stable scalar dep, pauses on hidden
  useEffect(() => {
    if (!token || !selectedPartnerId) return;
    
    fetchMessages(selectedPartnerId, false);
    
    let interval: ReturnType<typeof setInterval>;

    const startPolling = () => {
      interval = setInterval(() => fetchMessages(selectedPartnerId, false), 8000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchMessages(selectedPartnerId, false);
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [token, selectedPartnerId]);

  // F8: Only scroll when new messages arrive, not on every poll cycle
  useEffect(() => {
    if (selectedChatProfile && messages.length > prevMessageCount.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCount.current = messages.length;
  }, [messages, selectedChatProfile]);

  // F5: Use cachedFetch-compatible approach for silent polling
  const fetchLikesDataSilently = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/profiles/chat/conversations/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setConversations(data);
        setMatchesList(data);
      }
    } catch (err) {
      console.error("Failed to silently load connections list", err);
    }
  };

  const fetchMessages = async (partnerId: number, showLoadingIndicator: boolean) => {
    if (showLoadingIndicator) setMessagesLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/profiles/chat/${partnerId}/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    } finally {
      if (showLoadingIndicator) setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChatProfile || sendLoading) return;

    const messageContent = inputText.trim();
    setInputText('');
    setSendLoading(true);

    try {
      const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/chat/${selectedChatProfile.user.id}/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}` 
        },
        body: JSON.stringify({ content: messageContent })
      });
      
      if (ok && data) {
        setMessages(prev => [...prev, data]);
        fetchLikesDataSilently();
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSendLoading(false);
    }
  };

  const handleLikeBack = async (profileId: number, name: string) => {
    setSuccessMessage(null);
    try {
      const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/like/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}` 
        },
        body: JSON.stringify({ receiver_id: profileId })
      });
      
      if (ok && data) {
        if (data.mutual_match) {
          setSuccessMessage(`It's a Connection! You and ${name} are now connected! Go to the 'Mutual Connections' tab to celebrate.`);
          
          const newReceived = receivedList.filter(p => p.user.id !== profileId);
          setReceivedList(newReceived);
          setLikedProfiles(newReceived);
          fetchAllData('matches');

          alert(`Congratulations! You have connected with ${name}!`);
        }
      }
    } catch (err) {
      console.error("Could not connect to backend to connect back", err);
    }
  };

  const handleUnmatch = async (profileId: number, name: string) => {
    const confirmUnmatch = window.confirm(`Are you sure you want to unmatch with ${name}? This will remove your connection and delete your chat history.`);
    if (!confirmUnmatch) return;

    try {
      const { ok } = await cachedFetch(`${API_URL}/api/profiles/unmatch/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}` 
        },
        body: JSON.stringify({ receiver_id: profileId })
      });
      
      if (ok) {
        alert(`You have successfully unmatched with ${name}.`);
        setSelectedChatProfile(null); // Close active chat thread if open
        
        const newMatches = matchesList.filter(c => c.profile.user.id !== profileId);
        setMatchesList(newMatches);
        setConversations(newMatches);
      } else {
        alert("Failed to unmatch. Please try again.");
      }
    } catch (err) {
      console.error("Failed to unmatch profile", err);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  
  const renderCards = (isMobile = false) => {
    return (
      <div className={isMobile ? '' : 'grid-cols-3'} style={{ display: isMobile ? 'flex' : undefined, flexDirection: isMobile ? 'column' : undefined, gap: isMobile ? '1.5rem' : '2rem', width: '100%' }}>
        {activeTab === 'matches' ? (
              conversations.map((c) => {
                const profile = c.profile;
                const fullName = `${profile.user.first_name} ${profile.user.last_name}`;
                return (
                  <div 
                    key={profile.user.id}
                    className="premium-card animate-fade-in"
                    style={{ 
                      padding: 0, 
                      borderRadius: '24px', 
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '430px'
                    }}
                  >
                    {/* Photo container banner */}
                    <div style={{ 
                      height: '160px', 
                      position: 'relative', 
                      background: 'linear-gradient(135deg, var(--primary-burgundy) 0%, #D4A373 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {profile.profile_photo ? (
                        <img 
                          src={`${profile.profile_photo}`} 
                          alt={fullName} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ fontSize: '3.5rem', fontFamily: 'var(--font-serif)', color: '#FFFDF9', opacity: 0.9, fontWeight: 700 }}>
                          {getInitials(profile.user.first_name, profile.user.last_name)}
                        </div>
                      )}

                      {/* Unread Message count Badge overlay */}
                      {c.unread_count > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '1rem',
                          left: '1rem',
                          backgroundColor: 'var(--primary-burgundy)',
                          color: 'var(--white)',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                          border: '1.5px solid var(--white)'
                        }}>
                          {c.unread_count} New Message
                        </div>
                      )}
                    </div>

                    {/* Body Details Info */}
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-dark)', margin: 0 }}>
                              {fullName}
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <MapPin size={11} /> {profile.city}
                            </span>
                          </div>
                          <span className="badge-premium" style={{ fontSize: '0.65rem', background: 'var(--accent-success)', color: 'var(--accent-success-text)', border: 'none' }}>
                            Connected
                          </span>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(128,10,63,0.05)', paddingTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block' }}>Age / Height</span>
                            <strong style={{ fontWeight: 600 }}>{profile.user.age} yrs / {profile.height}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block' }}>Religion</span>
                            <strong style={{ fontWeight: 600 }}>{profile.religion}</strong>
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block' }}>Profession</span>
                          <strong style={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile.occupation || "Not specified"}
                          </strong>
                        </div>

                        {/* Last Message Preview box */}
                        {c.last_message && (
                          <div style={{
                            backgroundColor: 'rgba(128,10,63,0.02)',
                            borderRadius: '12px',
                            padding: '0.5rem 0.75rem',
                            border: '1px solid rgba(128,10,63,0.03)',
                            marginTop: '0.2rem',
                            fontSize: '0.78rem'
                          }}>
                            <span style={{ color: 'var(--text-light)', display: 'block', fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.1rem' }}>Last Message</span>
                            <p style={{ margin: 0, color: 'var(--text-medium)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.last_message.content}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Bottom action buttons */}
                      <div style={{ marginTop: 'auto', paddingTop: '1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            onClick={() => navigate(`/search`)} 
                            className="btn btn-outline"
                            style={{ flex: 1, padding: '0.65rem', borderRadius: '12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                          >
                            <Info size={13} />
                            Bio
                          </button>
                          <button 
                            onClick={() => {
                              navigate('/chats', { state: { chatProfile: profile } });
                            }}
                            className="btn btn-primary"
                            style={{ flex: 1.5, padding: '0.65rem', borderRadius: '12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}
                          >
                            <MessageSquare size={13} fill="#FFF" />
                            Chat Now
                          </button>
                        </div>
                        <button
                          onClick={() => handleUnmatch(profile.user.id, fullName)}
                          className="btn-text"
                          style={{ fontSize: '0.75rem', color: '#B23B44', marginTop: '0.6rem', width: '100%', textAlign: 'center', fontWeight: 600 }}
                        >
                          Unmatch Partner
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              likedProfiles.map((profile) => {
                const fullName = `${profile.user.first_name} ${profile.user.last_name}`;
                return (
                  <div 
                    key={profile.user.id}
                    className="premium-card animate-fade-in"
                    style={{ 
                      padding: 0, 
                      borderRadius: '24px', 
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: '410px'
                    }}
                  >
                    {/* Photo container banner */}
                    <div style={{ 
                      height: '160px', 
                      position: 'relative', 
                      background: 'linear-gradient(135deg, var(--primary-burgundy) 0%, #D4A373 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {profile.profile_photo ? (
                        <img 
                          src={`${profile.profile_photo}`} 
                          alt={fullName} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ fontSize: '3.5rem', fontFamily: 'var(--font-serif)', color: '#FFFDF9', opacity: 0.9, fontWeight: 700 }}>
                          {getInitials(profile.user.first_name, profile.user.last_name)}
                        </div>
                      )}
                    </div>

                    {/* Body Details Info */}
                    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: 'var(--text-dark)', margin: 0 }}>
                              {fullName}
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <MapPin size={11} /> {profile.city}
                            </span>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(128,10,63,0.05)', paddingTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block' }}>Age / Height</span>
                            <strong style={{ fontWeight: 600 }}>{profile.user.age} yrs / {profile.height}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block' }}>Religion</span>
                            <strong style={{ fontWeight: 600 }}>{profile.religion}</strong>
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-light)', textTransform: 'uppercase', display: 'block' }}>Profession</span>
                          <strong style={{ fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {profile.occupation || "Not specified"}
                          </strong>
                        </div>
                      </div>

                      {/* Bottom action buttons */}
                      <div style={{ marginTop: 'auto', paddingTop: '1.25rem' }}>
                        
                        {activeTab === 'received' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.78rem', color: '#B23B44', fontWeight: 600, backgroundColor: 'var(--accent-pink)', padding: '0.4rem', borderRadius: '10px' }}>
                              {profile.user.first_name} requested a connection! Connect back.
                            </span>
                            <button 
                              onClick={() => handleLikeBack(profile.user.id, fullName)}
                              className="btn btn-primary"
                              style={{ width: '100%', padding: '0.65rem', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                            >
                              <HeartHandshake size={14} fill="#FFF" />
                              Accept Request & Connect
                            </button>
                          </div>
                        )}

                        {activeTab === 'sent' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 500 }}>
                              Connection request pending...
                            </span>
                            <button 
                              onClick={() => navigate(`/search`)}
                              className="btn btn-outline"
                              style={{ width: '100%', padding: '0.65rem', borderRadius: '12px', fontSize: '0.85rem' }}
                            >
                              View Bio
                            </button>
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })
            )}
      </div>
    );
  };


  const renderChatBox = (isMobile: boolean = false) => {
    if (!selectedChatProfile) return null;
    const partnerName = `${selectedChatProfile.user.first_name} ${selectedChatProfile.user.last_name}`;
    
    return (
      <div className={isMobile ? "animate-fade-in" : "premium-card animate-fade-in"} style={{ 
        padding: 0, 
        borderRadius: isMobile ? '0' : '24px', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        height: isMobile ? '100%' : '600px',
        backgroundColor: 'var(--white)',
        border: isMobile ? 'none' : '1px solid rgba(128,10,63,0.03)',
        boxShadow: isMobile ? 'none' : 'var(--card-shadow)',
        marginBottom: isMobile ? '0' : '2rem'
      }}>
        {/* Chat header */}
        <div style={{
          padding: isMobile ? '10px 16px' : '1.25rem 2rem',
          borderBottom: '1px solid rgba(128,10,63,0.06)',
          backgroundColor: '#FFFDF9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setSelectedChatProfile(null)}
              className="btn-text"
              style={{ padding: 0, display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--primary-burgundy)', fontWeight: 700 }}
            >
              <ChevronLeft size={16} /> Connections
            </button>
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(128,10,63,0.1)' }}></div>
            
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: 'var(--white)',
              border: '1px solid rgba(128,10,63,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {selectedChatProfile.profile_photo ? (
                <img src={`${selectedChatProfile.profile_photo}`} alt={partnerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-burgundy)' }}>
                  {getInitials(selectedChatProfile.user.first_name, selectedChatProfile.user.last_name)}
                </div>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                {partnerName}
              </h3>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="badge-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(212, 163, 115, 0.08)', border: 'none', color: '#8c6031', fontSize: '0.7rem', padding: '3px 8px' }}>
              <Sparkles size={11} fill="#D4A373" /> Verified Partner
            </div>
            <button
              onClick={() => handleUnmatch(selectedChatProfile.user.id, partnerName)}
              className="btn btn-outline"
              style={{ padding: '0.35rem 0.8rem', borderRadius: '10px', fontSize: '0.75rem', color: '#B23B44', border: '1px solid rgba(178,59,68,0.2)', backgroundColor: 'var(--white)' }}
            >
              Unmatch
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#FDFBF7'
        }}>
          {messagesLoading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-light)', padding: '2rem', fontSize: '0.9rem' }}>
              Loading message thread...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)', opacity: 0.8 }}>
              <MessageSquare size={36} style={{ strokeWidth: 1, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.85rem' }}>No messages exchanged yet.</p>
              <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem' }}>Break the ice! Send a message to start conversation.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isSentByMe = msg.sender !== selectedChatProfile.user.id;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isSentByMe ? 'flex-end' : 'flex-start',
                    maxWidth: '70%',
                    animation: 'fade-in 0.3s ease'
                  }}
                >
                  <div style={{
                    padding: '0.75rem 1.2rem',
                    borderRadius: isSentByMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: isSentByMe 
                      ? 'linear-gradient(135deg, #a31d56 0%, var(--primary-burgundy) 100%)' 
                      : 'var(--white)',
                    color: isSentByMe ? 'var(--white)' : 'var(--text-dark)',
                    boxShadow: isSentByMe 
                      ? '0 3px 10px rgba(128, 10, 63, 0.12)' 
                      : '0 2px 8px rgba(0,0,0,0.02)',
                    border: isSentByMe ? 'none' : '1px solid rgba(128,10,63,0.04)',
                    fontSize: '0.88rem',
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {msg.content}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.25rem',
                    marginTop: '0.25rem',
                    fontSize: '0.65rem',
                    color: 'var(--text-light)'
                  }}>
                    <Clock size={8} />
                    {formatMessageTime(msg.timestamp)}
                    {isSentByMe && (
                      <span style={{ marginLeft: '0.1rem' }}>
                        {msg.is_read ? (
                          <CheckCheck size={11} style={{ color: 'var(--primary-burgundy)' }} />
                        ) : (
                          <Check size={11} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form bar */}
        <form onSubmit={handleSendMessage} style={{
          padding: isMobile ? '10px 16px calc(10px + env(safe-area-inset-bottom)) 16px' : '1rem 2rem',
          borderTop: '1px solid rgba(128,10,63,0.06)',
          backgroundColor: 'var(--white)',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center'
        }}>
          <input
            type="text"
            className="form-control"
            placeholder={`Write a message to ${selectedChatProfile.user.first_name}...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ height: '42px', borderRadius: '24px', paddingLeft: '1.25rem', flex: 1, fontSize: '0.88rem' }}
            disabled={sendLoading}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!inputText.trim() || sendLoading}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Send size={14} fill="#FFF" style={{ marginLeft: '2px' }} />
          </button>
        </form>

      </div>
    );
  };

  const isEmpty = activeTab === 'matches' ? conversations.length === 0 : likedProfiles.length === 0;

  return (
    <>
    <div className="app-container desktop-only">
      <Header />
      
      <main className="main-content" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '3rem 2rem' }}>
        
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: 'var(--primary-burgundy)', fontWeight: 700 }}>
            Connections & Requests
          </h1>
          <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem' }}>
            Manage sent connection requests, view incoming requests, and connect with verified matches.
          </p>
        </div>

        {/* Success message banners */}
        {successMessage && (
          <div style={{ 
            backgroundColor: 'var(--accent-success)', 
            color: 'var(--accent-success-text)', 
            padding: '1.25rem 1.5rem', 
            borderRadius: '16px', 
            fontSize: '0.95rem', 
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: '1px solid rgba(19, 115, 51, 0.15)',
            fontWeight: 600,
            boxShadow: 'var(--card-shadow)',
            animation: 'fade-in 0.4s ease'
          }}>
            <CheckCircle size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Nav Tabs selections */}
        {!selectedChatProfile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(128, 10, 63, 0.08)', marginBottom: '3rem', paddingBottom: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => handleTabChange('matches')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: activeTab === 'matches' ? 'var(--primary-burgundy)' : 'var(--text-light)',
                  cursor: 'pointer',
                  padding: '0.75rem 1.25rem',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <HeartHandshake size={18} /> Mutual Connections
                </span>
                {activeTab === 'matches' && (
                  <div style={{ position: 'absolute', bottom: '-9px', left: 0, right: 0, height: '3px', backgroundColor: 'var(--primary-burgundy)', borderRadius: '2px' }}></div>
                )}
              </button>

              <button 
                onClick={() => handleTabChange('received')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: activeTab === 'received' ? 'var(--primary-burgundy)' : 'var(--text-light)',
                  cursor: 'pointer',
                  padding: '0.75rem 1.25rem',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Heart size={18} /> Requests Received
                </span>
                {activeTab === 'received' && (
                  <div style={{ position: 'absolute', bottom: '-9px', left: 0, right: 0, height: '3px', backgroundColor: 'var(--primary-burgundy)', borderRadius: '2px' }}></div>
                )}
              </button>

              <button 
                onClick={() => handleTabChange('sent')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: activeTab === 'sent' ? 'var(--primary-burgundy)' : 'var(--text-light)',
                  cursor: 'pointer',
                  padding: '0.75rem 1.25rem',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Smile size={18} /> Requests Sent
                </span>
                {activeTab === 'sent' && (
                  <div style={{ position: 'absolute', bottom: '-9px', left: 0, right: 0, height: '3px', backgroundColor: 'var(--primary-burgundy)', borderRadius: '2px' }}></div>
                )}
              </button>
            </div>

            {/* Desktop Active Tab Refresh Button */}
            <button
              onClick={() => fetchAllData(activeTab)}
              disabled={loadingMatches || loadingSent || loadingReceived}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-burgundy)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                opacity: (loadingMatches || loadingSent || loadingReceived) ? 0.5 : 1
              }}
            >
              <span style={{
                display: 'inline-block',
                animation: (loadingMatches || loadingSent || loadingReceived) ? 'spin 0.8s linear infinite' : 'none'
              }}>
                <Sparkles size={14} />
              </span>
              Refresh Tab
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6.5rem 2rem', gap: '1rem' }}>
            <div className="spinner"></div>
            <div style={{ color: 'var(--primary-burgundy)', fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.02em' }}>
              {activeTab === 'matches' ? 'Loading Mutual Connections...' : activeTab === 'received' ? 'Loading Requests Received...' : 'Loading Requests Sent...'}
            </div>
          </div>
        ) : isEmpty ? (
          
          /* EMPTY STATE */
          <div className="premium-card" style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-medium)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifySelf: 'center', gap: '1rem' }}>
            {activeTab === 'matches' ? (
              <>
                <MessageCircleHeart size={44} style={{ color: 'var(--text-light)', strokeWidth: 1.25 }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text-dark)' }}>No Mutual Connections yet</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px', lineHeight: 1.5 }}>
                  Connections are mutual! When you send a connection request to another person, and they accept/request you back, a mutual connection forms here. Find compatible matches to get started!
                </p>
              </>
            ) : activeTab === 'received' ? (
              <>
                <Heart size={44} style={{ color: 'var(--text-light)', strokeWidth: 1.25 }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text-dark)' }}>No Requests Received yet</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px', lineHeight: 1.5 }}>
                  You haven't received any connection requests yet. Keep your profile detailed and verified to improve visibility!
                </p>
              </>
            ) : (
              <>
                <Smile size={44} style={{ color: 'var(--text-light)', strokeWidth: 1.25 }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--text-dark)' }}>No Requests Sent yet</h3>
                <p style={{ fontSize: '0.9rem', maxWidth: '400px', lineHeight: 1.5 }}>
                  You haven't sent any connection requests yet. Go to 'Find Matches' to search and send connection requests!
                </p>
              </>
            )}
            <button onClick={() => navigate('/search')} className="btn btn-outline" style={{ marginTop: '1rem', borderRadius: '15px' }}>
              Find compatible partners
            </button>
          </div>
        ) : selectedChatProfile ? (
          
          /* ACTIVE CHAT WORKSPACE */
          renderChatBox()

        ) : (
          
          renderCards(false)
        )}

      </main>

      <Footer />
    </div>

    {/* MOBILE VIEW */}
    <div className="mobile-only mobile-dashboard" style={{ background: '#FEF6F0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile Header */}
      <div className="mobile-header" style={{ marginBottom: '1.5rem', padding: '0 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 500, color: '#2B1D24', fontFamily: 'var(--font-serif)' }}>
          Matches
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ background: '#FCE8E6', padding: '4px 10px', borderRadius: '20px', color: '#8B184F', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>A/文</span> English
          </div>
          <div style={{ background: '#FCE8E6', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B184F' }}>
            <Bell size={16} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'white', borderRadius: '16px', padding: '4px', display: 'flex', marginBottom: '2rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <button 
          onClick={() => handleTabChange('matches')}
          style={{ flex: 1, padding: '10px 0', borderRadius: '12px', border: 'none', background: activeTab === 'matches' ? '#FEF0F0' : 'transparent', color: activeTab === 'matches' ? '#000' : '#7E7E7E', fontWeight: activeTab === 'matches' ? 600 : 500, fontSize: '0.9rem', transition: 'all 0.2s ease' }}
        >
          Matches ({activeTab === 'matches' ? conversations.length : 0})
        </button>
        <button 
          onClick={() => handleTabChange('sent')}
          style={{ flex: 1, padding: '10px 0', borderRadius: '12px', border: 'none', background: activeTab === 'sent' ? '#FEF0F0' : 'transparent', color: activeTab === 'sent' ? '#000' : '#7E7E7E', fontWeight: activeTab === 'sent' ? 600 : 500, fontSize: '0.9rem', transition: 'all 0.2s ease' }}
        >
          Sent ({activeTab === 'sent' ? likedProfiles.length : 0})
        </button>
        <button 
          onClick={() => handleTabChange('received')}
          style={{ flex: 1, padding: '10px 0', borderRadius: '12px', border: 'none', background: activeTab === 'received' ? '#FEF0F0' : 'transparent', color: activeTab === 'received' ? '#000' : '#7E7E7E', fontWeight: activeTab === 'received' ? 600 : 500, fontSize: '0.9rem', transition: 'all 0.2s ease' }}
        >
          Received ({activeTab === 'received' ? likedProfiles.length : 0})
        </button>
      </div>

      {/* Content */}
      <div 
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          paddingBottom: '100px', 
          overflowY: 'auto', 
          position: 'relative' 
        }}
      >
        {/* Pull-to-refresh Touch Indicator */}
        {dragY > 0 && (
          <div style={{
            height: `${dragY}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transition: isDragging ? 'none' : 'height 0.2s ease',
            color: 'var(--primary-burgundy)',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: 'rgba(128,10,63,0.03)',
            borderRadius: '12px',
            marginBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', transform: `rotate(${dragY * 4.5}deg)` }}>
              <Clock size={16} />
            </div>
            <span style={{ marginLeft: '6px' }}>{dragY >= 40 ? 'Release to refresh' : 'Pull down to refresh'}</span>
          </div>
        )}

        {/* Tab specific loading state (pull to refresh or tab loading) */}
        {(activeTab === 'matches' ? loadingMatches : activeTab === 'received' ? loadingReceived : loadingSent) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem', gap: '8px', color: 'var(--primary-burgundy)', animation: 'fade-in 0.3s ease' }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(128,10,63,0.15)',
              borderTopColor: 'var(--primary-burgundy)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {activeTab === 'matches' ? 'Refreshing Mutual Connections...' : activeTab === 'received' ? 'Refreshing Requests Received...' : 'Refreshing Requests Sent...'}
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '4rem 1rem' }}>
            <div className="spinner"></div>
            <span style={{ color: '#7E7E7E', fontSize: '0.9rem', fontWeight: 500 }}>
              {activeTab === 'matches' ? 'Loading Connections...' : activeTab === 'received' ? 'Loading Requests Received...' : 'Loading Requests Sent...'}
            </span>
          </div>
        ) : isEmpty ? (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ color: '#7E7E7E', fontSize: '1rem' }}>Nothing here yet.</p>
          </div>
        ) : selectedChatProfile ? (
          // On mobile, the active chat is rendered in a fixed viewport-height overlay
          // to prevent keyboard issues. Returning null here avoids double mounting.
          null
        ) : (
          renderCards(true)
        )}
      </div>

      {/* On mobile: if a conversation is open, render as a fixed full-screen overlay */}
      {selectedChatProfile && (
        <div className="mobile-only" style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          height: `${viewportHeight}px`,
          width: '100vw'
        }}>
          {renderChatBox(true)}
        </div>
      )}
    </div>
    </>
  );
};

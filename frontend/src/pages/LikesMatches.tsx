import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { 
  Heart, HeartHandshake, Smile, 
  MapPin, CheckCircle, MessageCircleHeart, Info,
  ChevronLeft, Send, Clock, Check, CheckCheck, MessageSquare, Sparkles
} from 'lucide-react';

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

  useEffect(() => {
    if (!token) {
      navigate('/register?tab=login');
      return;
    }
    setSelectedChatProfile(null); // Reset active chat box on tab changes
    fetchLikesData();
  }, [token, activeTab, navigate]);

  // 1. Silent polling loop for matches tab preview list (only when chat box is closed)
  useEffect(() => {
    if (!token || activeTab !== 'matches' || selectedChatProfile) return;
    const interval = setInterval(() => {
      fetchLikesDataSilently();
    }, 6000);
    return () => clearInterval(interval);
  }, [token, activeTab, selectedChatProfile]);

  // 2. Active thread messages polling loop
  useEffect(() => {
    if (!token || !selectedChatProfile) return;
    
    fetchMessages(selectedChatProfile.user.id, false);
    
    const interval = setInterval(() => {
      fetchMessages(selectedChatProfile.user.id, false);
    }, 3500);

    return () => clearInterval(interval);
  }, [token, selectedChatProfile]);

  // 3. Scroll to bottom on message list updates
  useEffect(() => {
    if (selectedChatProfile && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedChatProfile]);

  const fetchLikesData = async () => {
    setLoading(true);
    let endpoint = '';
    
    if (activeTab === 'matches') {
      endpoint = 'http://localhost:8000/api/profiles/chat/conversations/';
    } else if (activeTab === 'received') {
      endpoint = 'http://localhost:8000/api/profiles/likes-received/';
    } else if (activeTab === 'sent') {
      endpoint = 'http://localhost:8000/api/profiles/likes-sent/';
    }

    try {
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        if (activeTab === 'matches') {
          setConversations(data);
        } else {
          setLikedProfiles(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch loves parameters", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikesDataSilently = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:8000/api/profiles/chat/conversations/', {
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to silently load connections list", err);
    }
  };

  const fetchMessages = async (partnerId: number, showLoadingIndicator: boolean) => {
    if (showLoadingIndicator) setMessagesLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/profiles/chat/${partnerId}/`, {
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
      const response = await fetch(`http://localhost:8000/api/profiles/chat/${selectedChatProfile.user.id}/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}` 
        },
        body: JSON.stringify({ content: messageContent })
      });
      
      const data = await response.json();
      
      if (response.ok) {
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
      const response = await fetch('http://localhost:8000/api/profiles/like/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}` 
        },
        body: JSON.stringify({ receiver_id: profileId })
      });
      const data = await response.json();
      
      if (response.ok) {
        if (data.mutual_match) {
          setSuccessMessage(`It's a Connection! You and ${name} are now connected! Go to the 'Mutual Connections' tab to celebrate.`);
          setLikedProfiles(prev => prev.filter(p => p.user.id !== profileId));
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
      const response = await fetch('http://localhost:8000/api/profiles/unmatch/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}` 
        },
        body: JSON.stringify({ receiver_id: profileId })
      });
      
      if (response.ok) {
        alert(`You have successfully unmatched with ${name}.`);
        setSelectedChatProfile(null); // Close active chat thread if open
        fetchLikesData(); // Reload matches list
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

  const renderChatBox = () => {
    if (!selectedChatProfile) return null;
    const partnerName = `${selectedChatProfile.user.first_name} ${selectedChatProfile.user.last_name}`;
    
    return (
      <div className="premium-card animate-fade-in" style={{ 
        padding: 0, 
        borderRadius: '24px', 
        overflow: 'hidden', 
        display: 'flex', 
        flexDirection: 'column',
        height: '600px',
        backgroundColor: 'var(--white)',
        border: '1px solid rgba(128,10,63,0.03)',
        boxShadow: 'var(--card-shadow)',
        marginBottom: '2rem'
      }}>
        {/* Chat header */}
        <div style={{
          padding: '1.25rem 2rem',
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
                <img src={`http://localhost:8000${selectedChatProfile.profile_photo}`} alt={partnerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          padding: '1rem 2rem',
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
    <div className="app-container">
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
          <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(128, 10, 63, 0.08)', marginBottom: '3rem', paddingBottom: '0.5rem' }}>
            
            <button 
              onClick={() => { setActiveTab('matches'); setSuccessMessage(null); }}
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
              onClick={() => { setActiveTab('received'); setSuccessMessage(null); }}
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
              onClick={() => { setActiveTab('sent'); setSuccessMessage(null); }}
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
        )}

        {/* LOADING STATE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--primary-burgundy)', fontWeight: 600 }}>
            Loading compatibility lists...
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
          
          /* PROFILES CARDS GRID */
          <div className="grid-cols-3" style={{ gap: '2rem' }}>
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
                          src={`http://localhost:8000${profile.profile_photo}`} 
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
                              setSelectedChatProfile(profile);
                              fetchMessages(profile.user.id, true);
                              setConversations(prev => prev.map(conv => conv.profile.user.id === profile.user.id ? { ...conv, unread_count: 0 } : conv));
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
                          src={`http://localhost:8000${profile.profile_photo}`} 
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
        )}

      </main>

      <Footer />
    </div>
  );
};

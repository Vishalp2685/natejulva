import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import {
  Send, MessageSquare, ShieldAlert, HeartHandshake,
  MapPin, Clock, Check, CheckCheck, Sparkles
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
  occupation: string;
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

export const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userParam = searchParams.get('user');

  // 1. Fetch conversations/matches desk list
  useEffect(() => {
    if (!token) {
      navigate('/register?tab=login');
      return;
    }
    fetchConversations(true);
  }, [token, navigate]);

  // Desk polling loop (5 seconds)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchConversations(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // 2. Poll messages loop for selected active thread (3.5 seconds)
  useEffect(() => {
    if (!token || !activePartnerId) return;

    // Fetch immediately on select
    fetchMessages(activePartnerId, false);

    const interval = setInterval(() => {
      fetchMessages(activePartnerId, false);
    }, 3500);

    return () => clearInterval(interval);
  }, [token, activePartnerId]);

  // 3. Sync selected partner from URL query parameters
  useEffect(() => {
    if (conversations.length > 0 && userParam) {
      const partnerId = parseInt(userParam);
      if (!isNaN(partnerId)) {
        // Verify this user is an actual mutual connection
        const exists = conversations.some(c => c.profile.user.id === partnerId);
        if (exists) {
          setActivePartnerId(partnerId);
          setError(null);
        } else {
          // Block access if not mutually matched
          setError("unauthorized");
          setActivePartnerId(null);
        }
      }
    }
  }, [conversations, userParam]);

  // Auto-scroll messages thread on new items
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async (showLoadingIndicator: boolean) => {
    if (showLoadingIndicator) setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/profiles/chat/conversations/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to load conversations list", err);
    } finally {
      if (showLoadingIndicator) setLoading(false);
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
    if (!inputText.trim() || !activePartnerId || sendLoading) return;

    const messageContent = inputText.trim();
    setInputText('');
    setSendLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/profiles/chat/${activePartnerId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ content: messageContent })
      });

      const data = await response.json();

      if (response.ok) {
        // Optimistic update
        setMessages(prev => [...prev, data]);

        // Refresh conversations desk to update last message preview
        setConversations(prev => prev.map(c => {
          if (c.profile.user.id === activePartnerId) {
            return { ...c, last_message: data };
          }
          return c;
        }));
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSendLoading(false);
    }
  };

  const selectConversation = (partnerId: number) => {
    setError(null);
    setSearchParams({ user: partnerId.toString() });
    fetchMessages(partnerId, true);

    // Optimistically clear unread counts on UI click
    setConversations(prev => prev.map(c => {
      if (c.profile.user.id === partnerId) {
        return { ...c, unread_count: 0 };
      }
      return c;
    }));
  };

  const formatMessageTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (first: string, last: string) => {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  const activeConversation = conversations.find(c => c.profile.user.id === activePartnerId);

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main className="main-content" style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', color: 'var(--primary-burgundy)', fontWeight: 600 }}>
            Loading conversations desk...
          </div>
        ) : error === "unauthorized" ? (
          /* SECURITY MATCH-ONLY AUTHORIZATION PROTECTION GRID */
          <div className="premium-card animate-fade-in" style={{ maxWidth: '550px', margin: '4rem auto', textAlign: 'center', padding: '4rem 3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(178, 59, 68, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B23B44' }}>
              <ShieldAlert size={36} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--primary-burgundy)' }}>
              Access Denied
            </h2>
            <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Matrimonial chat is restricted to mutual connections only. In order to chat with this profile, both users must send a connection request to establish a mutual connection.
            </p>
            <button onClick={() => navigate('/search')} className="btn btn-primary" style={{ padding: '0.8rem 2rem', borderRadius: '30px', marginTop: '0.5rem' }}>
              Find compatible partners
            </button>
          </div>
        ) : (
          /* SPLIT-PANE DESK */
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--white)',
            borderRadius: '24px',
            boxShadow: 'var(--card-shadow)',
            height: 'calc(100vh - 180px)',
            minHeight: '520px',
            overflow: 'hidden',
            border: '1px solid rgba(128,10,63,0.03)'
          }}>

            {/* LEFT CONVERSATIONS BAR */}
            <div style={{
              flex: 1.1,
              borderRight: '1px solid rgba(128,10,63,0.06)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#FFFDF9',
              minWidth: '280px',
              maxWidth: '350px'
            }}>

              <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(128,10,63,0.05)' }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--primary-burgundy)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                  <MessageSquare size={18} /> Conversations
                </h2>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
                {conversations.length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-light)', fontSize: '0.85rem' }}>
                    <HeartHandshake size={32} style={{ color: 'var(--text-light)', marginBottom: '0.75rem', opacity: 0.8 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No mutual connections yet.</p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>Send connection requests to matches to start chatting!</p>
                  </div>
                ) : (
                  conversations.map((c) => {
                    const isActive = c.profile.user.id === activePartnerId;
                    const partnerName = `${c.profile.user.first_name} ${c.profile.user.last_name}`;
                    return (
                      <div
                        key={c.profile.user.id}
                        onClick={() => selectConversation(c.profile.user.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '1rem',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          backgroundColor: isActive ? 'rgba(128,10,63,0.05)' : 'transparent',
                          transition: 'all 0.3s ease',
                          marginBottom: '0.4rem',
                          border: isActive ? '1px solid rgba(128,10,63,0.05)' : '1px solid transparent'
                        }}
                      >
                        {/* Circle profile picture */}
                        <div style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          backgroundColor: 'var(--white)',
                          border: '1px solid rgba(128,10,63,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {c.profile.profile_photo ? (
                            <img src={c.profile.profile_photo} alt={partnerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-burgundy)' }}>
                              {getInitials(c.profile.user.first_name, c.profile.user.last_name)}
                            </div>
                          )}
                        </div>

                        {/* Name and preview text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.15rem' }}>
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-dark)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {partnerName}
                            </h4>
                            {c.last_message && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                                {formatMessageTime(c.last_message.timestamp)}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{
                              fontSize: '0.78rem',
                              color: c.unread_count > 0 ? 'var(--text-dark)' : 'var(--text-light)',
                              fontWeight: c.unread_count > 0 ? 600 : 400,
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {c.last_message ? c.last_message.content : "Click to start chatting..."}
                            </p>

                            {c.unread_count > 0 && (
                              <span style={{
                                backgroundColor: 'var(--primary-burgundy)',
                                color: 'var(--white)',
                                borderRadius: '50%',
                                minWidth: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px',
                                flexShrink: 0
                              }}>
                                {c.unread_count}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* RIGHT ACTIVE CONVERSATION BOX */}
            <div style={{
              flex: 2,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#FDFBF7'
            }}>

              {activePartnerId && activeConversation ? (
                /* ACTIVE CHAT CONTENT */
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                  {/* Active Header bar */}
                  <div style={{
                    padding: '1.25rem 2rem',
                    borderBottom: '1px solid rgba(128,10,63,0.06)',
                    backgroundColor: 'var(--white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        backgroundColor: '#FFFDF9',
                        border: '1px solid rgba(128,10,63,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {activeConversation.profile.profile_photo ? (
                              <img
                                src={activeConversation.profile.profile_photo || "/default-avatar.png"}
                                alt={activeConversation.profile.user.first_name}
                                loading="lazy"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
/>
                        ) : (
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-burgundy)' }}>
                            {getInitials(activeConversation.profile.user.first_name, activeConversation.profile.user.last_name)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                          {activeConversation.profile.user.first_name} {activeConversation.profile.user.last_name}
                        </h3>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-medium)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.1rem' }}>
                          <MapPin size={10} /> {activeConversation.profile.city} &bull; {activeConversation.profile.occupation}
                        </span>
                      </div>
                    </div>
                    <div className="badge-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'rgba(212, 163, 115, 0.08)', border: 'none', color: '#8c6031', fontSize: '0.72rem' }}>
                      <Sparkles size={11} fill="#D4A373" /> Verified Match
                    </div>
                  </div>

                  {/* Messages list box */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    backgroundImage: 'radial-gradient(rgba(128,10,63,0.01) 15%, transparent 16%)',
                    backgroundSize: '16px 16px'
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
                        const isSentByMe = msg.sender === user?.id;
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
                              padding: '0.8rem 1.25rem',
                              borderRadius: isSentByMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                              background: isSentByMe
                                ? 'linear-gradient(135deg, #a31d56 0%, var(--primary-burgundy) 100%)'
                                : 'var(--white)',
                              color: isSentByMe ? 'var(--white)' : 'var(--text-dark)',
                              boxShadow: isSentByMe
                                ? '0 3px 10px rgba(128, 10, 63, 0.15)'
                                : '0 2px 8px rgba(0,0,0,0.03)',
                              border: isSentByMe ? 'none' : '1px solid rgba(128,10,63,0.04)',
                              fontSize: '0.9rem',
                              lineHeight: 1.45,
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
                              fontSize: '0.68rem',
                              color: 'var(--text-light)'
                            }}>
                              <Clock size={9} />
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

                  {/* Send Input Bar container */}
                  <form onSubmit={handleSendMessage} style={{
                    padding: '1.25rem 2rem',
                    borderTop: '1px solid rgba(128,10,63,0.06)',
                    backgroundColor: 'var(--white)',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={`Write a message to ${activeConversation.profile.user.first_name}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      style={{ height: '48px', borderRadius: '24px', paddingLeft: '1.5rem', flex: 1 }}
                      disabled={sendLoading}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!inputText.trim() || sendLoading}
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Send size={16} fill="#FFF" style={{ marginLeft: '2px' }} />
                    </button>
                  </form>

                </div>
              ) : (
                /* NO ACTIVE CONVERSATION SELECTED EMPTY BOX */
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-light)',
                  padding: '2rem'
                }}>
                  <MessageSquare size={54} style={{ color: 'var(--text-light)', strokeWidth: 1, marginBottom: '1.25rem', opacity: 0.8 }} />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--text-dark)', marginBottom: '0.4rem' }}>
                    Your Conversation Workspace
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-medium)', maxWidth: '380px', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
                    Select a mutually connected match from the sidebar list to start exchanging private messages. Have a blessed conversation!
                  </p>
                </div>
              )}

            </div>

          </div>
        )}

      </main>
      <Footer />
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { useDialog } from '../context/DialogContext';
import { Header } from '../components/Header';
import { ProfilePreview } from '../components/ProfilePreview';
import {
  MessageSquare, ChevronLeft, Send, Check, CheckCheck, Sparkles,
  MessageCircleHeart, Search, MoreVertical, HeartCrack, User, X, ShieldAlert
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

export const Chats: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const {
    cachedFetch,
    getCachedData,
    getChatMessages,
    setChatMessages,
    appendChatMessage,
    appendChatMessages,
    updateChatMessage,
    removeChatMessage
  } = useCache();
  const { showLoading, hideLoading, showAlert, showConfirm } = useDialog();

  const endpoint = `${API_URL}/api/profiles/chat/conversations/`;
  const cachedInitial = getCachedData(endpoint);

  const [loading, setLoading] = useState(!cachedInitial);
  const [conversations, setConversations] = useState<Conversation[]>(cachedInitial || []);
  const [selectedChatProfile, setSelectedChatProfile] = useState<PublicProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [inputText, setInputText] = useState('');

  const getProfilePhoto = (photoUrl: string | null) => {
    if (!photoUrl) return '';
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }
    return `${API_URL}${photoUrl}`;
  };

  // WhatsApp features
  const [searchQuery, setSearchQuery] = useState('');
  const [myProfile, setMyProfile] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<PublicProfile | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // F8: Track previous message count to only auto-scroll on new messages
  const prevMessageCount = useRef(0);
  // F6: Stable scalar dependency for chat polling
  const selectedPartnerId = selectedChatProfile?.user.id ?? null;

  const [viewportHeight, setViewportHeight] = useState(window.visualViewport ? window.visualViewport.height : window.innerHeight);
  const [viewportOffsetTop, setViewportOffsetTop] = useState(window.visualViewport ? window.visualViewport.offsetTop : 0);

  useEffect(() => {
    if (location.state?.chatProfile) {
      setSelectedChatProfile(location.state.chatProfile);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      setViewportHeight(window.visualViewport!.height);
      setViewportOffsetTop(window.visualViewport!.offsetTop);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport!.removeEventListener('resize', handleResize);
      window.visualViewport!.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Prevent background scrolling when a conversation is open on mobile
  useEffect(() => {
    if (selectedChatProfile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedChatProfile]);

  // Scroll to bottom when keyboard opens/closes
  useEffect(() => {
    if (selectedChatProfile && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [viewportHeight]);

  useEffect(() => {
    if (!token) { navigate('/register?tab=login'); return; }
    if (cachedInitial) { setConversations(cachedInitial); setLoading(false); }
    else fetchConversations();
    fetchMyProfile();
  }, [token, navigate]);

  // F1: Reduced polling interval from 6s to 15s, pauses when tab is hidden
  useEffect(() => {
    if (!token || selectedPartnerId) return;

    let interval: ReturnType<typeof setInterval>;

    const startPolling = () => {
      interval = setInterval(fetchConversationsSilently, 15000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchConversationsSilently();
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

  // Reset message count tracking when partner changes to force scroll to bottom
  useEffect(() => {
    prevMessageCount.current = 0;
  }, [selectedPartnerId]);

  // Handle initial load and caching when a chat is opened
  useEffect(() => {
    if (!selectedPartnerId) {
      setMessages([]);
      return;
    }
    // 1. Instantly read from cache first to avoid flashing / loading spinners
    const cached = getChatMessages(selectedPartnerId);
    setMessages(cached);

    // 2. Fetch incrementally in background (or fully if cache is empty)
    fetchMessages(selectedPartnerId, true, true);
  }, [selectedPartnerId]);

  // F1 + F6: Reduced from 3.5s to 8s, uses stable scalar dep, pauses on hidden
  useEffect(() => {
    if (!token || !selectedPartnerId) return;

    let interval: ReturnType<typeof setInterval>;

    const startPolling = () => {
      interval = setInterval(() => fetchMessages(selectedPartnerId, false, true), 8000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchMessages(selectedPartnerId, false, true);
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

  // Click outside listener for the dropdown menu
  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = () => setMenuOpen(false);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [menuOpen]);

  // F3: Use cachedFetch instead of raw fetch for own profile
  const fetchMyProfile = async () => {
    try {
      const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/me/`, {
        headers: { 'Authorization': `Token ${token}` },
      }, 120); // Cache for 2 minutes
      if (ok && data) setMyProfile(data);
    } catch (err) {
      console.error("Failed to fetch my profile", err);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data, ok } = await cachedFetch(endpoint, { headers: { 'Authorization': `Token ${token}` } });
      if (ok && data) setConversations(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // F5: Use cachedFetch with short TTL instead of raw fetch for silent polling
  const fetchConversationsSilently = async () => {
    if (!token) return;
    try {
      const { data, ok } = await cachedFetch(endpoint, {
        headers: { 'Authorization': `Token ${token}` },
      }, 10); // Short 10s TTL for polling
      if (ok && data) setConversations(data);
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async (partnerId: number, showLoading: boolean, isIncremental = true) => {
    const cached = getChatMessages(partnerId);
    const hasCache = cached && cached.length > 0;

    // Only show loading state if we have no messages in cache to display
    if (showLoading && !hasCache) {
      setMessagesLoading(true);
    }

    let url = `${API_URL}/api/profiles/chat/${partnerId}/`;
    if (isIncremental && hasCache) {
      let lastServerMsgId = null;
      for (let i = cached.length - 1; i >= 0; i--) {
        if (cached[i].id > 0) {
          lastServerMsgId = cached[i].id;
          break;
        }
      }
      if (lastServerMsgId !== null) {
        url += `?after_id=${lastServerMsgId}`;
      }
    }

    try {
      const res = await fetch(url, { headers: { 'Authorization': `Token ${token}` } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        if (isIncremental && hasCache) {
          appendChatMessages(partnerId, data);
        } else {
          setChatMessages(partnerId, data);
        }
        setMessages(getChatMessages(partnerId));
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      if (showLoading) setMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChatProfile) return;
    const messageContent = inputText.trim();
    const partnerId = selectedChatProfile.user.id;
    setInputText('');

    // Create temporary optimistic message
    const tempId = -Date.now();
    const tempMessage: Message = {
      id: tempId,
      sender: user?.id || 0,
      sender_name: `${user?.first_name || ''} ${user?.last_name || ''}`,
      receiver: partnerId,
      receiver_name: `${selectedChatProfile.user.first_name} ${selectedChatProfile.user.last_name}`,
      content: messageContent,
      timestamp: new Date().toISOString(),
      is_read: false
    };

    // Optimistically append to cache and local state
    appendChatMessage(partnerId, tempMessage);
    setMessages(getChatMessages(partnerId));

    // Optimistically update conversations list preview
    setConversations(prev => prev.map(c => {
      if (c.profile.user.id === partnerId) {
        return { ...c, last_message: tempMessage };
      }
      return c;
    }));

    try {
      const res = await fetch(`${API_URL}/api/profiles/chat/${partnerId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ content: messageContent })
      });
      const data = await res.json();

      if (res.ok && data) {
        // Replace temp message with server data in the cache
        updateChatMessage(partnerId, tempId, data);
        setMessages(getChatMessages(partnerId));

        // Replace temp last message in conversations
        setConversations(prev => prev.map(c => {
          if (c.profile.user.id === partnerId) {
            return { ...c, last_message: data };
          }
          return c;
        }));
        // Update caches silently
        fetchConversationsSilently();
      } else {
        // Remove temp message from cache on failure
        removeChatMessage(partnerId, tempId);
        setMessages(getChatMessages(partnerId));

        fetchConversationsSilently();
        showAlert("Error", "Failed to send message. Please check your connection and try again.");
      }
    } catch (err) {
      console.error(err);
      // Remove temp message from cache on error
      removeChatMessage(partnerId, tempId);
      setMessages(getChatMessages(partnerId));
    }
  };

  const handleUnmatch = async (partnerId: number) => {
    showConfirm(
      "Unmatch Profile",
      "Are you sure you want to unmatch this profile? This will delete your chat history.",
      async () => {
        showLoading("Unmatching profile...");
        try {
          const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/unmatch/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${token}`
            },
            body: JSON.stringify({ receiver_id: partnerId })
          });
          hideLoading();
          if (ok) {
            // Empty local chat cache for the unmatched partner
            setChatMessages(partnerId, []);
            setSelectedChatProfile(null);
            fetchConversationsSilently();
            showAlert("Success", "You have successfully unmatched with this profile.");
          } else {
            showAlert("Error", data?.error || "Failed to unmatch.");
          }
        } catch (err) {
          hideLoading();
          console.error("Failed to unmatch", err);
          showAlert("Error", "A network error occurred. Please try again.");
        }
      }
    );
  };

  const openChat = (profile: PublicProfile) => {
    setSelectedChatProfile(profile);
    setConversations(prev => prev.map(c => c.profile.user.id === profile.user.id ? { ...c, unread_count: 0 } : c));
  };

  const getInitials = (f: string, l: string) => `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(c => {
    const fullName = `${c.profile.user.first_name} ${c.profile.user.last_name}`;
    return fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isEmpty = conversations.length === 0;

  const renderConversationList = () => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {filteredConversations.map(c => {
        const profile = c.profile;
        const fullName = `${profile.user.first_name} ${profile.user.last_name}`;
        const isActive = selectedChatProfile?.user.id === profile.user.id;
        const isLastMsgMine = c.last_message ? c.last_message.sender !== profile.user.id : false;

        return (
          <div
            key={profile.user.id}
            onClick={() => openChat(profile)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '0 1rem',
              backgroundColor: isActive ? 'rgba(128,10,63,0.05)' : 'white',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              borderLeft: isActive ? '4px solid var(--primary-burgundy)' : '4px solid transparent',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#F8F6F1'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'white'; }}
          >
            {/* Avatar container */}
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#FEF0F0', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#8B184F', fontWeight: 700, fontSize: '1rem' }}>
              {profile.profile_photo
                ? <img src={getProfilePhoto(profile.profile_photo)} alt={fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getInitials(profile.user.first_name, profile.user.last_name)}
            </div>

            {/* Message Details */}
            <div style={{
              flex: 1,
              marginLeft: '12px',
              borderBottom: '1px solid #f2eedf',
              padding: '12px 0',
              minWidth: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#2B1D24', display: 'block' }}>{fullName}</span>
                <p style={{
                  margin: '4px 0 0',
                  fontSize: '0.82rem',
                  color: c.unread_count > 0 ? '#2B1D24' : '#6f6f6f',
                  fontWeight: c.unread_count > 0 ? 600 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  {c.last_message ? (
                    <>
                      {isLastMsgMine && (
                        c.last_message.is_read
                          ? <CheckCheck size={15} style={{ color: 'var(--primary-burgundy)', marginRight: '4px', flexShrink: 0 }} />
                          : <Check size={15} style={{ color: '#8e8e93', marginRight: '4px', flexShrink: 0 }} />
                      )}
                      {c.last_message.content}
                    </>
                  ) : (
                    'Click to start chatting!'
                  )}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '8px', flexShrink: 0 }}>
                <span style={{ fontSize: '0.72rem', color: c.unread_count > 0 ? 'var(--primary-burgundy)' : '#8e8e93', fontWeight: c.unread_count > 0 ? 600 : 400 }}>
                  {c.last_message ? formatTime(c.last_message.timestamp) : ''}
                </span>
                {c.unread_count > 0 ? (
                  <div style={{
                    marginTop: '4px',
                    minWidth: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-burgundy)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px'
                  }}>
                    {c.unread_count}
                  </div>
                ) : (
                  <div style={{ height: '20px' }} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderChatBox = (isMobile: boolean = false) => {
    if (!selectedChatProfile) return null;
    const partnerName = `${selectedChatProfile.user.first_name} ${selectedChatProfile.user.last_name}`;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#efeae2',
        borderRadius: isMobile ? '0' : '0 20px 20px 0',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid rgba(128,10,63,0.08)',
          backgroundColor: '#f0f2f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setViewingProfile(selectedChatProfile)}>
            {isMobile && (
              <button onClick={(e) => { e.stopPropagation(); setSelectedChatProfile(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#54656f', display: 'flex', alignItems: 'center', padding: 0, marginRight: '0.25rem' }}>
                <ChevronLeft size={24} />
              </button>
            )}
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#FEF0F0', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#8B184F', fontWeight: 700 }}>
              {selectedChatProfile.profile_photo
                ? <img src={getProfilePhoto(selectedChatProfile.profile_photo)} alt={partnerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : getInitials(selectedChatProfile.user.first_name, selectedChatProfile.user.last_name)}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 600, color: '#111b21' }}>{partnerName}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', color: '#667781' }}>
                <Sparkles size={10} fill="#D4A373" color="#D4A373" /> {selectedChatProfile.city || 'Mutual Match'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#54656f', position: 'relative' }}>
            <span
              aria-label="Search"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Search size={19} />
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              style={{ background: 'none', border: 'none', padding: 0, color: '#54656f', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <MoreVertical size={20} />
            </button>

            {/* Options Dropdown Menu */}
            {menuOpen && (
              <div style={{
                position: 'absolute',
                top: '35px',
                right: '0px',
                backgroundColor: 'white',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                borderRadius: '8px',
                zIndex: 100,
                padding: '4px 0',
                minWidth: '140px',
                border: '1px solid rgba(0,0,0,0.06)'
              }} onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => {
                    setViewingProfile(selectedChatProfile);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    color: '#333',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <User size={14} /> View Profile
                </button>
                <button
                  onClick={() => {
                    handleUnmatch(selectedChatProfile.user.id);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 14px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    fontSize: '0.85rem',
                    color: '#B23B44',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fff5f5'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <HeartCrack size={14} /> Unmatch
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          backgroundImage: 'radial-gradient(rgba(128,10,63,0.02) 15%, transparent 16%)',
          backgroundSize: '16px 16px',
          backgroundColor: '#efeae2'
        }}>
          {messagesLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667781', fontSize: '0.9rem' }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#667781', gap: '0.5rem', marginTop: '4rem' }}>
              <MessageSquare size={36} style={{ strokeWidth: 1.2, color: 'var(--primary-burgundy)' }} />
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No messages yet</p>
              <p style={{ margin: 0, fontSize: '0.78rem', opacity: 0.8 }}>Say hello to {selectedChatProfile.user.first_name}!</p>
            </div>
          ) : messages.map(msg => {
            const isMine = msg.sender !== selectedChatProfile.user.id;
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '75%', minWidth: isMine ? '85px' : '75px' }}>
                <div style={{
                  padding: '6px 10px 20px 10px',
                  borderRadius: isMine ? '8px 0px 8px 8px' : '0px 8px 8px 8px',
                  background: isMine ? '#d9fdd3' : 'white',
                  color: '#111b21',
                  fontSize: '0.88rem',
                  lineHeight: 1.45,
                  boxShadow: '0 1px 1px rgba(0,0,0,0.12)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  position: 'relative'
                }}>
                  <span style={{ display: 'block', marginRight: isMine ? '20px' : '0px' }}>
                    {msg.content}
                  </span>

                  {/* Absolute positioned time and status */}
                  <div style={{
                    position: 'absolute',
                    bottom: '3px',
                    right: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: '0.62rem',
                    color: '#667781'
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMine && (msg.is_read
                      ? <CheckCheck size={14} style={{ color: 'var(--primary-burgundy)' }} />
                      : <Check size={14} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} style={{
          padding: isMobile ? '8px 16px calc(8px + env(safe-area-inset-bottom)) 16px' : '8px 16px',
          backgroundColor: '#f0f2f5',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <input
            type="text"
            className="form-control"
            placeholder="Type a message"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            style={{
              height: '40px',
              borderRadius: '8px',
              paddingLeft: '12px',
              flex: 1,
              fontSize: '0.88rem',
              border: 'none',
              outline: 'none',
              backgroundColor: 'white'
            }}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: inputText.trim() ? 'var(--primary-burgundy)' : 'transparent',
              border: 'none',
              cursor: inputText.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: inputText.trim() ? 'white' : '#54656f',
              transition: 'background 0.2s'
            }}
          >
            <Send size={18} fill={inputText.trim() ? "white" : "none"} color={inputText.trim() ? "white" : "currentColor"} style={{ marginLeft: inputText.trim() ? '2px' : '0' }} />
          </button>
        </form>
      </div>
    );
  };

  const renderProfileModal = () => {
    if (!viewingProfile) return null;
    return (
      <ProfilePreview
        profile={viewingProfile}
        isOpen={!!viewingProfile}
        onClose={() => setViewingProfile(null)}
        customActions={
          <button
            onClick={() => {
              handleUnmatch(viewingProfile.user.id);
              setViewingProfile(null);
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: 'rgba(178,59,68,0.08)',
              color: '#B23B44',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <HeartCrack size={16} /> Unmatch Profile
          </button>
        }
      />
    );
  };

  return (
    <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <main className="main-content chats-main" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ===== Unified responsive layout ===== */}
        <div className="chats-outer">

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
              <div className="spinner"></div>
              <div style={{ color: 'var(--primary-burgundy)', fontWeight: 600 }}>Loading chats...</div>
            </div>
          ) : isEmpty ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <div className="premium-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '450px', width: '100%' }}>
                <MessageCircleHeart size={48} style={{ color: 'var(--text-light)', strokeWidth: 1.2 }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', color: 'var(--text-dark)', margin: 0 }}>No chats yet</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-medium)', maxWidth: '380px' }}>Mutually connect with matches and your conversations will appear here. Find someone to connect and chat!</p>
                <button onClick={() => navigate('/likes')} className="btn btn-primary" style={{ borderRadius: '14px', marginTop: '0.5rem' }}>
                  View Matches
                </button>
              </div>
            </div>
          ) : (
            <div className="chats-panel">
              {/* Left sidebar: conversation list */}
              <div className={`chats-sidebar ${selectedChatProfile ? 'chats-sidebar-hidden-mobile' : ''}`} style={{ borderRight: '1px solid #e9edef' }}>
                {/* WhatsApp Style Sidebar Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                  backgroundColor: '#f0f2f5',
                  borderBottom: '1px solid rgba(0,0,0,0.06)'
                }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {myProfile && myProfile.profile_photo ? (
                      <img src={getProfilePhoto(myProfile.profile_photo)} alt="My profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-burgundy)' }}>
                        {user ? getInitials(user.first_name, user.last_name) : 'ME'}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1.2rem', color: '#54656f' }}>
                    <span
                      aria-label="My Matches"
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onClick={() => navigate('/likes')}
                    >
                      <Sparkles size={20} />
                    </span>
                    <span
                      aria-label="New Chat"
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onClick={() => navigate('/likes')}
                    >
                      <MessageSquare size={20} />
                    </span>
                  </div>
                </div>

                {/* WhatsApp Style Search Bar */}
                <div style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  backgroundColor: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    position: 'relative',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#f0f2f5',
                    borderRadius: '8px',
                    padding: '2px 10px'
                  }}>
                    <Search size={16} style={{ color: '#667781', marginRight: '8px' }} />
                    <input
                      type="text"
                      placeholder="Search or start new chat"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontSize: '0.88rem',
                        padding: '6px 0',
                        color: '#3b3b3b'
                      }}
                    />
                    {searchQuery && (
                      <X size={16} onClick={() => setSearchQuery('')} style={{ color: '#667781', cursor: 'pointer', marginLeft: '4px' }} />
                    )}
                  </div>
                </div>

                {/* Conversations Scroll Container */}
                <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#fff' }}>
                  {filteredConversations.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#667781', fontSize: '0.88rem' }}>
                      No chats found.
                    </div>
                  ) : (
                    renderConversationList()
                  )}
                </div>
              </div>

              {/* Right panel: chat or placeholder */}
              <div className={`chats-content ${!selectedChatProfile ? 'chats-content-hidden-mobile' : ''}`}>
                {selectedChatProfile ? (
                  renderChatBox(false)
                ) : (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#667781',
                    backgroundColor: '#f8f9fa',
                    borderBottom: '6px solid var(--primary-burgundy)',
                    padding: '2rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      backgroundColor: 'rgba(128,10,63,0.04)',
                      padding: '2.5rem',
                      borderRadius: '50%',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--primary-burgundy)'
                    }}>
                      <MessageCircleHeart size={80} style={{ strokeWidth: 1 }} />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: '#41525d', margin: '0 0 10px 0', fontWeight: 300 }}>
                      Natejulva
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: '#667781', maxWidth: '480px', margin: '0 0 2rem 0', lineHeight: 1.6 }}>
                      Send and receive messages to your mutual connections. Messages are fully secure.
                      Complete your profile verification badges to find matches quicker.
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      color: '#8696a0',
                      fontSize: '0.78rem',
                      marginTop: 'auto'
                    }}>
                      <ShieldAlert size={14} /> End-to-end encrypted
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </main>

      {/* On mobile: if a conversation is open, render as a fixed full-screen overlay */}
      {selectedChatProfile && (
        <div className="mobile-only-flex" style={{
          position: 'fixed',
          top: `${viewportOffsetTop}px`,
          left: '0',
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

      {/* Profile Details Modal Popup */}
      {renderProfileModal()}
    </div>
  );
};

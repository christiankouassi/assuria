import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { 
  MessageSquare, ShieldAlert, FileText, LayoutDashboard,
  Search, Bell, User, Send, Cpu, UserCheck, 
  Moon, Sun, Download, HelpCircle, AlertCircle,
  FolderOpen, Copy, Check, Play
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import Layout from './components/Layout';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiMode, setAiMode] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [data, setData] = useState({
    conversations: [],
    claims: [],
    quotes: [],
    messages: [] // Pour stats globales
  });
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [clientFiles, setClientFiles] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const audioRef = useRef(typeof Audio !== "undefined" ? new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') : null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getMediaUrl = (urlOrId) => {
    if (!urlOrId) return '';
    const strUrl = String(urlOrId);
    if (strUrl.startsWith('http://') || strUrl.startsWith('https://')) return strUrl;
    return `https://assuria-production.up.railway.app/api/media/${strUrl}`;
  };

  const renderMessageContent = (msg) => {
    const srcUrl = getMediaUrl(msg.media_url);

    if (msg.media_type) {
      if (msg.media_type.includes('image')) {
        return (
          <div 
            style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', borderRadius: '12px' }} 
            onClick={() => setLightboxMedia({ url: srcUrl, description: msg.media_description || msg.content })}
          >
            <img 
              src={srcUrl} 
              alt={msg.content} 
              style={{ display: 'block', maxWidth: '240px', maxHeight: '180px', borderRadius: '12px', objectFit: 'cover' }} 
            />
          </div>
        );
      } else if (msg.media_type.includes('audio')) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🎙️</span>
            <audio src={srcUrl} controls style={{ height: '32px', width: '210px' }} />
          </div>
        );
      } else if (msg.media_type.includes('pdf') || msg.media_type.includes('document') || msg.media_type.includes('word') || msg.media_type.includes('officedocument')) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', width: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', flexShrink: 0 }}>
              <FileText size={24} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {msg.content?.startsWith('Document reçu:') ? msg.content.replace('Document reçu:', '').trim() : (msg.content || 'Document')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {msg.media_type.split('/')[1]?.toUpperCase() || 'PDF'}
              </span>
            </div>
            <a href={srcUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', cursor: 'pointer', flexShrink: 0 }}>
              <Download size={16} />
            </a>
          </div>
        );
      }
    }
    return <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>;
  };

  const formatLastMessagePreview = (lastMsg) => {
    if (!lastMsg) return 'Nouvelle conversation';
    if (lastMsg.media_type) {
      if (lastMsg.media_type.includes('image')) return '📷 Photo';
      if (lastMsg.media_type.includes('audio')) return '🎙️ Message vocal';
      if (lastMsg.media_type.includes('pdf') || lastMsg.media_type.includes('document') || lastMsg.media_type.includes('word') || lastMsg.media_type.includes('officedocument')) return '📄 Document';
    }
    return lastMsg.content;
  };

  const updateConversationLastMessage = (newMsg) => {
    setData(prev => {
      const updatedConversations = prev.conversations.map(c => {
        if (c.id === newMsg.conversation_id) {
          return {
            ...c,
            last_message_at: newMsg.created_at,
            last_message: {
              content: newMsg.content,
              created_at: newMsg.created_at,
              sender: newMsg.sender,
              media_type: newMsg.media_type
            }
          };
        }
        return c;
      });

      // Sort conversations in-memory by last_message_at descending
      const sortedConversations = [...updatedConversations].sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at) : new Date(0);
        const dateB = b.last_message_at ? new Date(b.last_message_at) : new Date(0);
        return dateB - dateA;
      });

      return {
        ...prev,
        conversations: sortedConversations
      };
    });

    if (newMsg.media_type) {
      setClientFiles(prev => {
        if (prev.some(f => f.id === newMsg.id)) return prev;
        // Try to find conversation identifier
        const conv = data.conversations.find(c => c.id === newMsg.conversation_id);
        const fileWithConv = {
          ...newMsg,
          conversations: {
            user_identifier: conv ? conv.user_identifier : 'client'
          }
        };
        return [fileWithConv, ...prev];
      });
    }
  };

  useEffect(() => {
    fetchData();
    
    const channel = supabase.channel('dashboard_data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, fetchData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        handleGlobalNewMessage(payload);
        updateConversationLastMessage(payload.new);
        fetchData(); // refresh data for dashboard and previews
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleGlobalNewMessage(payload) {
    const msg = payload.new;
    if (msg.sender === 'user') {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      const originalTitle = document.title;
      document.title = '🔴 Nouveau message — Assuria AI';
      setTimeout(() => { document.title = originalTitle; }, 3000);
      
      setUnreadCounts(prev => ({
        ...prev,
        [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1
      }));

      // Gestion de la notification média
      if (msg.media_url) {
        supabase.from('conversations').select('user_identifier').eq('id', msg.conversation_id).single().then(({ data: convData }) => {
          const phone = convData ? convData.user_identifier : 'client';
          let typeLabel = 'Document';
          if (msg.media_type) {
            if (msg.media_type.startsWith('image/')) {
              typeLabel = 'Photo';
            } else if (msg.media_type.startsWith('audio/')) {
              typeLabel = 'Vocal';
            }
          }
          const newNotif = {
            id: msg.id || Date.now(),
            text: `Média reçu de +${phone} — ${typeLabel}`,
            created_at: msg.created_at || new Date().toISOString(),
            read: false
          };
          setNotifications(prev => [newNotif, ...prev]);
        });
      }
    }
  };

  useEffect(() => {
    if (!selectedConversation) return;
    setUnreadCounts(prev => ({ ...prev, [selectedConversation.id]: 0 }));

    const channel = supabase.channel(`messages_${selectedConversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation.id}` }, (payload) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        updateConversationLastMessage(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  async function fetchData() {
    const [convs, clms, qts, msgs, filesData] = await Promise.all([
      supabase.from('conversations').select('*, messages(content, created_at, sender, media_type)').order('last_message_at', { ascending: false }),
      supabase.from('claims').select('*, conversations(user_identifier)').order('created_at', { ascending: false }),
      supabase.from('quotes').select('*, conversations(user_identifier)').order('created_at', { ascending: false }),
      supabase.from('messages').select('*'), // For stats
      supabase.from('messages').select('*, conversations(user_identifier)').not('media_type', 'is', null).order('created_at', { ascending: false })
    ]);

    const formattedConvs = (convs.data || []).map(c => {
      const sortedMsgs = c.messages ? c.messages.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)) : [];
      return {
        ...c,
        last_message: sortedMsgs.length > 0 ? sortedMsgs[sortedMsgs.length - 1] : null,
      }
    });

    setData({
      conversations: formattedConvs,
      claims: clms.data || [],
      quotes: qts.data || [],
      messages: msgs.data || []
    });
    
    console.log('Fichiers:', filesData.data);
    setClientFiles(filesData.data || []);
    setLoading(false);
  };

  const fetchMessages = async (convId) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setChatMessages(msgs || []);
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || aiMode) return;

    try {
      const API_URL = 'https://assuria-production.up.railway.app';
      const response = await fetch(`${API_URL}/api/conversations/${selectedConversation.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      });

      if (response.ok) {
        setNewMessage('');
      } else {
        alert("Erreur lors de l'envoi du message");
      }
    } catch (error) {
      alert("Erreur de connexion au serveur");
    }
  };

  const exportToExcel = (dataToExport, filename) => {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportClaims = () => {
    const exportData = data.claims.map(c => ({
      ID: c.id,
      Client: `+${c.conversations?.user_identifier}`,
      Description: c.description || JSON.stringify(c.details),
      Statut: c.status,
      Date: format(new Date(c.created_at), 'dd/MM/yyyy HH:mm')
    }));
    exportToExcel(exportData, 'Sinistres_Assuria');
  };

  const exportQuotes = () => {
    const exportData = data.quotes.map(q => ({
      ID: q.id,
      Client: `+${q.conversations?.user_identifier}`,
      Type: q.insurance_type,
      Détails: JSON.stringify(q.details),
      Statut: q.status,
      Date: format(new Date(q.created_at), 'dd/MM/yyyy HH:mm')
    }));
    exportToExcel(exportData, 'Devis_Assuria');
  };

  // Stats Calculators
  const claimStats = {
    total: data.claims.length,
    new: data.claims.filter(c => c.status === 'pending').length,
    processing: data.claims.filter(c => c.status === 'processing').length,
    resolved: data.claims.filter(c => c.status === 'resolved').length
  };

  const quoteStats = {
    total: data.quotes.length,
    new: data.quotes.filter(q => q.status === 'pending').length,
    sent: data.quotes.filter(q => q.status === 'sent').length,
    accepted: data.quotes.filter(q => q.status === 'converted').length
  };

  // Dashboard calculations
  const thisMonthMessages = data.messages.filter(m => new Date(m.created_at).getMonth() === new Date().getMonth() && m.sender === 'ai').length;
  
  // Urgent conversations: last message from user > 30 mins ago
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
  const urgentConversations = data.conversations.filter(c => {
    if (!c.last_message) return false;
    return c.last_message.sender === 'user' && new Date(c.last_message.created_at) < thirtyMinsAgo;
  });

  // Chart data: messages per day (last 7 days)
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return {
      date: format(d, 'dd MMM', { locale: fr }),
      rawDate: format(d, 'yyyy-MM-dd')
    };
  });

  const chartData = last7Days.map(day => {
    const dayMessages = data.messages.filter(m => m.created_at.startsWith(day.rawDate));
    return {
      name: day.date,
      Utilisateur: dayMessages.filter(m => m.sender === 'user').length,
      IA: dayMessages.filter(m => m.sender === 'ai').length,
    };
  });

  return (
    <Layout
      theme={theme}
      toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      unreadCounts={{ messages: Object.values(unreadCounts).reduce((a, b) => a + b, 0) }}
      notificationsCount={notifications.filter(n => !n.read).length}
      toggleNotifications={() => setShowNotifications(!showNotifications)}
    >
      <div className="content-area">
          {activeTab === 'dashboard' ? (
            <div className="space-y-xl max-w-[1440px] mx-auto">
              {/* Header Section */}
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface m-0">Tableau de bord</h2>
                  <p className="text-on-surface-variant font-body-md text-body-md mt-xs m-0">
                    Bienvenue, voici un aperçu de vos performances aujourd'hui.
                  </p>
                </div>
                <div className="flex gap-md">
                  <button className="px-md py-sm bg-surface-container-high border border-outline-variant/50 rounded-lg text-on-surface font-label-md text-label-md hover:bg-surface-container-highest transition-colors cursor-pointer">
                    Exporter Rapport
                  </button>
                  <button className="px-md py-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity cursor-pointer border-none font-bold">
                    Vue Analyste AI
                  </button>
                </div>
              </div>

              {/* Top Metrics Grid */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
                <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-on-surface-variant font-label-md text-label-md">Messages IA ce mois</span>
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                  <div>
                    <div className="text-display-lg font-display-lg leading-none">{thisMonthMessages}</div>
                    <div className="text-primary text-body-sm font-body-sm mt-xs flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[16px]">trending_up</span> Actif
                    </div>
                  </div>
                </div>

                <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-on-surface-variant font-label-md text-label-md">Devis en cours</span>
                    <span className="material-symbols-outlined text-secondary">request_quote</span>
                  </div>
                  <div>
                    <div className="text-display-lg font-display-lg leading-none">{quoteStats.new}</div>
                    <div className="text-on-surface-variant text-body-sm font-body-sm mt-xs">Total: {quoteStats.total}</div>
                  </div>
                </div>

                <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-on-surface-variant font-label-md text-label-md">Sinistres en cours</span>
                    <span className="material-symbols-outlined text-tertiary">report_problem</span>
                  </div>
                  <div>
                    <div className="text-display-lg font-display-lg leading-none">{claimStats.new}</div>
                    <div className="text-on-surface-variant text-body-sm font-body-sm mt-xs">Total: {claimStats.total}</div>
                  </div>
                </div>

                <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-on-surface-variant font-label-md text-label-md">Temps de réponse</span>
                    <span className="material-symbols-outlined text-primary">speed</span>
                  </div>
                  <div>
                    <div className="text-display-lg font-display-lg leading-none">&lt; 1 min</div>
                    <div className="text-primary text-body-sm font-body-sm mt-xs flex items-center gap-xs">
                      Optimisé par IA
                    </div>
                  </div>
                </div>
              </section>

              {/* Middle Section: Bento Grid */}
              <div className="grid grid-cols-12 gap-gutter">
                {/* Bar Chart: Conversations par jour */}
                <div className="col-span-12 lg:col-span-8 glass-card rounded-xl p-lg h-[400px] flex flex-col">
                  <div className="flex justify-between items-center mb-xl">
                    <h3 className="font-headline-md text-headline-md m-0">Conversations par jour</h3>
                    <div className="flex items-center gap-md">
                      <span className="flex items-center gap-xs text-label-md font-label-md text-on-surface-variant">
                        <span className="w-3 h-3 bg-primary rounded-full"></span> IA
                      </span>
                      <span className="flex items-center gap-xs text-label-md font-label-md text-on-surface-variant">
                        <span className="w-3 h-3 bg-secondary rounded-full"></span> Utilisateur
                      </span>
                    </div>
                  </div>
                  <div className="flex-grow w-full h-full relative min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" stroke="var(--on-surface-variant)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--on-surface-variant)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', borderRadius: '8px', color: 'var(--on-surface)' }}
                          itemStyle={{ color: 'var(--on-surface)' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="IA" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Utilisateur" fill="var(--secondary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Urgent Conversations */}
                <div className="col-span-12 lg:col-span-4 glass-card rounded-xl p-lg flex flex-col h-[400px]">
                  <div className="flex items-center gap-sm mb-lg">
                    <span className="material-symbols-outlined text-error">emergency</span>
                    <h3 className="font-headline-md text-headline-md m-0">Urgences</h3>
                  </div>
                  <div className="flex-grow space-y-md overflow-y-auto pr-xs custom-scrollbar">
                    {urgentConversations.length > 0 ? (
                      urgentConversations.map(conv => (
                        <div key={conv.id} onClick={() => { setActiveTab('conversations'); handleSelectConversation(conv); }} className="p-md rounded-lg border border-error/20 bg-error/5 flex justify-between items-center group cursor-pointer hover:bg-error/10 transition-colors">
                          <div className="flex items-center gap-md">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold">
                              {conv.user_identifier.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-body-md text-body-md text-on-surface m-0">+{conv.user_identifier}</p>
                              <p className="text-body-sm text-on-surface-variant m-0 truncate w-32">{formatLastMessagePreview(conv.last_message)}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-error font-bold text-body-md m-0">{format(new Date(conv.last_message.created_at), 'HH:mm')}</p>
                            <p className="text-[10px] uppercase tracking-wider text-error/60 m-0">En attente</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant text-center opacity-70">
                        <span className="material-symbols-outlined text-4xl mb-sm">check_circle</span>
                        <p className="m-0 text-body-md">Aucune conversation<br/>urgente en attente.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
                    ) : activeTab === 'conversations' ? (
            <div className="flex flex-1 overflow-hidden h-full">
              {/* Panel 1: Conversation List */}
              <section className="w-80 flex flex-col border-r border-outline-variant bg-surface-container-lowest">
                <div className="p-md border-b border-outline-variant flex justify-between items-center">
                  <h2 className="font-headline-md text-[18px] text-on-surface">Conversations</h2>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {data.conversations.length} ACTIVES
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {data.conversations.map(conv => (
                    <div 
                      key={conv.id} 
                      className={`p-md border-b border-outline-variant transition-colors cursor-pointer group ${selectedConversation?.id === conv.id ? 'bg-surface-container-high border-l-4 border-l-primary' : 'hover:bg-surface-container-low'}`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="flex gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-bold text-lg">
                            {conv.user_identifier.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#25D366] rounded-full border-2 border-surface-container-lowest flex items-center justify-center">
                            <img alt="WhatsApp Icon" className="w-3 h-3" src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className={`font-bold truncate ${selectedConversation?.id === conv.id ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                              +{conv.user_identifier}
                            </h3>
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              {conv.last_message ? format(new Date(conv.last_message.created_at), 'HH:mm') : ''}
                            </span>
                          </div>
                          <p className={`text-body-sm truncate ${selectedConversation?.id === conv.id ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>
                            {formatLastMessagePreview(conv.last_message)}
                          </p>
                          {unreadCounts[conv.id] > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="w-2.5 h-2.5 bg-error rounded-full"></span>
                              <span className="text-[10px] text-error uppercase font-bold tracking-tight">
                                {unreadCounts[conv.id]} Non lus
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Panel 2: Chat Interface */}
              <section className="flex-1 flex flex-col bg-surface-container-lowest relative min-w-0">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="h-16 px-lg border-b border-outline-variant flex items-center justify-between glass-panel z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-bold text-lg">
                          {selectedConversation.user_identifier.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="font-bold text-on-surface leading-tight">+{selectedConversation.user_identifier}</h2>
                          <p className="text-[12px] text-primary flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                            Client en ligne via WhatsApp
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center bg-surface-container-high rounded-full p-1 border border-outline-variant">
                        <button 
                          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-body-sm transition-all ${aiMode ? 'bg-primary text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                          onClick={() => setAiMode(true)}
                        >
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: aiMode ? "'FILL' 1" : "'FILL' 0" }}>smart_toy</span>
                          Mode IA
                        </button>
                        <button 
                          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-body-sm transition-all ${!aiMode ? 'bg-primary text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                          onClick={() => setAiMode(false)}
                        >
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: !aiMode ? "'FILL' 1" : "'FILL' 0" }}>person</span>
                          Conseiller
                        </button>
                      </div>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-6 custom-scrollbar" id="chat-messages">
                      {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-start self-start' : 'items-end self-end'} max-w-[80%]`}>
                          <div className={`p-md rounded-2xl relative shadow-xl overflow-hidden border ${msg.sender === 'user' ? 'bg-surface-container text-on-surface rounded-tl-none border-outline-variant' : (msg.is_ai ? 'ai-message text-on-surface rounded-tr-none border-transparent' : 'bg-secondary-container text-on-secondary-container rounded-tr-none border-outline-variant/30')}`}>
                            
                            {msg.sender !== 'user' && msg.is_ai && (
                              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 blur-2xl rounded-full"></div>
                            )}

                            {msg.sender !== 'user' && (
                              <div className={`flex items-center gap-2 mb-2 ${msg.is_ai ? 'text-primary' : 'text-secondary'}`}>
                                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: msg.is_ai ? "'FILL' 1" : "'FILL' 0" }}>
                                  {msg.is_ai ? 'smart_toy' : 'person'}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest relative z-10">
                                  {msg.is_ai ? 'Assuria AI' : 'Conseiller'}
                                </span>
                              </div>
                            )}

                            <div className="text-body-md relative z-10">
                              {renderMessageContent(msg)}
                            </div>
                          </div>
                          <span className={`text-[10px] text-on-surface-variant mt-1 font-medium ${msg.sender === 'user' ? 'ml-1 text-left' : 'mr-1 text-right'}`}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Footer: Input */}
                    <div className="p-lg glass-panel">
                      <form 
                        className="bg-surface-container-high rounded-2xl border border-outline-variant p-2 flex items-end gap-2 focus-within:ring-2 focus-within:ring-primary/50 transition-all"
                        onSubmit={handleSendMessage}
                      >
                        <button type="button" className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined">add</span>
                        </button>
                        <textarea 
                          className="flex-1 bg-transparent border-none focus:ring-0 text-body-md py-2 resize-none max-h-32 custom-scrollbar text-on-surface placeholder:text-on-surface-variant focus:outline-none disabled:opacity-50"
                          placeholder={aiMode ? "Désactivé en mode IA" : "Votre réponse..."}
                          rows="1"
                          disabled={aiMode}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if(newMessage.trim()) handleSendMessage(e);
                            }
                          }}
                        ></textarea>
                        <button 
                          type="submit" 
                          disabled={aiMode || !newMessage.trim()}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${aiMode || !newMessage.trim() ? 'bg-surface-container text-on-surface-variant opacity-50 cursor-not-allowed' : 'bg-primary text-on-primary-container hover:scale-105 active:scale-95'}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[64px] mb-4 opacity-50 text-primary">chat</span>
                    <p className="font-headline-md text-headline-md m-0">Sélectionnez une conversation</p>
                    <p className="text-body-md mt-2 opacity-70">Choisissez un client dans la liste pour démarrer.</p>
                  </div>
                )}
              </section>

              {/* Panel 3: Client Info Card */}
              {selectedConversation && (() => {
                const clientContext = selectedConversation.client_profile || {};
                const safeCreatedAt = (() => {
                  try {
                    return selectedConversation.created_at ? format(new Date(selectedConversation.created_at), 'dd/MM/yyyy') : 'Non renseigné';
                  } catch (e) {
                    return 'Non renseigné';
                  }
                })();
                const safeId = selectedConversation.id ? selectedConversation.id.slice(0, 8) : '';
                return (
                  <section className="w-80 border-l border-outline-variant bg-surface flex flex-col p-lg custom-scrollbar overflow-y-auto">
                    <div className="flex flex-col items-center mb-lg">
                      <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full border-4 border-surface-container-high bg-surface-container-highest flex items-center justify-center text-[36px] text-on-surface font-bold">
                          {selectedConversation.user_identifier ? selectedConversation.user_identifier.substring(0, 2).toUpperCase() : ''}
                        </div>
                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-[#25D366] rounded-full border-2 border-surface flex items-center justify-center">
                          <img alt="WhatsApp" className="w-4 h-4" src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" />
                        </div>
                      </div>
                      <h3 className="font-headline-md text-on-surface text-center">+{selectedConversation.user_identifier}</h3>
                      <p className="text-body-sm text-on-surface-variant">ID: {safeId}</p>
                    </div>

                    <div className="space-y-6">
                      {/* Client Details */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Informations</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">call</span>
                            <span className="text-body-sm">+{selectedConversation.user_identifier}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">calendar_today</span>
                            <span className="text-body-sm">Inscrit le {safeCreatedAt}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Actions Rapides</h4>
                        <button className="w-full py-2.5 px-4 rounded-xl border border-outline-variant text-body-sm font-bold hover:bg-surface-container-high transition-colors text-left flex items-center gap-3 text-on-surface">
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                          Voir les dossiers
                        </button>
                        <button className="w-full py-2.5 px-4 rounded-xl border border-outline-variant text-body-sm font-bold hover:bg-surface-container-high transition-colors text-left flex items-center gap-3 text-on-surface">
                          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                          Envoyer un document
                        </button>
                        <button className="w-full py-2.5 px-4 rounded-xl border border-error/20 text-error text-body-sm font-bold hover:bg-error/5 transition-colors text-left flex items-center gap-3">
                          <span className="material-symbols-outlined text-[20px]">block</span>
                          Fermer la session
                        </button>
                      </div>

                      {/* AI Insights Mini-Card */}
                      {Object.keys(clientContext).length > 0 && (
                        <div className="p-md rounded-2xl ai-message mt-4 shadow-md border border-primary/20">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                            <span className="text-[10px] font-bold text-primary uppercase">Mémoire IA (Contexte)</span>
                          </div>
                          <div className="text-[12px] text-on-surface leading-relaxed space-y-2">
                            {Object.entries(clientContext).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-on-surface-variant capitalize">{key}:</span> <span className="font-bold">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}
            </div>

          ) : activeTab === 'claims' ? (
            <div className="flex flex-col gap-6 p-lg h-full overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center">
                <h2 className="font-headline-md text-[24px] text-on-surface m-0">Gestion des Sinistres</h2>
                <button onClick={exportClaims} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary-container rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-md">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Exporter (Excel)
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Sinistres" value={claimStats.total} icon="description" />
                <StatCard label="Nouveaux" value={claimStats.new} icon="fiber_new" color="text-primary" />
                <StatCard label="En cours" value={claimStats.processing} icon="hourglass_empty" color="text-[#FFC107]" />
                <StatCard label="Clôturés" value={claimStats.resolved} icon="check_circle" color="text-error" />
              </div>

              <div className="glass-panel p-md">
                <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-low/50">
                  <table className="w-full text-left text-body-md text-on-surface">
                    <thead className="bg-surface-container border-b border-outline-variant text-on-surface-variant font-bold">
                      <tr>
                        <th className="px-6 py-4 font-medium">Référence</th>
                        <th className="px-6 py-4 font-medium">Client</th>
                        <th className="px-6 py-4 font-medium">Statut</th>
                        <th className="px-6 py-4 font-medium">Description</th>
                        <th className="px-6 py-4 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {data.claims.map(claim => (
                        <tr key={claim.id} className="hover:bg-surface-container-high transition-colors">
                          <td className="px-6 py-4 font-bold">#{claim.id.slice(0, 8)}</td>
                          <td className="px-6 py-4">+{claim.conversations?.user_identifier}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[12px] font-bold tracking-wide ${claim.status === 'resolved' ? 'bg-error/20 text-error border border-error/30' : claim.status === 'processing' ? 'bg-[#FFC107]/20 text-[#FFC107] border border-[#FFC107]/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[14px] max-w-[350px]">
                            <div className={claim.media_urls?.length ? 'mb-2' : ''}>
                              {claim.description || "Détails non fournis"}
                            </div>
                            {claim.media_urls && claim.media_urls.length > 0 && (
                              <div className="flex gap-2 flex-wrap">
                                {claim.media_urls.map((media, idx) => (
                                  media.url && (
                                    <div key={idx} className="relative">
                                      {media.type?.startsWith('audio/') ? (
                                        <audio src={media.url} controls className="w-32 scale-75 origin-left" />
                                      ) : media.type?.startsWith('image/') || !media.type ? (
                                        <img 
                                          src={media.url}
                                          alt={media.description || "Media"}
                                          className="w-12 h-12 rounded-lg object-cover cursor-pointer border border-outline-variant shadow-md"
                                          onClick={() => setLightboxMedia(media)}
                                        />
                                      ) : (
                                        <a href={media.url} target="_blank" rel="noreferrer" className="glass-panel text-[11px] px-2 py-1 rounded flex items-center gap-1 no-underline text-on-surface hover:text-primary transition-colors">
                                          Doc
                                        </a>
                                      )}
                                    </div>
                                  )
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant text-sm">
                            {format(new Date(claim.created_at), 'd MMM yyyy', { locale: fr })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'quotes' ? (
            <div className="flex flex-col gap-6 p-lg h-full overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center">
                <h2 className="font-headline-md text-[24px] text-on-surface m-0">Gestion des Devis</h2>
                <button onClick={exportQuotes} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary-container rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-md">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Exporter (Excel)
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Devis" value={quoteStats.total} icon="request_quote" />
                <StatCard label="Nouveaux" value={quoteStats.new} icon="fiber_new" color="text-primary" />
                <StatCard label="Envoyés" value={quoteStats.sent} icon="send" color="text-[#FFC107]" />
                <StatCard label="Acceptés" value={quoteStats.accepted} icon="thumb_up" color="text-error" />
              </div>
              <div className="glass-panel p-md">
                <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-low/50">
                  <table className="w-full text-left text-body-md text-on-surface">
                    <thead className="bg-surface-container border-b border-outline-variant text-on-surface-variant font-bold">
                      <tr>
                        <th className="px-6 py-4 font-medium">Référence</th>
                        <th className="px-6 py-4 font-medium">Client</th>
                        <th className="px-6 py-4 font-medium">Type</th>
                        <th className="px-6 py-4 font-medium">Statut</th>
                        <th className="px-6 py-4 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {data.quotes.map(quote => (
                        <tr key={quote.id} className="hover:bg-surface-container-high transition-colors">
                          <td className="px-6 py-4 font-bold">#{quote.id.slice(0, 8)}</td>
                          <td className="px-6 py-4">+{quote.conversations?.user_identifier}</td>
                          <td className="px-6 py-4">{quote.insurance_type?.toUpperCase()}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[12px] font-bold tracking-wide ${quote.status === 'sent' ? 'bg-[#FFC107]/20 text-[#FFC107] border border-[#FFC107]/30' : quote.status === 'accepted' ? 'bg-error/20 text-error border border-error/30' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                              {quote.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant text-sm">
                            {format(new Date(quote.created_at), 'd MMM yyyy', { locale: fr })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'files' ? (
            <div className="flex flex-col gap-6 p-lg h-full overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center">
                <h2 className="font-headline-md text-[24px] text-on-surface m-0">Fichiers clients</h2>
                <span className="text-[14px] text-on-surface-variant font-medium">
                  {clientFiles.length} fichier(s) trouvé(s)
                </span>
              </div>

              <div className="glass-panel p-md">
                <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-low/50">
                  <table className="w-full text-left text-body-md text-on-surface">
                    <thead className="bg-surface-container border-b border-outline-variant text-on-surface-variant font-bold">
                      <tr>
                        <th className="px-6 py-4 font-medium">Client</th>
                        <th className="px-6 py-4 font-medium">Type</th>
                        <th className="px-6 py-4 font-medium">Aperçu</th>
                        <th className="px-6 py-4 font-medium">Date</th>
                        <th className="px-6 py-4 font-medium">Transcription / Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {clientFiles.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-on-surface-variant">
                            Aucun fichier média reçu pour le moment
                          </td>
                        </tr>
                      ) : (
                        clientFiles.map(file => {
                          const isImage = file.media_type?.includes('image');
                          const isAudio = file.media_type?.includes('audio');
                          const isDoc = file.media_type?.includes('pdf') || file.media_type?.includes('document') || file.media_type?.includes('word') || file.media_type?.includes('officedocument');
                          
                          return (
                            <tr key={file.id} className="hover:bg-surface-container-high transition-colors">
                              <td className="px-6 py-4 font-bold">
                                +{file.conversations?.user_identifier || 'Inconnu'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-block px-3 py-1 rounded-lg text-[11px] font-bold uppercase ${isImage ? 'bg-primary/20 text-primary border border-primary/30' : isAudio ? 'bg-[#FFC107]/20 text-[#FFC107] border border-[#FFC107]/30' : 'bg-error/20 text-error border border-error/30'}`}>
                                  {isImage ? '📷 Image' : isAudio ? '🎙️ Vocal' : '📄 Document'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {(() => {
                                  const srcUrl = getMediaUrl(file.media_url);
                                  return (
                                    <>
                                      {isImage && srcUrl && (
                                        <img 
                                          src={srcUrl} 
                                          alt="Miniature" 
                                          className="w-12 h-12 rounded-lg object-cover cursor-pointer border border-outline-variant shadow-sm"
                                          onClick={() => setLightboxMedia({ url: srcUrl, description: file.media_description || file.content })}
                                        />
                                      )}
                                      {isAudio && srcUrl && (
                                        <div 
                                          className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer bg-[#FFC107]/20 text-[#FFC107] hover:bg-[#FFC107]/30 transition-colors"
                                          onClick={() => {
                                            const audio = new Audio(srcUrl);
                                            audio.play().catch(e => console.log('Playback failed', e));
                                          }}
                                          title="Lire le fichier audio"
                                        >
                                          <Play size={18} />
                                        </div>
                                      )}
                                      {isDoc && srcUrl && (
                                        <a 
                                          href={srcUrl} 
                                          target="_blank" 
                                          rel="noreferrer" 
                                          className="w-10 h-10 rounded-full flex items-center justify-center bg-error/20 text-error hover:bg-error/30 transition-colors"
                                          title="Ouvrir le document"
                                        >
                                          <FileText size={18} />
                                        </a>
                                      )}
                                    </>
                                  );
                                })()}
                              </td>
                              <td className="px-6 py-4 text-[13px] text-on-surface-variant">
                                {file.created_at ? (
                                  (() => {
                                    try { return format(new Date(file.created_at), 'd MMM yyyy HH:mm', { locale: fr }) }
                                    catch (e) { return 'Date invalide' }
                                  })()
                                ) : 'Date inconnue'}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-start gap-3 max-w-[500px]">
                                  <div className="flex-1 text-[13px] leading-relaxed text-on-surface whitespace-pre-wrap max-h-[100px] overflow-y-auto bg-surface-container-highest/30 p-3 rounded-lg border border-outline-variant custom-scrollbar">
                                    {file.media_description || file.content || "Aucune description disponible."}
                                  </div>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(file.media_description || file.content || "");
                                      setCopiedId(file.id);
                                      setTimeout(() => setCopiedId(null), 2000);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold transition-all shrink-0 border ${copiedId === file.id ? 'bg-primary text-on-primary border-primary' : 'glass-panel text-on-surface border-outline-variant hover:bg-surface-container'}`}
                                  >
                                    {copiedId === file.id ? (
                                      <>
                                        <Check size={14} />
                                        <span>Copié !</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={14} />
                                        <span>Copier</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : activeTab === 'help' ? (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto p-lg h-full overflow-y-auto custom-scrollbar w-full">
              <h2 className="font-headline-md text-[24px] text-on-surface m-0">Centre d'Aide</h2>
              
              <div className="glass-panel p-xl">
                <h3 className="text-[18px] font-bold text-on-surface mb-6 m-0">Foire Aux Questions</h3>
                <div className="flex flex-col gap-6">
                  <div>
                    <h4 className="text-body-lg font-bold text-on-surface mb-2 mt-0">Comment passer en mode Conseiller ?</h4>
                    <p className="text-body-md text-on-surface-variant leading-relaxed m-0">Dans l'onglet "Messages", sélectionnez une conversation puis utilisez le bouton en haut à droite (Mode IA / Conseiller). Une fois en mode Conseiller, l'IA ne répondra plus automatiquement à ce client.</p>
                  </div>
                  <div>
                    <h4 className="text-body-lg font-bold text-on-surface mb-2 mt-0">Que signifient les conversations urgentes ?</h4>
                    <p className="text-body-md text-on-surface-variant leading-relaxed m-0">Le tableau de bord met en évidence les clients dont le dernier message date de plus de 30 minutes et qui n'ont pas reçu de réponse. Cela nécessite souvent une intervention humaine.</p>
                  </div>
                  <div>
                    <h4 className="text-body-lg font-bold text-on-surface mb-2 mt-0">Comment exporter les données ?</h4>
                    <p className="text-body-md text-on-surface-variant leading-relaxed m-0">Dans les onglets "Sinistres" ou "Devis", cliquez sur le bouton "Exporter (Excel)" en haut à droite pour télécharger un fichier contenant toutes les données actuelles.</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-xl flex items-center justify-between bg-surface-container-lowest">
                <div>
                  <h3 className="text-[18px] font-bold text-on-surface mb-2 m-0">Besoin d'assistance technique ?</h3>
                  <p className="text-body-md text-on-surface-variant m-0">Notre équipe de support est disponible sur WhatsApp.</p>
                </div>
                <a 
                  href="https://wa.me/212600000000" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white no-underline rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <MessageSquare size={20} />
                  Contacter le support
                </a>
              </div>
            </div>
          ) : null}
        </div>

      {/* Lightbox Modal */}
      {lightboxMedia && (
        <div 
          className="fixed inset-0 w-[100vw] h-[100vh] bg-black/85 z-[9999] flex flex-col items-center justify-center p-6 animate-fade-in" 
          onClick={() => setLightboxMedia(null)}
        >
          <div 
            className="relative max-w-[90%] max-h-[80%] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute -top-10 right-0 bg-transparent border-none text-white text-[32px] cursor-pointer leading-none hover:text-primary transition-colors"
              onClick={() => setLightboxMedia(null)}
            >
              &times;
            </button>
            <img 
              src={lightboxMedia.url} 
              alt={lightboxMedia.description || "Media"} 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
            />
            {lightboxMedia.description && (
              <p className="text-white mt-4 text-center text-sm bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full max-w-[600px] border border-white/10 leading-relaxed m-0">
                {lightboxMedia.description}
              </p>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

function StatCard({ label, value, subtitle, icon, color = 'text-on-surface-variant' }) {
  return (
    <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <span className="text-on-surface-variant font-label-md text-label-md">{label}</span>
        {icon && <span className={`material-symbols-outlined ${color}`}>{icon}</span>}
      </div>
      <div>
        <div className="text-display-lg font-display-lg leading-none text-on-surface">{value}</div>
        {subtitle && (
          <div className="text-primary text-body-sm font-body-sm mt-xs flex items-center gap-xs">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

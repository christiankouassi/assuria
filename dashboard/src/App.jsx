import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { 
  MessageSquare, ShieldAlert, FileText, LayoutDashboard,
  Search, Bell, User, Send, Cpu, UserCheck, 
  Moon, Sun, Download, HelpCircle, AlertCircle
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';

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
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [unreadCounts, setUnreadCounts] = useState({});
  const audioRef = useRef(typeof Audio !== "undefined" ? new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') : null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchData();
    
    const channel = supabase.channel('dashboard_data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, fetchData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        handleGlobalNewMessage(payload);
        fetchData(); // refresh data for dashboard and previews
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleGlobalNewMessage = (payload) => {
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
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const fetchData = async () => {
    const [convs, clms, qts, msgs] = await Promise.all([
      supabase.from('conversations').select('*, messages(content, created_at, sender)').order('last_message_at', { ascending: false }),
      supabase.from('claims').select('*, conversations(user_identifier)').order('created_at', { ascending: false }),
      supabase.from('quotes').select('*, conversations(user_identifier)').order('created_at', { ascending: false }),
      supabase.from('messages').select('*') // For stats
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
    <div className="dashboard-container">
      <aside className="sidebar glass">
        <div className="logo">
          <ShieldAlert size={32} />
          <span>Assuria AI</span>
        </div>
        
        <nav>
          <NavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
            icon={<LayoutDashboard size={20} />}
            label="Tableau de bord"
          />
          <NavItem 
            active={activeTab === 'conversations'} 
            onClick={() => { setActiveTab('conversations'); setSelectedConversation(null); }}
            icon={<MessageSquare size={20} />}
            label="Messages"
            badge={Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
          />
          <NavItem 
            active={activeTab === 'claims'} 
            onClick={() => setActiveTab('claims')}
            icon={<ShieldAlert size={20} />}
            label="Sinistres"
          />
          <NavItem 
            active={activeTab === 'quotes'} 
            onClick={() => setActiveTab('quotes')}
            icon={<FileText size={20} />}
            label="Devis"
          />
          <div style={{ marginTop: 'auto', marginBottom: '10px' }}>
            <NavItem 
              active={activeTab === 'help'} 
              onClick={() => setActiveTab('help')}
              icon={<HelpCircle size={20} />}
              label="Aide"
            />
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="glass" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-dim)' }}>
            <Search size={18} />
            <span style={{ fontSize: '14px' }}>Espace Conseiller</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div style={{ position: 'relative', cursor: 'pointer', color: 'var(--text-dim)' }}>
              <Bell size={20} />
              {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'red', width: '8px', height: '8px', borderRadius: '50%' }}></span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--surface)', padding: '6px 12px', borderRadius: '30px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <User size={18} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>Conseiller</span>
            </div>
          </div>
        </header>

        <div className="content-area" style={{ padding: '24px', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>
          {activeTab === 'dashboard' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 style={{ margin: 0, color: 'var(--text)' }}>Aperçu de l'activité</h2>
              <div className="stats-grid">
                <StatCard label="Messages IA (ce mois)" value={thisMonthMessages} />
                <StatCard label="Devis en cours" value={quoteStats.new} />
                <StatCard label="Sinistres en cours" value={claimStats.new} />
                <StatCard label="Temps de réponse moyen" value="< 1 min" subtitle="IA" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div className="glass" style={{ padding: '24px', borderRadius: '16px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text)' }}>Activité des 7 derniers jours</h3>
                  <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text)' }}
                          itemStyle={{ color: 'var(--text)' }}
                        />
                        <Bar dataKey="IA" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Utilisateur" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <AlertCircle color="#ef4444" size={24} />
                    <h3 style={{ margin: 0, color: 'var(--text)' }}>Conversations urgentes</h3>
                  </div>
                  {urgentConversations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>
                      {urgentConversations.map(conv => (
                        <div key={conv.id} style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600', color: 'var(--text)' }}>+{conv.user_identifier}</span>
                            <span style={{ fontSize: '12px', color: '#ef4444' }}>
                              {format(new Date(conv.last_message.created_at), 'HH:mm')}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {conv.last_message.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', textAlign: 'center' }}>
                      Aucune conversation en attente de plus de 30 minutes.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'conversations' ? (
            <div className="chat-layout" style={{ height: '100%', marginTop: '-24px', marginLeft: '-24px', marginRight: '-24px' }}>
              <div className="chat-list" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', padding: '24px' }}>
                {data.conversations.map(conv => (
                  <div 
                    key={conv.id} 
                    className={`glass ${selectedConversation?.id === conv.id ? 'active-chat' : ''}`}
                    style={{ padding: '16px', cursor: 'pointer', borderLeft: selectedConversation?.id === conv.id ? '4px solid var(--primary)' : '1px solid transparent', position: 'relative' }}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text)' }}>+{conv.user_identifier}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        {conv.last_message ? format(new Date(conv.last_message.created_at), 'HH:mm') : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
                        {conv.last_message ? conv.last_message.content : 'Nouvelle conversation'}
                      </p>
                      {unreadCounts[conv.id] > 0 && (
                        <div style={{ background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {unreadCounts[conv.id]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-detail glass" style={{ borderTop: 'none', borderBottom: 'none', borderRight: 'none', borderRadius: 0 }}>
                {selectedConversation ? (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="chat-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', margin: 0, color: 'var(--text)' }}>+{selectedConversation.user_identifier}</h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0 }}>ID: {selectedConversation.id.slice(0,8)}</p>
                      </div>
                      
                      <div className="switch-container">
                        <Cpu size={16} color={aiMode ? 'var(--primary)' : 'var(--text-dim)'} />
                        <label className="switch">
                          <input type="checkbox" checked={!aiMode} onChange={() => setAiMode(!aiMode)} />
                          <span className="slider"></span>
                        </label>
                        <UserCheck size={16} color={!aiMode ? 'var(--primary)' : 'var(--text-dim)'} />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>{aiMode ? 'MODE IA' : 'MODE CONSEILLER'}</span>
                      </div>
                    </div>

                    <div className="messages-container" style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {chatMessages.map(msg => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                          <div className={`message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-ai'}`} style={{ marginBottom: '4px' }}>
                            {msg.content}
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)', padding: '0 4px' }}>
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </span>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <form className="chat-input-area" onSubmit={handleSendMessage} style={{ padding: '24px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '12px' }}>
                      <input 
                        type="text" 
                        className="chat-input"
                        placeholder={aiMode ? "Désactivé en mode IA" : "Écrire un message..."}
                        disabled={aiMode}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                      <button 
                        type="submit" 
                        className="glass" 
                        style={{ padding: '0 20px', background: aiMode ? 'var(--surface)' : 'var(--primary)', border: 'none', borderRadius: '12px', color: aiMode ? 'var(--text-dim)' : 'white', cursor: aiMode ? 'not-allowed' : 'pointer' }}
                        disabled={aiMode}
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                    Sélectionnez une conversation pour voir les messages
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'claims' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'var(--text)' }}>Gestion des Sinistres</h2>
                <button onClick={exportClaims} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  <Download size={18} />
                  Exporter (Excel)
                </button>
              </div>
              <div className="stats-grid">
                <StatCard label="Total Sinistres" value={claimStats.total} />
                <StatCard label="Nouveaux" value={claimStats.new} />
                <StatCard label="En cours" value={claimStats.processing} />
                <StatCard label="Clôturés" value={claimStats.resolved} />
              </div>
              <div className="glass" style={{ padding: '10px', borderRadius: '12px' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Référence</th>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Client</th>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Statut</th>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Description</th>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.claims.map(claim => (
                      <tr key={claim.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ fontWeight: '600' }}>#{claim.id.slice(0, 8)}</td>
                        <td>+{claim.conversations?.user_identifier}</td>
                        <td><span className={`status-badge status-${claim.status}`}>{claim.status}</span></td>
                        <td style={{ fontSize: '14px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {claim.description || "Détails non fournis"}
                        </td>
                        <td>{format(new Date(claim.created_at), 'd MMM yyyy', { locale: fr })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'quotes' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'var(--text)' }}>Gestion des Devis</h2>
                <button onClick={exportQuotes} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                  <Download size={18} />
                  Exporter (Excel)
                </button>
              </div>
              <div className="stats-grid">
                <StatCard label="Total Devis" value={quoteStats.total} />
                <StatCard label="Nouveaux" value={quoteStats.new} />
                <StatCard label="Envoyés" value={quoteStats.sent} />
                <StatCard label="Acceptés" value={quoteStats.accepted} />
              </div>
              <div className="glass" style={{ padding: '10px', borderRadius: '12px' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text)' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-dim)' }}>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Référence</th>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Client</th>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Type</th>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Statut</th>
                      <th style={{ padding: '16px 20px', fontWeight: '500' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.quotes.map(quote => (
                      <tr key={quote.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ fontWeight: '600' }}>#{quote.id.slice(0, 8)}</td>
                        <td>+{quote.conversations?.user_identifier}</td>
                        <td>{quote.insurance_type?.toUpperCase()}</td>
                        <td><span className={`status-badge status-${quote.status === 'sent' ? 'validated' : 'pending'}`}>{quote.status}</span></td>
                        <td>{format(new Date(quote.created_at), 'd MMM yyyy', { locale: fr })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === 'help' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
              <h2 style={{ margin: 0, color: 'var(--text)' }}>Centre d'Aide</h2>
              
              <div className="glass" style={{ padding: '32px', borderRadius: '16px' }}>
                <h3 style={{ marginTop: 0, color: 'var(--text)' }}>Foire Aux Questions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>Comment passer en mode Conseiller ?</h4>
                    <p style={{ margin: 0, color: 'var(--text-dim)', lineHeight: '1.6' }}>Dans l'onglet "Messages", sélectionnez une conversation puis utilisez l'interrupteur en haut à droite (MODE IA / MODE CONSEILLER). Une fois en mode Conseiller, l'IA ne répondra plus automatiquement à ce client.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>Que signifient les conversations urgentes ?</h4>
                    <p style={{ margin: 0, color: 'var(--text-dim)', lineHeight: '1.6' }}>Le tableau de bord met en évidence les clients dont le dernier message date de plus de 30 minutes et qui n'ont pas reçu de réponse. Cela nécessite souvent une intervention humaine.</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>Comment exporter les données ?</h4>
                    <p style={{ margin: 0, color: 'var(--text-dim)', lineHeight: '1.6' }}>Dans les onglets "Sinistres" ou "Devis", cliquez sur le bouton "Exporter (Excel)" en haut à droite pour télécharger un fichier contenant toutes les données actuelles.</p>
                  </div>
                </div>
              </div>

              <div className="glass" style={{ padding: '32px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)' }}>Besoin d'assistance technique ?</h3>
                  <p style={{ margin: 0, color: 'var(--text-dim)' }}>Notre équipe de support est disponible sur WhatsApp.</p>
                </div>
                <a 
                  href="https://wa.me/212600000000" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: '#25D366', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: '600' }}
                >
                  <MessageSquare size={20} />
                  Contacter le support
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, badge }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} style={{ position: 'relative' }}>
      {icon}
      <span>{label}</span>
      {badge > 0 && (
        <div style={{ position: 'absolute', right: '12px', background: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '20px' }}>
          {badge}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, subtitle }) {
  return (
    <div className="glass stat-card">
      <span className="stat-label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span className="stat-value">{value}</span>
        {subtitle && <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>{subtitle}</span>}
      </div>
    </div>
  );
}

export default App;

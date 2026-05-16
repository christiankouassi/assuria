import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { 
  MessageSquare, 
  ShieldAlert, 
  FileText, 
  Users, 
  LayoutDashboard,
  Search,
  Bell,
  User,
  Send,
  Cpu,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function App() {
  const [activeTab, setActiveTab] = useState('conversations');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiMode, setAiMode] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [data, setData] = useState({
    conversations: [],
    claims: [],
    quotes: []
  });
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchData();
    
    // Subscribe to changes
    const channels = [
      supabase.channel('conversations').on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchData).subscribe(),
      supabase.channel('claims').on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchData).subscribe(),
      supabase.channel('quotes').on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, fetchData).subscribe(),
      supabase.channel('messages').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (selectedConversation && payload.new.conversation_id === selectedConversation.id) {
          setChatMessages(prev => [...prev, payload.new]);
        }
      }).subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const fetchData = async () => {
    const [convs, clms, qts] = await Promise.all([
      supabase.from('conversations').select('*').order('last_message_at', { ascending: false }),
      supabase.from('claims').select('*, conversations(user_identifier)').order('created_at', { ascending: false }),
      supabase.from('quotes').select('*, conversations(user_identifier)').order('created_at', { ascending: false })
    ]);

    setData({
      conversations: convs.data || [],
      claims: clms.data || [],
      quotes: qts.data || []
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

    const msgToSave = {
      conversation_id: selectedConversation.id,
      sender: 'ai', // On simule une réponse AI ou on pourrait ajouter 'advisor' si le schéma le permettait
      content: newMessage
    };

    const { error } = await supabase.from('messages').insert([msgToSave]);
    if (!error) {
      setNewMessage('');
      // Note: Le message apparaîtra via l'abonnement temps réel
    }
  };

  // Stats calculators
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

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar glass">
        <div className="logo">
          <ShieldAlert size={32} />
          <span>Assuria AI</span>
        </div>
        
        <nav>
          <NavItem 
            active={activeTab === 'conversations'} 
            onClick={() => { setActiveTab('conversations'); setSelectedConversation(null); }}
            icon={<MessageSquare size={20} />}
            label="Messages"
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
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="glass" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-dim)' }}>
            <Search size={18} />
            <span style={{ fontSize: '14px' }}>Dashboard Conseiller</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Bell size={20} style={{ color: 'var(--text-dim)', cursor: 'pointer' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '30px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={18} />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>Conseiller</span>
            </div>
          </div>
        </header>

        {activeTab === 'conversations' ? (
          <div className="chat-layout">
            <div className="chat-list card-grid">
              {data.conversations.map(conv => (
                <div 
                  key={conv.id} 
                  className={`glass ${selectedConversation?.id === conv.id ? 'active-chat' : ''}`}
                  style={{ padding: '20px', cursor: 'pointer', borderLeft: selectedConversation?.id === conv.id ? '4px solid var(--primary)' : '1px solid var(--glass-border)' }}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700' }}>+{conv.user_identifier}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      {format(new Date(conv.last_message_at), 'HH:mm')}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {conv.platform === 'whatsapp' ? 'WhatsApp' : 'Web Widget'}
                  </p>
                </div>
              ))}
            </div>

            <div className="chat-detail glass">
              {selectedConversation ? (
                <>
                  <div className="chat-header" style={{ padding: '16px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '18px' }}>+{selectedConversation.user_identifier}</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-dim)' }}>ID: {selectedConversation.id.slice(0,8)}</p>
                    </div>
                    
                    <div className="switch-container">
                      <Cpu size={16} color={aiMode ? 'var(--primary)' : 'var(--text-dim)'} />
                      <label className="switch">
                        <input type="checkbox" checked={!aiMode} onChange={() => setAiMode(!aiMode)} />
                        <span className="slider"></span>
                      </label>
                      <UserCheck size={16} color={!aiMode ? 'var(--primary)' : 'var(--text-dim)'} />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>{aiMode ? 'MODE IA' : 'MODE CONSEILLER'}</span>
                    </div>
                  </div>

                  <div className="messages-container">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className={`message-bubble ${msg.sender === 'user' ? 'message-user' : 'message-ai'}`}>
                        {msg.content}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <form className="chat-input-area" onSubmit={handleSendMessage}>
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
                      style={{ padding: '0 20px', background: aiMode ? 'transparent' : 'var(--primary)', border: 'none', borderRadius: '12px', color: 'white', cursor: aiMode ? 'not-allowed' : 'pointer' }}
                      disabled={aiMode}
                    >
                      <Send size={18} />
                    </button>
                  </form>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                  Sélectionnez une conversation pour voir les messages
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'claims' ? (
          <div style={{ overflowY: 'auto' }}>
            <div className="stats-grid">
              <StatCard label="Total Sinistres" value={claimStats.total} />
              <StatCard label="Nouveaux" value={claimStats.new} />
              <StatCard label="En cours" value={claimStats.processing} />
              <StatCard label="Clôturés" value={claimStats.resolved} />
            </div>
            <div className="glass" style={{ padding: '10px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Statut</th>
                    <th>Description</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.claims.map(claim => (
                    <tr key={claim.id}>
                      <td style={{ fontWeight: '600' }}>#{claim.id.slice(0, 8)}</td>
                      <td>+{claim.conversations?.user_identifier}</td>
                      <td><span className={`status-badge status-${claim.status}`}>{claim.status}</span></td>
                      <td style={{ fontSize: '14px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {claim.description}
                      </td>
                      <td>{format(new Date(claim.created_at), 'd MMM yyyy', { locale: fr })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ overflowY: 'auto' }}>
            <div className="stats-grid">
              <StatCard label="Total Devis" value={quoteStats.total} />
              <StatCard label="Nouveaux" value={quoteStats.new} />
              <StatCard label="Envoyés" value={quoteStats.sent} />
              <StatCard label="Acceptés" value={quoteStats.accepted} />
            </div>
            <div className="glass" style={{ padding: '10px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quotes.map(quote => (
                    <tr key={quote.id}>
                      <td style={{ fontWeight: '600' }}>#{quote.id.slice(0, 8)}</td>
                      <td>+{quote.conversations?.user_identifier}</td>
                      <td>{quote.insurance_type.toUpperCase()}</td>
                      <td><span className={`status-badge status-${quote.status === 'sent' ? 'validated' : 'pending'}`}>{quote.status}</span></td>
                      <td>{format(new Date(quote.created_at), 'd MMM yyyy', { locale: fr })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="glass stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export default App;

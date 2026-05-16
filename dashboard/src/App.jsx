import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  MessageSquare, 
  ShieldAlert, 
  FileText, 
  Users, 
  LayoutDashboard,
  Search,
  Bell,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function App() {
  const [activeTab, setActiveTab] = useState('conversations');
  const [data, setData] = useState({
    conversations: [],
    claims: [],
    quotes: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Subscribe to changes
    const channels = [
      supabase.channel('conversations').on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchData).subscribe(),
      supabase.channel('claims').on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchData).subscribe(),
      supabase.channel('quotes').on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, fetchData).subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  const fetchData = async () => {
    const [convs, clms, qts] = await Promise.all([
      supabase.from('conversations').select('*').order('last_interaction', { ascending: false }),
      supabase.from('claims').select('*').order('created_at', { ascending: false }),
      supabase.from('quotes').select('*').order('created_at', { ascending: false })
    ]);

    setData({
      conversations: convs.data || [],
      claims: clms.data || [],
      quotes: qts.data || []
    });
    setLoading(false);
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
            onClick={() => setActiveTab('conversations')}
            icon={<MessageSquare size={20} />}
            label="Conversations"
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
            <input 
              type="text" 
              placeholder="Rechercher..." 
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '200px' }}
            />
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

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="card-grid"
          >
            {activeTab === 'conversations' && data.conversations.map(conv => (
              <ConversationCard key={conv.id} conv={conv} />
            ))}
            {activeTab === 'claims' && data.claims.map(claim => (
              <ClaimCard key={claim.id} claim={claim} />
            ))}
            {activeTab === 'quotes' && data.quotes.map(quote => (
              <QuoteCard key={quote.id} quote={quote} />
            ))}
            
            {(!loading && data[activeTab].length === 0) && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>
                Aucune donnée trouvée dans cette section.
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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

function ConversationCard({ conv }) {
  return (
    <div className="glass" style={{ padding: '20px', cursor: 'pointer' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontWeight: '700', fontSize: '18px' }}>+{conv.user_phone}</span>
        <span className={`status-badge status-${conv.status === 'active' ? 'validated' : 'pending'}`}>
          {conv.status}
        </span>
      </div>
      <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
        Dernière activité : {format(new Date(conv.last_interaction), 'HH:mm, d MMM', { locale: fr })}
      </p>
    </div>
  );
}

function ClaimCard({ claim }) {
  return (
    <div className="glass" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontWeight: '700' }}>Sinistre #{claim.id.slice(0, 8)}</span>
        <span className={`status-badge status-${claim.status}`}>
          {claim.status}
        </span>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Client</p>
        <p style={{ fontWeight: '500' }}>+{claim.user_phone}</p>
      </div>
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Détails</p>
        <p style={{ fontSize: '14px' }}>{claim.details.description || 'Voir les détails JSON'}</p>
      </div>
    </div>
  );
}

function QuoteCard({ quote }) {
  return (
    <div className="glass" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontWeight: '700' }}>Devis {quote.insurance_type.toUpperCase()}</span>
        <span className={`status-badge status-${quote.status === 'sent' ? 'validated' : 'pending'}`}>
          {quote.status}
        </span>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Client</p>
        <p style={{ fontWeight: '500' }}>+{quote.user_phone}</p>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '10px' }}>
        Reçu le {format(new Date(quote.created_at), 'd MMMM yyyy', { locale: fr })}
      </p>
    </div>
  );
}

export default App;

-- Schema for Assuria WhatsApp AI Agent

-- 0. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE NOT NULL,
    whatsapp_phone_number_id TEXT UNIQUE,
    whatsapp_token TEXT NOT NULL,
    whatsapp_verify_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_identifier TEXT NOT NULL UNIQUE,
    client_profile JSONB DEFAULT '{}'::jsonb, -- Profil client persistant (nom, immatriculation, etc.)
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active', -- active, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender TEXT NOT NULL, -- 'user', 'ai', 'advisor'
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text', -- text, image, document
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Claims (Sinistres) Table
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    user_phone TEXT NOT NULL,
    details JSONB NOT NULL, -- detailed claim info (policy number, description, location, etc.)
    status TEXT DEFAULT 'pending', -- pending, under_review, validated, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Quotes (Devis) Table
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    user_phone TEXT NOT NULL,
    insurance_type TEXT NOT NULL, -- auto, home, health, life
    details JSONB NOT NULL, -- vehicle info, house info, etc.
    status TEXT DEFAULT 'pending', -- pending, sent, converted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) - Basic setup
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for advisor access (assuming authenticated advisors)
-- For now, we allow all for simplicity in development, but in production, we should restrict to authenticated roles.
CREATE POLICY "Allow all for authenticated" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON claims FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON quotes FOR ALL USING (true);

-- Enable Realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_check;
ALTER TABLE messages ADD CONSTRAINT messages_sender_check 
CHECK (sender IN ('user', 'ai', 'advisor'));

ALTER TABLE claims ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_description TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS client_profile JSONB DEFAULT '{}'::jsonb;

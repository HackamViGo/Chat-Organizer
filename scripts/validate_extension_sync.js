
const { createClient } = require('@supabase/supabase-js');
// Polyfill fetch for older node versions if needed, though likely not needed in this env
// import fetch from 'node-fetch'; 

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const DASHBOARD_URL = 'http://localhost:3000';

async function runValidation() {
    console.log('🚀 Starting Data Validation Script...');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.error('❌ Missing Supabase environment variables');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Create a fresh test user
    const testEmail = `validate_user_${Date.now()}@test.com`;
    const testPassword = 'password123';
    
    console.log(`👤 Creating test user: ${testEmail}...`);
    
    const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword
    });

    if (signUpError) {
        console.error('❌ Sign Up failed:', signUpError.message);
        process.exit(1);
    }
    
    let accessToken;
    
    if (session) {
        accessToken = session.access_token;
        console.log('✅ User Created & Authenticated.');
    } else if (user) {
        console.warn('⚠️ User created but email confirmation required. Attempting to sign in anyway (might fail)...');
        // In local dev, email confirmation might be off or we can use the user object if we had service role
        // For now, let's try to sign in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword
        });
        
        if (signInError || !signInData.session) {
             console.error('❌ Could not sign in (check email confirmation settings):', signInError?.message);
             process.exit(1);
        }
        accessToken = signInData.session.access_token;
        console.log('✅ Authenticated after sign in.');
    }

    // 2. Simulate Extension Save (POST)
    const testChat = {
        title: 'Test Extension Sync',
        content: 'Formatted content summary...',
        platform: 'gemini',
        url: 'https://gemini.google.com/app/test_sync_id_123',
        messages: [
            { role: 'user', content: 'Hello Gemini', timestamp: Date.now() },
            { role: 'assistant', content: 'Hello! **I am ready**.', timestamp: Date.now() + 1000 }
        ]
    };

    console.log('💾 Simulating Extension Save (POST /api/chats)...');
    const saveRes = await fetch(`${DASHBOARD_URL}/api/chats`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(testChat)
    });

    if (!saveRes.ok) {
        console.error('❌ Save failed:', await saveRes.text());
        process.exit(1);
    }

    const savedChat = await saveRes.json();
    console.log('✅ Chat Saved (ID:', savedChat.id, ')');
    
    // 3. Verify Data Integrity
    if (savedChat.messages && savedChat.messages.length === 2 && savedChat.source_id === 'test_sync_id_123') {
        console.log('✅ Data Integrity Check Passed (Messages & Source ID)');
    } else {
        console.error('❌ Data Integrity Check Failed:', {
            messagesLength: savedChat.messages?.length,
            sourceId: savedChat.source_id
        });
    }

    // 4. Simulate Update (Duplicate URL)
    console.log('🔄 Simulating Update (Same URL)...');
    const updateChat = {
        ...testChat,
        title: 'Test Extension Sync (Updated)',
        messages: [...testChat.messages, { role: 'user', content: 'Update this!', timestamp: Date.now() + 2000 }]
    };

    const updateRes = await fetch(`${DASHBOARD_URL}/api/chats`, {
        method: 'POST', // The extension uses POST even for updates relying on upsert logic we added
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(updateChat)
    });

    if (!updateRes.ok) {
        console.error('❌ Update failed:', await updateRes.text());
        process.exit(1);
    }

    const updatedChatResult = await updateRes.json();
    
    if (updatedChatResult.id === savedChat.id) {
        console.log('✅ Update Verified: ID matched (Upsert worked)');
    } else {
        console.error('❌ Update Failed: Created new ID instead of updating', updatedChatResult.id, '!==', savedChat.id);
    }

    if (updatedChatResult.title === 'Test Extension Sync (Updated)' && updatedChatResult.messages.length === 3) {
        console.log('✅ Content Verified: Title and Messages updated');
    } else {
        console.error('❌ Content Verification Failed');
    }

    console.log('🎉 Validation Complete!');
}

runValidation().catch(console.error);

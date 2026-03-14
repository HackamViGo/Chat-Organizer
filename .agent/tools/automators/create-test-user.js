import { createClient } from '@supabase/supabase-js';

// Setup supabase
const supabaseUrl = 'https://uuwnefffuitkskdsljpv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1d25lZmZmdWl0a3NrZHNsanB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNjg5ODUsImV4cCI6MjA4Nzk0NDk4NX0.GQs2soMwrG59r0sKgFUKejZZisP7k-y1KR0WnSEXZLU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestAccount() {
  const email = 'testuser123@brainbox.bg';
  const password = 'Password@123!';
  console.log(`Attempting to create user: ${email} ...`);

  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        full_name: 'Test Account 123',
      }
    }
  });

  if (error) {
    console.error('Failed to create account:', error.message);
  } else {
    console.log('Successfully created test account!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Session exists?', !!data.session);
    console.log('User ID:', data.user?.id);
    if (!data.session) {
      console.log('Note: A session was not returned. The backend might require email verification (magic link).');
    }
  }
}

createTestAccount();

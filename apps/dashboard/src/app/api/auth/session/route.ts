import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ user: null, isPro: false }, { status: 401 });
  }

  // Pro status from DB, NOT from client
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .returns<{ subscription_tier: string }[]>()
    .single();

  const isPro = profile?.subscription_tier === 'pro' 
             || profile?.subscription_tier === 'ultra';

  return NextResponse.json({ user, isPro });
}

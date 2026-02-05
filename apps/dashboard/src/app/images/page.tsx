import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ImagesPage } from '@/components/features/images/ImagesPage';
import { Suspense } from 'react';

export default async function ImagesRoute() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }
  
  // Feature was previously disabled, now enabled with optimization
  return <ImagesPage userId={user.id} />;
}

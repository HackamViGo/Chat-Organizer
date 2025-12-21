import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ImagesPage } from '@/components/features/images/ImagesPage';

export default async function ImagesRoute() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }
  
  return <ImagesPage />;
}

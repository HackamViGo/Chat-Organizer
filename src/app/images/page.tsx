import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ImagesPage } from '@/components/features/images/ImagesPage';
import { Suspense } from 'react';

export default async function ImagesRoute() {
  // Auth disabled for local development
  // const supabase = createServerSupabaseClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) {
  //   redirect('/auth/signin');
  // }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ImagesPage />
    </Suspense>
  );
}

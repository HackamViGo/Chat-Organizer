import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ImagesPage } from '@/components/features/images/ImagesPage';
import { Suspense } from 'react';

export default async function ImagesRoute() {
  // Feature disabled per user request
  redirect('/');
  
  return null;
}

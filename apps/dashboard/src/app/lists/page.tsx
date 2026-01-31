import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ListsPage } from '@/components/features/lists/ListsPage';

export const metadata = {
  title: 'Lists | Mega-Pack AI Studio',
  description: 'Manage your task lists',
};

export default async function ListsPageWrapper() {
  // Auth disabled for local development
  // const supabase = createServerSupabaseClient();
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) {
  //   redirect('/auth/signin');
  // }
  
  // Fetch initial data (disabled for now - no user)
  // const { data: lists } = await supabase
  //   .from('lists')
  //   .select(`
  //     *,
  //     items:list_items(*)
  //   `)
  //   .eq('user_id', user.id)
  //   .order('created_at', { ascending: false });
  
  return <ListsPage initialLists={[]} />;
}

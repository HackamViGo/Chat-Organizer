import { Suspense } from 'react';
import { ChatStudio } from '@/components/features/chats/ChatStudio';

export default function StudioPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">Loading...</div>
      </div>
    }>
      <ChatStudio />
    </Suspense>
  );
}

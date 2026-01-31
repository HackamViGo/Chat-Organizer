import { redirect } from 'next/navigation';

export default function ChatRedirect({ params }: { params: { id: string } }) {
  redirect(`/chats?id=${params.id}`);
}

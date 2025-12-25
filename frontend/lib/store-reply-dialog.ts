import { create } from 'zustand';

interface ReplyDialogState {
  isOpen: boolean;
  postId: string | null;
  parentReplyId: string | null;
  parentUsername: string | null;
  open: (postId: string, parentReplyId: string, parentUsername: string) => void;
  close: () => void;
}

export const useReplyDialogStore = create<ReplyDialogState>((set) => ({
  isOpen: false,
  postId: null,
  parentReplyId: null,
  parentUsername: null,
  open: (postId, parentReplyId, parentUsername) =>
    set({ isOpen: true, postId, parentReplyId, parentUsername }),
  close: () => set({ isOpen: false, postId: null, parentReplyId: null, parentUsername: null }),
}));

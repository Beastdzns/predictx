'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ArrowBigUp, ArrowBigDown, Send, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useReplyDialogStore } from '@/lib/store-reply-dialog';

interface Reply {
  _id: string;
  username: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  replies: Reply[];
}

interface Post {
  _id: string;
  username: string;
  content: string;
  imageUrl?: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  replies: Reply[];
}

// Separate Reply Component to prevent re-renders
const ReplyItem = memo(({ 
  reply, 
  postId, 
  depth = 0,
  formatTime,
  onRefresh
}: { 
  reply: Reply; 
  postId: string; 
  depth?: number;
  formatTime: (date: string) => string;
  onRefresh: () => void;
}) => {
  const openReplyDialog = useReplyDialogStore((state) => state.open);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${depth > 0 ? 'ml-6 border-l-2 border-white/10 pl-4' : ''} mt-3`}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 text-sm font-semibold">@{reply.username}</span>
          <span className="text-white/40 text-xs">{formatTime(reply.createdAt)}</span>
        </div>
        <p className="text-white/80 text-sm leading-relaxed">{reply.content}</p>
        {reply.imageUrl && (
          <img src={reply.imageUrl} alt="Reply" className="max-w-md w-full h-48 object-contain rounded border border-white/10" />
        )}
        <button
          onClick={() => openReplyDialog(postId, reply._id, reply.username)}
          className="text-white/50 hover:text-yellow-400 text-xs transition-colors"
        >
          Reply
        </button>
      </div>

      {reply.replies && reply.replies.map((r, idx) => (
        <ReplyItem 
          key={r._id || `${reply._id}-${idx}`} 
          reply={r} 
          postId={postId} 
          depth={depth + 1}
          formatTime={formatTime}
          onRefresh={onRefresh}
        />
      ))}
    </motion.div>
  );
});

ReplyItem.displayName = 'ReplyItem';

export default function SocialPage() {
  const [username, setUsername] = useState<string>('');
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ postId: string; parentReplyId?: string } | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState('');

  // Check for username in localStorage
  useEffect(() => {
    const storedUsername = localStorage.getItem('socialUsername');
    if (storedUsername) {
      setUsername(storedUsername);
    } else {
      setShowUsernameModal(true);
    }
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const saveUsername = () => {
    if (tempUsername.trim()) {
      localStorage.setItem('socialUsername', tempUsername.trim());
      setUsername(tempUsername.trim());
      setShowUsernameModal(false);
    }
  };

  const createPost = async () => {
    if (!newPostContent.trim()) return;

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          content: newPostContent,
          imageUrl: newPostImage || null,
        }),
      });

      if (response.ok) {
        setNewPostContent('');
        setNewPostImage('');
        fetchPosts();
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const addReply = async () => {
    if (!replyContent.trim() || !replyingTo) return;

    try {
      const response = await fetch(`/api/posts/${replyingTo.postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          content: replyContent,
          imageUrl: replyImage || null,
          parentReplyId: replyingTo.parentReplyId,
        }),
      });

      if (response.ok) {
        setReplyContent('');
        setReplyImage('');
        setReplyingTo(null);
        fetchPosts();
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const vote = async (postId: string, voteType: 'up' | 'down') => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: voteType }),
      });

      if (response.ok) {
        fetchPosts();
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const formatTime = useCallback((date: string) => {
    const now = new Date();
    const posted = new Date(date);
    const diff = now.getTime() - posted.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }, []);

  const handleReply = useCallback((postId: string, parentReplyId: string) => {
    setReplyingTo({ postId, parentReplyId });
  }, []);

  return (
    <div className="pb-24 px-4 max-w-4xl mx-auto">
      {/* Username Modal */}
      <Dialog open={showUsernameModal} onOpenChange={() => {}}>
        <DialogContent className="bg-zinc-900 border-yellow-400/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Choose Your Username</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter username..."
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-yellow-400/50"
              onKeyDown={(e) => e.key === 'Enter' && saveUsername()}
            />
            <Button
              onClick={saveUsername}
              className="w-full bg-yellow-400 text-black hover:bg-yellow-500"
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <h1 className="text-3xl font-bold text-yellow-400 mb-8">Community Feed</h1>

      {/* Create Post */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-2 mb-6 space-y-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-semibold">@{username}</span>
        </div>
        <textarea
          placeholder="What's on your mind?"
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          className="w-full bg-zinc-800 border border-white/10 rounded px-4 py-3 text-white resize-none focus:outline-none focus:border-yellow-400/50"
          rows={3}
        />
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Image URL (optional)"
            value={newPostImage}
            onChange={(e) => setNewPostImage(e.target.value)}
            className="flex-1 bg-zinc-800 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50"
          />
          <Button onClick={createPost} className="bg-yellow-400 text-black hover:bg-yellow-500">
            <Send className="w-4 h-4 mr-2" />
            Post
          </Button>
        </div>
      </motion.div>

      {/* Posts */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-white/40 py-12">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-white/40 py-12">No posts yet. Be the first to post!</div>
        ) : (
          posts.map((post, idx) => (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedPost(post)}
              className="border-b border-white/10 p-4 space-y-3 cursor-pointer hover:border-yellow-400/30 transition-colors"
            >
              {/* Post Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-semibold">@{post.username}</span>
                  <span className="text-white/40 text-xs">{formatTime(post.createdAt)}</span>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-white leading-relaxed">{post.content}</p>
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post"
                  className="max-w-full w-full h-64 object-contain rounded border border-white/10"
                />
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    vote(post._id, 'up');
                  }}
                  className="flex items-center gap-1 text-white/50 hover:text-green-400 transition-colors"
                >
                  <ArrowBigUp className="w-5 h-5" />
                  <span className="text-sm">{post.upvotes}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    vote(post._id, 'down');
                  }}
                  className="flex items-center gap-1 text-white/50 hover:text-red-400 transition-colors"
                >
                  <ArrowBigDown className="w-5 h-5" />
                  <span className="text-sm">{post.downvotes}</span>
                </button>
                <div className="flex items-center gap-1 text-white/50">
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-sm">{post.replies.length}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="bg-zinc-900 border-yellow-400/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPost && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-yellow-400 font-semibold">@{selectedPost.username}</span>
                  <span className="text-white/40 text-xs">{formatTime(selectedPost.createdAt)}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Post Content */}
                <p className="text-white leading-relaxed text-lg">{selectedPost.content}</p>
                {selectedPost.imageUrl && (
                  <img
                    src={selectedPost.imageUrl}
                    alt="Post"
                    className="max-w-full w-full h-96 object-contain rounded border border-white/10"
                  />
                )}

                {/* Voting */}
                <div className="flex items-center gap-4 py-2 border-y border-white/5">
                  <button
                    onClick={() => {
                      vote(selectedPost._id, 'up');
                      const updated = posts.map(p => 
                        p._id === selectedPost._id ? { ...p, upvotes: p.upvotes + 1 } : p
                      );
                      setPosts(updated);
                      setSelectedPost({ ...selectedPost, upvotes: selectedPost.upvotes + 1 });
                    }}
                    className="flex items-center gap-1 text-white/50 hover:text-green-400 transition-colors"
                  >
                    <ArrowBigUp className="w-5 h-5" />
                    <span className="text-sm">{selectedPost.upvotes}</span>
                  </button>
                  <button
                    onClick={() => {
                      vote(selectedPost._id, 'down');
                      const updated = posts.map(p => 
                        p._id === selectedPost._id ? { ...p, downvotes: p.downvotes + 1 } : p
                      );
                      setPosts(updated);
                      setSelectedPost({ ...selectedPost, downvotes: selectedPost.downvotes + 1 });
                    }}
                    className="flex items-center gap-1 text-white/50 hover:text-red-400 transition-colors"
                  >
                    <ArrowBigDown className="w-5 h-5" />
                    <span className="text-sm">{selectedPost.downvotes}</span>
                  </button>
                  <div className="flex items-center gap-1 text-white/50">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-sm">{selectedPost.replies.length} replies</span>
                  </div>
                </div>

                {/* Reply Input */}
                <div className="space-y-2 pt-2">
                  <textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-yellow-400/50"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Image URL (optional)"
                      value={replyImage}
                      onChange={(e) => setReplyImage(e.target.value)}
                      className="flex-1 bg-zinc-800 border border-white/10 rounded px-3 py-1.5 text-white text-xs focus:outline-none focus:border-yellow-400/50"
                    />
                    <Button 
                      onClick={async () => {
                        if (!replyContent.trim()) return;
                        try {
                          const response = await fetch(`/api/posts/${selectedPost._id}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              username,
                              content: replyContent,
                              imageUrl: replyImage || null,
                            }),
                          });
                          if (response.ok) {
                            setReplyContent('');
                            setReplyImage('');
                            await fetchPosts();
                            const updatedPosts = await fetch('/api/posts').then(r => r.json());
                            setSelectedPost(updatedPosts.find((p: Post) => p._id === selectedPost._id));
                          }
                        } catch (error) {
                          console.error('Error adding reply:', error);
                        }
                      }} 
                      size="sm" 
                      className="bg-yellow-400 text-black hover:bg-yellow-500"
                    >
                      Reply
                    </Button>
                  </div>
                </div>

                {/* Replies */}
                {selectedPost.replies.length > 0 && (
                  <div className="pt-4 space-y-2 border-t border-white/10">
                    <h3 className="text-white/60 text-sm font-semibold mb-3">Replies</h3>
                    {selectedPost.replies.map((reply, idx) => (
                      <ReplyItem 
                        key={reply._id || `${selectedPost._id}-reply-${idx}`} 
                        reply={reply} 
                        postId={selectedPost._id}
                        formatTime={formatTime}
                        onRefresh={async () => {
                          await fetchPosts();
                          const updatedPosts = await fetch('/api/posts').then(r => r.json());
                          setSelectedPost(updatedPosts.find((p: Post) => p._id === selectedPost._id));
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested Reply Dialog */}
      <ReplyDialog username={username} onRefresh={async () => {
        await fetchPosts();
        if (selectedPost) {
          const updatedPosts = await fetch('/api/posts').then(r => r.json());
          setSelectedPost(updatedPosts.find((p: Post) => p._id === selectedPost._id));
        }
      }} />
    </div>
  );
}

// Reply Dialog Component
function ReplyDialog({ username, onRefresh }: { username: string; onRefresh: () => void }) {
  const { isOpen, postId, parentReplyId, parentUsername, close } = useReplyDialogStore();
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!replyContent.trim() || !postId) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          content: replyContent,
          imageUrl: replyImage || null,
          parentReplyId,
        }),
      });

      if (response.ok) {
        setReplyContent('');
        setReplyImage('');
        close();
        onRefresh();
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="bg-zinc-900 border-yellow-400/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-yellow-400">
            Reply to @{parentUsername}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <textarea
            placeholder="Write your reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 rounded px-4 py-3 text-white resize-none focus:outline-none focus:border-yellow-400/50 min-h-30"
            autoFocus
          />
          <input
            type="text"
            placeholder="Image URL (optional)"
            value={replyImage}
            onChange={(e) => setReplyImage(e.target.value)}
            className="w-full bg-zinc-800 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-yellow-400/50"
          />
          <div className="flex gap-2 justify-end">
            <Button
              onClick={close}
              variant="outline"
              className="border-white/20 bg-red-400/10 text-white hover:bg-red-500/20"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-yellow-400 text-black hover:bg-yellow-500"
              disabled={submitting || !replyContent.trim()}
            >
              {submitting ? 'Posting...' : 'Post Reply'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

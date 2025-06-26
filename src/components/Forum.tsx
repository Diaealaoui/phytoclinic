import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Send, Loader2, User, Clock, ArrowLeft, Camera, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

type ForumPost = {
  id: string;
  title: string;
  content: string;
  author_email: string;
  created_at: string;
  image_url?: string;
  users?: {
    name: string;
  };
};

type ForumReply = {
  id: string;
  post_id: string;
  content: string;
  author_email: string;
  created_at: string;
  image_url?: string;
  users?: {
    name: string;
  };
};

const Forum: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string>('');
  const [replyContent, setReplyContent] = useState('');
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyImagePreview, setReplyImagePreview] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeForum();
  }, []);

  const initializeForum = async () => {
    await getCurrentUser();
    await fetchForumData();
  };

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: userProfile } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();
        setCurrentUserProfile(userProfile);
      }
    } catch (error) {
      console.error('❌ Error getting user:', error);
    }
  };

  const fetchForumData = async () => {
    setLoading(true);
    try {
      // Fetch posts
      const { data: postsData } = await supabase
        .from('forum_posts')
        .select('*')
        .order('created_at', { ascending: false });

      setPosts(postsData || []);

      // Fetch replies
      const { data: repliesData } = await supabase
        .from('forum_replies')
        .select('*')
        .order('created_at', { ascending: true });

      setReplies(repliesData || []);
      
    } catch (error) {
      console.error('❌ Forum data fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `forum-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('forum-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('forum-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      return null;
    }
  };

  const handleImageSelect = (file: File, isReply: boolean = false) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive',
      });
      return;
    }

    const preview = URL.createObjectURL(file);
    if (isReply) {
      setReplyImage(file);
      setReplyImagePreview(preview);
    } else {
      setNewImage(file);
      setNewImagePreview(preview);
    }
  };

  const createPost = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    if (!currentUser) return;

    try {
      let imageUrl = null;
      if (newImage) {
        imageUrl = await uploadImage(newImage);
      }

      const { error } = await supabase.from('forum_posts').insert({
        title: newTitle.trim(),
        content: newContent.trim(),
        author_email: currentUser.email,
        image_url: imageUrl
      });

      if (error) throw error;

      toast({ title: 'Success!', description: 'Your question has been posted.' });
      
      setNewTitle('');
      setNewContent('');
      setNewImage(null);
      setNewImagePreview('');
      setShowNewPost(false);
      
      await fetchForumData();
    } catch (error: any) {
      toast({
        title: 'Error Creating Post',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const addReply = async () => {
    if (!replyContent.trim() || !selectedConversation) return;
    if (!currentUser) return;

    try {
      let imageUrl = null;
      if (replyImage) {
        imageUrl = await uploadImage(replyImage);
      }

      const { error } = await supabase.from('forum_replies').insert({
        post_id: selectedConversation,
        content: replyContent.trim(),
        author_email: currentUser.email,
        image_url: imageUrl
      });
      
      if (error) throw error;

      setReplyContent('');
      setReplyImage(null);
      setReplyImagePreview('');
      await fetchForumData();
    } catch (error: any) {
      toast({ 
        title: 'Error Adding Reply', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  };

  const getPostReplies = (postId: string) => replies.filter(r => r.post_id === postId);
  const getLastReply = (postId: string) => {
    const postReplies = getPostReplies(postId);
    return postReplies[postReplies.length - 1];
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  // WhatsApp Conversation View
  if (selectedConversation) {
    const post = posts.find(p => p.id === selectedConversation);
    const postReplies = getPostReplies(selectedConversation);
    
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        {/* WhatsApp Chat Header */}
        <div className="bg-green-600 text-white p-4 flex items-center gap-3 shadow-lg">
          <Button 
            onClick={() => setSelectedConversation(null)} 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-green-700 p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold truncate">{post?.title}</h2>
            <p className="text-xs text-green-100">
              {postReplies.length} message{postReplies.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* WhatsApp Messages */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {/* Original Question */}
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-white rounded-lg p-4 shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <User className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold text-green-700 text-sm">
                  {post?.author_email?.split('@')[0] || 'Anonymous'}
                </span>
                <span className="text-xs text-gray-500">
                  {post?.created_at && formatTime(post.created_at)}
                </span>
              </div>
              <p className="text-gray-800 whitespace-pre-wrap mb-2">{post?.content}</p>
              {post?.image_url && (
                <img 
                  src={post.image_url} 
                  alt="Question image" 
                  className="max-w-full h-auto rounded-lg mt-2"
                />
              )}
            </div>
          </div>

          {/* Replies */}
          {postReplies.map((reply) => {
            const isMyReply = reply.author_email === currentUser?.email;
            return (
              <div key={reply.id} className={`flex ${isMyReply ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${
                  isMyReply 
                    ? 'bg-green-500 text-white' 
                    : 'bg-white text-gray-800'
                } rounded-lg p-3 shadow-md`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      isMyReply ? 'bg-green-600' : 'bg-gray-300'
                    }`}>
                      <User className={`w-3 h-3 ${isMyReply ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <span className={`font-medium text-xs ${
                      isMyReply ? 'text-green-100' : 'text-gray-600'
                    }`}>
                      {reply.author_email?.split('@')[0] || 'Anonymous'}
                      {isMyReply && ' (You)'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap mb-1">{reply.content}</p>
                  {reply.image_url && (
                    <img 
                      src={reply.image_url} 
                      alt="Reply image" 
                      className="max-w-full h-auto rounded-lg mt-2"
                    />
                  )}
                  <span className={`text-xs ${
                    isMyReply ? 'text-green-200' : 'text-gray-400'
                  }`}>
                    {formatTime(reply.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* WhatsApp Reply Input */}
        <div className="p-4 bg-gray-200">
          {replyImagePreview && (
            <div className="mb-2 relative inline-block">
              <img src={replyImagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
              <Button
                onClick={() => {
                  setReplyImage(null);
                  setReplyImagePreview('');
                }}
                size="sm"
                className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 rounded-full"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0], true)}
              className="hidden"
              id="reply-image-upload"
            />
            <Button
              onClick={() => document.getElementById('reply-image-upload')?.click()}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              <Camera className="w-4 h-4" />
            </Button>
            <div className="flex-1 bg-white rounded-full p-2 flex items-end gap-2">
              <Textarea
                placeholder="Type a message..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={1}
                className="border-0 resize-none text-sm focus:ring-0 bg-transparent flex-1 min-h-[40px] max-h-[120px]"
                style={{ boxShadow: 'none' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <Button 
                onClick={addReply} 
                size="sm" 
                className="bg-green-600 hover:bg-green-700 rounded-full w-10 h-10 p-0"
                disabled={!replyContent.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // WhatsApp Conversations List
  return (
    <div className="min-h-screen bg-gray-100">
      {/* WhatsApp Header */}
      <div className="bg-green-600 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate('/dashboard')} 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-green-700 p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">Forum</h1>
        </div>
        <Button 
          onClick={() => setShowNewPost(true)} 
          variant="ghost"
          size="sm"
          className="text-white hover:bg-green-700"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* New Question Modal */}
      {showNewPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Ask a Question</h3>
            <div className="space-y-4">
              <Input 
                placeholder="Question title..." 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea 
                placeholder="Describe your question..." 
                value={newContent} 
                onChange={(e) => setNewContent(e.target.value)} 
                rows={4}
              />
              
              {newImagePreview && (
                <div className="relative inline-block">
                  <img src={newImagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
                  <Button
                    onClick={() => {
                      setNewImage(null);
                      setNewImagePreview('');
                    }}
                    size="sm"
                    className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-red-500 hover:bg-red-600 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
                  className="hidden"
                  id="post-image-upload"
                />
                <Button
                  onClick={() => document.getElementById('post-image-upload')?.click()}
                  variant="outline"
                  size="sm"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Add Image
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={createPost}>Post Question</Button>
                <Button onClick={() => setShowNewPost(false)} variant="outline">Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Conversations List */}
      <div className="max-w-2xl mx-auto bg-white">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No conversations yet</h3>
            <Button onClick={() => setShowNewPost(true)} className="bg-green-600 hover:bg-green-700">
              Start the first conversation
            </Button>
          </div>
        ) : (
          posts.map((post) => {
            const postReplies = getPostReplies(post.id);
            const lastReply = getLastReply(post.id);
            const lastMessage = lastReply || post;
            const unreadCount = 0; // You can implement unread logic later
            
            return (
              <div 
                key={post.id}
                onClick={() => setSelectedConversation(post.id)}
                className="p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(lastMessage.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600 truncate">
                      {lastReply ? (
                        <>
                          <span className="font-medium">
                            {lastReply.author_email?.split('@')[0]}:
                          </span>
                          {' '}{lastReply.content}
                        </>
                      ) : (
                        post.content
                      )}
                    </p>
                    
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {postReplies.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {postReplies.length}
                        </Badge>
                      )}
                      {unreadCount > 0 && (
                        <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white font-bold">{unreadCount}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Forum;
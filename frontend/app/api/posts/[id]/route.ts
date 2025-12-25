import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/lib/models/Post';
import mongoose from 'mongoose';

// Recursive function to find and add reply to nested structure
function addReplyToParent(replies: any[], parentReplyId: string, newReply: any): boolean {
  for (const reply of replies) {
    const replyId = reply._id ? reply._id.toString() : null;
    if (replyId === parentReplyId) {
      if (!reply.replies) {
        reply.replies = [];
      }
      reply.replies.push(newReply);
      return true;
    }
    if (reply.replies && reply.replies.length > 0) {
      if (addReplyToParent(reply.replies, parentReplyId, newReply)) {
        return true;
      }
    }
  }
  return false;
}

// POST reply to a post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { username, content, imageUrl, parentReplyId } = body;

    if (!username || !content) {
      return NextResponse.json(
        { error: 'Username and content are required' },
        { status: 400 }
      );
    }

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const newReply = {
      _id: new mongoose.Types.ObjectId(),
      username,
      content,
      imageUrl: imageUrl || null,
      createdAt: new Date(),
      replies: [],
    };

    if (parentReplyId) {
      // Find and add to nested reply
      const added = addReplyToParent(post.replies, parentReplyId, newReply);
      if (!added) {
        return NextResponse.json({ error: 'Parent reply not found' }, { status: 404 });
      }
    } else {
      // Add to post's top-level replies
      post.replies.push(newReply);
    }

    // Mark replies as modified for nested updates
    post.markModified('replies');
    await post.save();
    return NextResponse.json(post);
  } catch (error) {
    console.error('Error adding reply:', error);
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 });
  }
}

// PATCH vote on post
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { vote } = body; // 'up' or 'down'

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (vote === 'up') {
      post.upvotes += 1;
    } else if (vote === 'down') {
      post.downvotes += 1;
    }

    await post.save();
    return NextResponse.json(post);
  } catch (error) {
    console.error('Error voting:', error);
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 });
  }
}

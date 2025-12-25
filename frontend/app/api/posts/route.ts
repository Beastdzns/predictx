import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/lib/models/Post';

// GET all posts
export async function GET() {
  try {
    await dbConnect();
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

// POST new post
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const { username, content, imageUrl } = body;

    if (!username || !content) {
      return NextResponse.json(
        { error: 'Username and content are required' },
        { status: 400 }
      );
    }

    const post = await Post.create({
      username,
      content,
      imageUrl: imageUrl || null,
      upvotes: 0,
      downvotes: 0,
      replies: [],
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

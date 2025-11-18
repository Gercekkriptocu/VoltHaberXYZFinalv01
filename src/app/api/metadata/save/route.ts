import { NextRequest, NextResponse } from 'next/server';
import { saveMetadata, createNFTMetadata } from '@/lib/metadata-storage';

export const dynamic = 'force-dynamic';

/**
 * POST /api/metadata/save
 * 
 * Saves NFT metadata for a token ID
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      tokenId: string;
      title: string;
      content: string;
      date: string;
      newsId: string;
      language?: 'tr' | 'en';
      minterAddress?: string;
    };

    const { tokenId, title, content, date, newsId, language = 'tr', minterAddress } = body;

    // Validate required fields
    if (!tokenId || !title || !content || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenId, title, content, date' },
        { status: 400 }
      );
    }

    // Get the base URL for external_url
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    request.headers.get('origin') || 
                    'https://your-app.vercel.app';
    
    const newsUrl = `${baseUrl}/news/${newsId}`;

    // Create and save metadata
    const metadata = createNFTMetadata(
      tokenId,
      title,
      content,
      date,
      newsUrl,
      language,
      minterAddress,
      newsId
    );

    saveMetadata(metadata);

    console.log(`✅ Metadata saved for token ${tokenId}:`, {
      title,
      newsUrl
    });

    return NextResponse.json({
      success: true,
      tokenId,
      metadataUrl: `${baseUrl}/api/metadata/${tokenId}`
    });
  } catch (error) {
    console.error('Metadata save error:', error);
    return NextResponse.json(
      { error: 'Failed to save metadata' },
      { status: 500 }
    );
  }
}

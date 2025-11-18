import { NextRequest, NextResponse } from 'next/server';
import { getMetadata } from '@/lib/metadata-storage';

export const dynamic = 'force-dynamic';

/**
 * GET /api/metadata/[tokenId]
 * 
 * Returns OpenSea-compatible NFT metadata for a given token ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tokenId: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const { tokenId } = params;

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // Get metadata from storage
    const metadata = getMetadata(tokenId);

    if (!metadata) {
      return NextResponse.json(
        {
          error: 'Metadata not found',
          message: `Token ID ${tokenId} henüz mint edilmemiş veya metadata kaydedilmemiş.`,
          tokenId
        },
        { status: 404 }
      );
    }

    // Return OpenSea-compatible metadata
    return NextResponse.json({
      name: metadata.name,
      description: metadata.description,
      image: metadata.image,
      external_url: metadata.external_url,
      attributes: metadata.attributes
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
  } catch (error) {
    console.error('Metadata API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

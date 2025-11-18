import { NextRequest, NextResponse } from 'next/server';

interface FileData {
  path: string;
  content: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: Array<{
    path: string;
    mode: string;
    type: string;
    sha: string;
    size: number;
    url: string;
  }>;
}

interface GitHubCommitResponse {
  sha: string;
  url: string;
}

interface GitHubRefResponse {
  ref: string;
  url: string;
  object: {
    sha: string;
    type: string;
    url: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { token, repoName, repoDescription, files } = await request.json() as {
      token: string;
      repoName: string;
      repoDescription: string;
      files: FileData[];
    };

    if (!token || !repoName) {
      return NextResponse.json(
        { error: 'Token ve repo adı gereklidir' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Hiç dosya gönderilmedi' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting GitHub export...');
    console.log('📂 Total files to upload:', files.length);

    // 1. Get user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userRes.ok) {
      return NextResponse.json(
        { error: 'GitHub kullanıcı bilgileri alınamadı' },
        { status: 401 }
      );
    }

    const userData = await userRes.json() as { login: string };
    console.log('✅ GitHub user:', userData.login);

    // 2. Create new repository
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        description: repoDescription || 'VOLT - Turkish Crypto News Aggregator',
        private: false,
        auto_init: false,
      }),
    });

    if (!createRepoRes.ok) {
      const errorData = await createRepoRes.json() as { message: string };
      return NextResponse.json(
        { error: `Repository oluşturulamadı: ${errorData.message}` },
        { status: 400 }
      );
    }

    const repoData = await createRepoRes.json() as { html_url: string; default_branch: string };
    console.log('✅ Repository created:', repoData.html_url);

    // 3. Create blobs for each file
    const blobs: Array<{ path: string; mode: string; type: string; sha: string }> = [];
    const batchSize = 50;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      for (const file of batch) {
        try {
          console.log('📄 Processing:', file.path);
          
          const contentBase64 = Buffer.from(file.content).toString('base64');

          // Create blob
          const blobRes = await fetch(
            `https://api.github.com/repos/${userData.login}/${repoName}/git/blobs`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: contentBase64,
                encoding: 'base64',
              }),
            }
          );

          if (blobRes.ok) {
            const blobData = await blobRes.json() as { sha: string };
            blobs.push({
              path: file.path,
              mode: '100644',
              type: 'blob',
              sha: blobData.sha,
            });
            console.log('✅ Blob created for:', file.path);
          } else {
            console.error('❌ Failed to create blob for:', file.path);
          }
        } catch (error) {
          console.error(`❌ Error processing file ${file.path}:`, error);
          continue;
        }
      }
      
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (blobs.length === 0) {
      throw new Error('Hiç dosya yüklenemedi');
    }

    console.log('✅ Total blobs created:', blobs.length);

    // 4. Create tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${userData.login}/${repoName}/git/trees`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tree: blobs,
        }),
      }
    );

    if (!treeRes.ok) {
      const treeError = await treeRes.json() as { message: string };
      throw new Error(`Tree oluşturulamadı: ${treeError.message || 'Bilinmeyen hata'}`);
    }

    const treeData = await treeRes.json() as GitHubTreeResponse;
    console.log('✅ Tree created:', treeData.sha);

    // 5. Create commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${userData.login}/${repoName}/git/commits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Initial commit - VOLT App',
          tree: treeData.sha,
        }),
      }
    );

    if (!commitRes.ok) {
      throw new Error('Commit oluşturulamadı');
    }

    const commitData = await commitRes.json() as GitHubCommitResponse;
    console.log('✅ Commit created:', commitData.sha);

    // 6. Create main branch
    const refRes = await fetch(
      `https://api.github.com/repos/${userData.login}/${repoName}/git/refs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'refs/heads/main',
          sha: commitData.sha,
        }),
      }
    );

    if (!refRes.ok) {
      throw new Error('Branch referansı oluşturulamadı');
    }

    console.log('✅ Main branch created');
    console.log('🎉 GitHub export complete!');

    return NextResponse.json({
      success: true,
      repoUrl: repoData.html_url,
      message: 'Tüm kodlar başarıyla GitHub\'a aktarıldı!',
      filesUploaded: blobs.length,
    });

  } catch (error) {
    console.error('❌ GitHub export error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu' },
      { status: 500 }
    );
  }
}

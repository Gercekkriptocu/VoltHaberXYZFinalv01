import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

interface GitHubBlob {
  path: string
  mode: string
  type: string
  sha: string
}

interface FileContent {
  path: string
  content: string
}

// Files and directories to exclude - ONLY build artifacts, dependencies, and GitHub export button
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  'out',
  '.vercel',
  '.env',
  '.env.local',
  '.DS_Store',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'github-export-button.tsx', // Exclude the GitHub export button itself
]

// Binary file extensions to skip
const BINARY_EXTENSIONS = ['.woff', '.woff2', '.ttf', '.eot', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.mp4', '.mp3', '.pdf', '.zip', '.tar', '.gz']

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern))
}

function isBinaryFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return BINARY_EXTENSIONS.includes(ext)
}

function getAllFiles(dirPath: string, arrayOfFiles: FileContent[] = []): FileContent[] {
  try {
    const files = fs.readdirSync(dirPath)

    files.forEach(file => {
      const fullPath = path.join(dirPath, file)
      
      if (shouldExclude(fullPath)) {
        return
      }

      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles)
      } else {
        // Skip binary files
        if (isBinaryFile(fullPath)) {
          console.log(`Skipping binary file: ${fullPath}`)
          return
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf-8')
          arrayOfFiles.push({
            path: fullPath,
            content
          })
        } catch (err) {
          console.error(`Error reading file ${fullPath}:`, err)
        }
      }
    })

    return arrayOfFiles
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err)
    return arrayOfFiles
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { token, repoName, repoDescription } = await request.json() as {
      token: string
      repoName: string
      repoDescription: string
    }

    if (!token || !repoName) {
      return NextResponse.json(
        { error: 'Token ve repo adı gereklidir' },
        { status: 400 }
      )
    }

    console.log('🚀 Starting GitHub export...')

    // 1. Get GitHub user info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!userRes.ok) {
      return NextResponse.json(
        { error: 'GitHub kullanıcı bilgileri alınamadı' },
        { status: 401 }
      )
    }

    const userData = await userRes.json() as { login: string }
    console.log(`✅ GitHub user: ${userData.login}`)

    // 2. Create repository
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
    })

    if (!createRepoRes.ok) {
      const errorData = await createRepoRes.json() as { message: string }
      return NextResponse.json(
        { error: `Repository oluşturulamadı: ${errorData.message}` },
        { status: 400 }
      )
    }

    const repoData = await createRepoRes.json() as { html_url: string }
    console.log(`✅ Repository created: ${repoData.html_url}`)

    // 3. Get all project files
    const projectRoot = process.cwd()
    console.log(`📂 Project root: ${projectRoot}`)

    const allFiles: FileContent[] = []
    
    // Read src directory
    const srcPath = path.join(projectRoot, 'src')
    if (fs.existsSync(srcPath)) {
      getAllFiles(srcPath, allFiles)
    }

    // Add root config files
    const rootFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.ts',
      'next.config.js',
      'tailwind.config.ts',
      'tailwind.config.js',
      'postcss.config.mjs',
      'postcss.config.js',
      '.gitignore',
      '.eslintrc.json',
      'README.md',
    ]

    rootFiles.forEach(file => {
      const filePath = path.join(projectRoot, file)
      if (fs.existsSync(filePath) && !isBinaryFile(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8')
          allFiles.push({
            path: filePath,
            content
          })
        } catch (err) {
          console.error(`Error reading ${file}:`, err)
        }
      }
    })

    console.log(`📄 Total files to upload: ${allFiles.length}`)

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: 'Hiç dosya bulunamadı' },
        { status: 400 }
      )
    }

    // 4. Create blobs for all files
    const blobs: GitHubBlob[] = []
    let processedCount = 0
    const errors: string[] = []

    for (const file of allFiles) {
      try {
        // Convert absolute path to relative path for GitHub
        let relativePath = file.path.replace(projectRoot, '').replace(/^[/\\]/, '')
        
        // Normalize path separators to forward slashes for GitHub
        relativePath = relativePath.split(path.sep).join('/')

        console.log(`📄 Processing: ${relativePath} (${file.content.length} bytes)`)

        // Create blob
        const contentBase64 = Buffer.from(file.content, 'utf-8').toString('base64')
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
        )

        if (blobRes.ok) {
          const blobData = await blobRes.json() as { sha: string }
          blobs.push({
            path: relativePath,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha,
          })
          processedCount++
          console.log(`✅ Blob created for: ${relativePath}`)
          
          if (processedCount % 10 === 0) {
            console.log(`📤 Uploaded ${processedCount}/${allFiles.length} files...`)
          }
        } else {
          const errorText = await blobRes.text()
          const errorMsg = `Failed to create blob for ${relativePath}: ${blobRes.status} - ${errorText}`
          console.error(errorMsg)
          errors.push(errorMsg)
        }

        // Rate limiting - small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err) {
        const errorMsg = `Error processing file ${file.path}: ${err instanceof Error ? err.message : String(err)}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    console.log(`✅ Created ${blobs.length} blobs, ${errors.length} errors`)
    if (errors.length > 0) {
      console.error('❌ Errors:', errors.slice(0, 5)) // Show first 5 errors
    }

    console.log(`✅ Created ${blobs.length} blobs`)

    if (blobs.length === 0) {
      return NextResponse.json(
        { error: 'Hiç dosya yüklenemedi' },
        { status: 500 }
      )
    }

    // 5. Create tree
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
    )

    if (!treeRes.ok) {
      const treeError = await treeRes.json() as { message: string }
      return NextResponse.json(
        { error: `Tree oluşturulamadı: ${treeError.message}` },
        { status: 500 }
      )
    }

    const treeData = await treeRes.json() as { sha: string }
    console.log(`✅ Tree created: ${treeData.sha}`)

    // 6. Create commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${userData.login}/${repoName}/git/commits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Initial commit - VOLT Turkish Crypto News Aggregator',
          tree: treeData.sha,
        }),
      }
    )

    if (!commitRes.ok) {
      const commitError = await commitRes.json() as { message: string }
      return NextResponse.json(
        { error: `Commit oluşturulamadı: ${commitError.message}` },
        { status: 500 }
      )
    }

    const commitData = await commitRes.json() as { sha: string }
    console.log(`✅ Commit created: ${commitData.sha}`)

    // 7. Create main branch reference
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
    )

    if (!refRes.ok) {
      const refError = await refRes.json() as { message: string }
      return NextResponse.json(
        { error: `Branch referansı oluşturulamadı: ${refError.message}` },
        { status: 500 }
      )
    }

    console.log(`✅ Main branch created`)
    console.log(`🎉 Export completed! Total files: ${blobs.length}`)

    return NextResponse.json({
      success: true,
      repoUrl: repoData.html_url,
      message: `✅ Başarılı! ${blobs.length} dosya GitHub'a aktarıldı!`,
      filesCount: blobs.length,
    })

  } catch (error) {
    console.error('❌ GitHub export error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu' },
      { status: 500 }
    )
  }
}

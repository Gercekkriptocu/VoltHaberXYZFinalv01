import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

interface FileItem {
  path: string
  content: string
  mode: string
  type: string
}

async function getAllFiles(dirPath: string, baseDir: string = dirPath): Promise<FileItem[]> {
  const files: FileItem[] = []
  
  try {
    const entries = await readdir(dirPath, { withFileTypes: true })
    console.log(`📂 Taranıyor: ${dirPath.replace(baseDir, '.')} (${entries.length} öğe)`)

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      
      // Skip node_modules, .next, .git etc.
      if (
        entry.name === 'node_modules' ||
        entry.name === '.next' ||
        entry.name === '.git' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === '.env' ||
        entry.name === '.env.local' ||
        (entry.name.startsWith('.') && entry.name !== '.well-known')
      ) {
        console.log(`⏭️  Atlandı: ${entry.name}`)
        continue
      }

      // Skip GitHub export related files
      if (
        entry.name.toLowerCase().includes('github-export') ||
        entry.name.toLowerCase().includes('githubexport') ||
        fullPath.includes('GitHubExport')
      ) {
        console.log(`⏭️  GitHub export dosyası atlandı: ${entry.name}`)
        continue
      }

      if (entry.isDirectory()) {
        console.log(`📁 Klasöre giriliyor: ${entry.name}`)
        // Recursively get files from subdirectories
        const subFiles = await getAllFiles(fullPath, baseDir)
        files.push(...subFiles)
        console.log(`✅ ${entry.name} klasöründen ${subFiles.length} dosya eklendi`)
      } else {
        // Read file content
        try {
          // Check file size first (GitHub API has 100MB limit, but we'll use 1MB for safety)
          const stats = await readFile(fullPath)
          if (stats.length > 1024 * 1024) { // 1MB
            console.warn(`⚠️ Dosya çok büyük (${(stats.length / 1024 / 1024).toFixed(2)}MB), atlandı: ${entry.name}`)
            continue
          }

          let content = await readFile(fullPath, 'utf-8')
          const relativePath = fullPath.replace(baseDir, '').replace(/^[\/\\]/, '')
          
          // Skip if content is empty or invalid
          if (!content || content.trim().length === 0) {
            console.warn(`⚠️ Boş dosya atlandı: ${relativePath}`)
            continue
          }
          
          // Sanitize sensitive API routes
          if (relativePath.includes('api/proxy/route.ts')) {
            content = content.replace(
              /const customSecretMappings: Record<string, string> = \{[\s\S]*?\}/,
              `const customSecretMappings: Record<string, string> = {\n  // Add your secret mappings here\n  // Example: "secret_key": "actual_value"\n}`
            )
          }
          if (relativePath.includes('api/translate/route.ts')) {
            content = content.replace(
              /const OPENAI_API_KEY = ['"]sk-proj-[^'"]+['"]/,
              `const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''`
            )
          }
          
          // Remove GitHub Export component references from page.tsx
          if (relativePath === 'src/app/page.tsx') {
            // Remove the import line
            content = content.replace(
              /import\s*\{\s*GitHubExportStatic\s*\}\s*from\s*['"][^'"]+github-export-static['"];\s*\n?/,
              ''
            )
            // Remove the component usage
            content = content.replace(
              /<GitHubExportStatic\s+language=\{language\}\s*\/>\s*\n?/,
              ''
            )
            // Also remove any comments mentioning it
            content = content.replace(
              /\/\*.*GitHub Export.*\*\/\s*\n?/g,
              ''
            )
            content = content.replace(
              /\/\/.*GitHub Export.*\n?/g,
              ''
            )
          }
          
          console.log(`📄 Dosya eklendi: ${relativePath}`)
          files.push({
            path: relativePath,
            content,
            mode: '100644',
            type: 'blob',
          })
        } catch (error) {
          // Binary dosya veya okunamayan dosya - atla
          console.error(`❌ Dosya okunamadı (muhtemelen binary) ${entry.name}:`, error)
        }
      }
    }
  } catch (error) {
    console.error(`❌ Klasör okunamadı ${dirPath}:`, error)
  }

  return files
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

    console.log('🚀 GitHub export başlatılıyor...')

    // 1. Get GitHub user info and validate token
    console.log('🔐 Validating GitHub token...');
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!userRes.ok) {
      const errorText = await userRes.text();
      console.error('❌ Token validation failed:', errorText);
      return NextResponse.json(
        { error: `GitHub token geçersiz veya expired. Lütfen yeni bir token oluşturun: ${errorText}` },
        { status: 401 }
      )
    }

    const userData = await userRes.json() as { login: string }
    console.log(`✅ Kullanıcı: ${userData.login}`)

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
        auto_init: true,
      }),
    })

    if (!createRepoRes.ok) {
      const errorData = await createRepoRes.json() as { message: string }
      return NextResponse.json(
        { error: `Repository oluşturulamadı: ${errorData.message}` },
        { status: 400 }
      )
    }

    const repoData = await createRepoRes.json() as { 
      html_url: string
      default_branch: string 
    }
    
    console.log(`✅ Repo oluşturuldu: ${repoData.html_url}`)
    
    // Wait for repo initialization
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 3. Get all project files dynamically
    const projectRoot = process.cwd()
    console.log(`📂 Dosyalar toplanıyor: ${projectRoot}`)
    
    const allFiles = await getAllFiles(projectRoot)
    
    // 4. Sanitize sensitive data from content
    function sanitizeContent(content: string, filePath: string): string {
      if (filePath.includes('proxy/route.ts')) {
        // Replace hardcoded API keys with placeholders
        content = content.replace(
          /const customSecretMappings: Record<string, string> = \{[\s\S]*?\}/,
          `const customSecretMappings: Record<string, string> = {\n  // Add your secret mappings here\n  // Example: "secret_key": "actual_value"\n}`
        )
      }
      
      if (filePath.includes('translate/route.ts')) {
        // Replace OpenAI API key with placeholder
        content = content.replace(
          /const OPENAI_API_KEY = ['"]sk-proj-[^'"]+['"]/,
          `const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''`
        )
      }
      
      return content
    }
    
    // 5. Explicitly ensure critical API routes are included
    const criticalApiRoutes = [
      'src/app/api/proxy/route.ts',
      'src/app/api/translate/route.ts',
    ]
    
    for (const routePath of criticalApiRoutes) {
      const fullPath = join(projectRoot, routePath)
      const existingIndex = allFiles.findIndex(f => f.path === routePath)
      
      if (existingIndex === -1) {
        try {
          let content = await readFile(fullPath, 'utf-8')
          content = sanitizeContent(content, routePath)
          console.log(`📌 Kritik API route eklendi (sanitized): ${routePath} (${content.length} karakter)`)
          allFiles.push({
            path: routePath,
            content,
            mode: '100644',
            type: 'blob',
          })
        } catch (error) {
          console.error(`❌ Kritik route okunamadı ${routePath}:`, error)
        }
      } else {
        // Ensure the content is properly loaded and sanitized
        try {
          let content = await readFile(fullPath, 'utf-8')
          content = sanitizeContent(content, routePath)
          allFiles[existingIndex].content = content
          console.log(`🔄 Kritik route içeriği yenilendi (sanitized): ${routePath} (${content.length} karakter)`)
        } catch (error) {
          console.error(`❌ Kritik route yenilenemedi ${routePath}:`, error)
        }
      }
    }
    
    // Mark critical files for priority upload
    const criticalFilesSet = new Set(criticalApiRoutes)
    
    console.log(`✅ ${allFiles.length} dosya bulundu (kritik routelar dahil)`)

    // 5. Upload files in batches (critical files first)
    const defaultBranch = repoData.default_branch || 'main'
    let uploadedCount = 0
    let failedFiles: string[] = []

    // Upload critical files first with retry logic
    const criticalFiles = allFiles.filter(f => criticalFilesSet.has(f.path))
    const regularFiles = allFiles.filter(f => !criticalFilesSet.has(f.path))
    
    console.log(`🔥 ${criticalFiles.length} kritik dosya öncelikli yüklenecek`)
    
    // Upload all files with priority for critical ones
    const filesToUpload = [...criticalFiles, ...regularFiles]

    for (const file of filesToUpload) {
      const isCritical = criticalFilesSet.has(file.path)
      const maxRetries = isCritical ? 5 : 3  // Increased retries
      let uploaded = false
      
      for (let attempt = 1; attempt <= maxRetries && !uploaded; attempt++) {
        try {
          if (attempt > 1) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
            console.log(`🔄 Yeniden deneniyor (${attempt}/${maxRetries}): ${file.path} - ${waitTime}ms bekleniyor...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
          
          const content = Buffer.from(file.content).toString('base64')
          
          if (isCritical || attempt === 1) {
            console.log(`📤 Yükleniyor: ${file.path} (${Math.round(file.content.length / 1024)}KB)`)
          }
          
          // Check if file already exists with timeout
          const checkController = new AbortController();
          const checkTimeout = setTimeout(() => checkController.abort(), 10000); // 10s timeout
          
          let sha: string | undefined
          try {
            const checkRes = await fetch(
              `https://api.github.com/repos/${userData.login}/${repoName}/contents/${file.path}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                signal: checkController.signal
              }
            )
            clearTimeout(checkTimeout);
            
            if (checkRes.ok) {
              const existingFile = await checkRes.json() as { sha: string }
              sha = existingFile.sha
              console.log(`📝 Dosya mevcut, güncelleniyor: ${file.path}`)
            } else if (checkRes.status === 404) {
              console.log(`📄 Yeni dosya: ${file.path}`)
            } else {
              const errorText = await checkRes.text();
              console.warn(`⚠️ Check failed for ${file.path}: ${checkRes.status} - ${errorText}`);
            }
          } catch (checkError) {
            clearTimeout(checkTimeout);
            console.warn(`⚠️ Check timed out for ${file.path}, continuing...`);
          }
          
          // Upload file with timeout
          const uploadController = new AbortController();
          const uploadTimeout = setTimeout(() => uploadController.abort(), 30000); // 30s timeout
          
          const uploadRes = await fetch(
            `https://api.github.com/repos/${userData.login}/${repoName}/contents/${file.path}`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `Add ${file.path}`,
                content: content,
                branch: defaultBranch,
                ...(sha && { sha }),
              }),
              signal: uploadController.signal
            }
          )
          clearTimeout(uploadTimeout);

          if (!uploadRes.ok) {
            const errorData = await uploadRes.json() as { message: string; documentation_url?: string }
            const errorMsg = `${errorData.message} ${errorData.documentation_url || ''}`;
            console.error(`❌ Yüklenemedi ${file.path} (${attempt}/${maxRetries}): ${errorMsg}`)
            
            // Check for rate limiting
            if (uploadRes.status === 403 && errorMsg.includes('rate limit')) {
              console.error('⏱️ Rate limit hit! Waiting 60 seconds...');
              await new Promise(resolve => setTimeout(resolve, 60000));
              continue; // Retry immediately after wait
            }
            
            if (attempt === maxRetries) {
              failedFiles.push(file.path)
              console.error(`💀 PERMANENTLY FAILED: ${file.path} - ${errorMsg}`);
            }
          } else {
            uploadedCount++
            uploaded = true
            console.log(`✅ Başarılı: ${file.path} (${uploadedCount}/${allFiles.length})`);
          }

          // Increased rate limiting delay
          if (!uploaded) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // Longer delay for successful uploads to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`❌ Exception ${file.path} (${attempt}/${maxRetries}): ${errorMsg}`);
          
          // Check for network errors
          if (errorMsg.includes('aborted') || errorMsg.includes('timeout')) {
            console.error('⏱️ Timeout detected, will retry...');
          }
          
          if (attempt === maxRetries) {
            failedFiles.push(file.path)
            console.error(`💀 PERMANENTLY FAILED (exception): ${file.path}`);
          }
        }
      }
    }

    console.log(`\n✅ EXPORT TAMAMLANDI!`);
    console.log(`📊 ${uploadedCount}/${allFiles.length} dosya yüklendi`);
    
    if (failedFiles.length > 0) {
      console.error(`\n⚠️ ${failedFiles.length} dosya yüklenemedi:`);
      failedFiles.forEach((file, i) => {
        console.error(`  ${i + 1}. ${file}`);
      });
    }

    const allFailed = uploadedCount === 0 && failedFiles.length > 0;
    const partialSuccess = uploadedCount > 0 && failedFiles.length > 0;

    return NextResponse.json({
      success: uploadedCount > 0, // Success if at least some files uploaded
      repoUrl: repoData.html_url,
      message: allFailed 
        ? `❌ Hiçbir dosya yüklenemedi. Token'ınızı kontrol edin veya rate limit'e takılmış olabilirsiniz.`
        : partialSuccess
        ? `⚠️ ${uploadedCount}/${allFiles.length} dosya yüklendi. ${failedFiles.length} dosya başarısız.`
        : `✅ Tüm dosyalar başarıyla yüklendi!`,
      stats: {
        total: allFiles.length,
        uploaded: uploadedCount,
        failed: failedFiles.length,
        failedFiles,
      },
    })
  } catch (error) {
    console.error('❌ Export hatası:', error)
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu'
    return NextResponse.json(
      { error: `Export hatası: ${errorMessage}` },
      { status: 500 }
    )
  }
}

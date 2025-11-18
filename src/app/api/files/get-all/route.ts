import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface FileData {
  path: string;
  content: string;
}

async function getAllFiles(dir: string, baseDir: string = dir): Promise<FileData[]> {
  const files: FileData[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      if (entry.isDirectory()) {
        // Recursive for directories
        const subFiles = await getAllFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        // Skip certain files
        if (relativePath.includes('github-export')) continue;
        if (relativePath.endsWith('.woff') || relativePath.endsWith('.ico')) continue;
        
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            path: relativePath,
            content: content
          });
        } catch (error) {
          console.error(`Error reading file ${relativePath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

export async function GET() {
  try {
    console.log('📂 Starting file collection...');
    
    const allFiles: FileData[] = [];
    
    // Collect from src/
    console.log('📁 Collecting from src/...');
    const srcPath = path.join(process.cwd(), 'src');
    const srcFiles = await getAllFiles(srcPath, srcPath);
    allFiles.push(...srcFiles.map(f => ({ ...f, path: `src/${f.path}` })));
    console.log(`✅ Collected ${srcFiles.length} files from src/`);
    
    // Collect from public/
    console.log('📁 Collecting from public/...');
    const publicPath = path.join(process.cwd(), 'public');
    try {
      const publicFiles = await getAllFiles(publicPath, publicPath);
      allFiles.push(...publicFiles.map(f => ({ ...f, path: `public/${f.path}` })));
      console.log(`✅ Collected ${publicFiles.length} files from public/`);
    } catch (error) {
      console.log('⚠️ public/ directory not found or empty');
    }
    
    // Add root config files
    console.log('📁 Adding root config files...');
    const rootFiles = [
      'package.json',
      'tsconfig.json',
      'tailwind.config.ts',
      'next.config.mjs',
      'postcss.config.mjs',
      '.gitignore',
      'README.md'
    ];
    
    for (const file of rootFiles) {
      try {
        const content = await fs.readFile(path.join(process.cwd(), file), 'utf-8');
        allFiles.push({ path: file, content });
      } catch (error) {
        console.log(`⚠️ ${file} not found`);
      }
    }
    
    console.log(`✅ Total files collected: ${allFiles.length}`);
    
    return NextResponse.json({ files: allFiles });
  } catch (error) {
    console.error('❌ Error collecting files:', error);
    return NextResponse.json(
      { error: 'Failed to collect files', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

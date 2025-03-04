import simpleGit from 'simple-git';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Create a temporary directory for cloning repositories
const createTempDir = async (repoName) => {
  const tempDir = path.join(os.tmpdir(), `velosys-${repoName}-${Date.now()}`);
  await fs.promises.mkdir(tempDir, { recursive: true });
  return tempDir;
};

// Clone repository
const cloneRepository = async (repoUrl, tempDir, logCallback) => {
  logCallback(`Cloning repository: ${repoUrl}`);
  
  try {
    const git = simpleGit();
    
    // Extract repo owner and name
    const repoPath = new URL(repoUrl).pathname.substring(1);
    
    // Use GitHub token if available
    let cloneUrl = repoUrl;
    if (process.env.GITHUB_TOKEN) {
      const githubUrl = new URL(repoUrl);
      cloneUrl = `https://${process.env.GITHUB_TOKEN}@${githubUrl.host}${githubUrl.pathname}`;
    }
    
    await git.clone(cloneUrl, tempDir);
    logCallback('Repository cloned successfully');
    
    return { success: true };
  } catch (error) {
    logCallback(`Error cloning repository: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Detect project type and install dependencies
const setupProject = async (tempDir, logCallback) => {
  try {
    // Check for package.json to determine if it's a Node.js project
    const hasPackageJson = fs.existsSync(path.join(tempDir, 'package.json'));
    
    if (hasPackageJson) {
      // Read package.json to detect project type
      const packageJson = JSON.parse(
        await fs.promises.readFile(path.join(tempDir, 'package.json'), 'utf8')
      );
      
      // Detect project type based on dependencies
      let projectType = 'Node.js';
      if (packageJson.dependencies) {
        if (packageJson.dependencies.next) {
          projectType = 'Next.js';
        } else if (packageJson.dependencies.react && !packageJson.dependencies.next) {
          projectType = 'React';
        } else if (packageJson.dependencies.vue) {
          projectType = 'Vue.js';
        } else if (packageJson.dependencies.svelte) {
          projectType = 'Svelte';
        } else if (packageJson.dependencies.angular || packageJson.dependencies['@angular/core']) {
          projectType = 'Angular';
        }
      }
      
      logCallback(`Project type detected: ${projectType}`);
      
      // Install dependencies
      logCallback('Installing dependencies...');
      
      // Determine package manager
      const hasYarnLock = fs.existsSync(path.join(tempDir, 'yarn.lock'));
      const hasPnpmLock = fs.existsSync(path.join(tempDir, 'pnpm-lock.yaml'));
      
      let installCommand = 'npm install';
      if (hasYarnLock) {
        installCommand = 'yarn install';
      } else if (hasPnpmLock) {
        installCommand = 'pnpm install';
      }
      
      await execPromise(installCommand, { cwd: tempDir });
      logCallback('Dependencies installed successfully');
      
      return { success: true, projectType };
    } else if (fs.existsSync(path.join(tempDir, 'requirements.txt'))) {
      // Python project
      logCallback('Project type detected: Python');
      logCallback('Installing dependencies...');
      await execPromise('pip install -r requirements.txt', { cwd: tempDir });
      logCallback('Dependencies installed successfully');
      
      return { success: true, projectType: 'Python' };
    } else {
      // Static HTML or unknown project type
      logCallback('Project type detected: Static HTML or unknown');
      return { success: true, projectType: 'Static' };
    }
  } catch (error) {
    logCallback(`Error setting up project: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Configure project for Vercel deployment
const configureProject = async (tempDir, projectType, logCallback) => {
  try {
    logCallback(`Configuring project for ${projectType}...`);
    
    // Check if vercel.json already exists
    const vercelConfigPath = path.join(tempDir, 'vercel.json');
    const hasVercelConfig = fs.existsSync(vercelConfigPath);
    
    if (!hasVercelConfig) {
      // Create a basic vercel.json configuration based on project type
      let vercelConfig = {
        version: 2
      };
      
      if (projectType === 'Static') {
        vercelConfig.builds = [
          { src: '*.html', use: '@vercel/static' }
        ];
      } else if (projectType === 'Python') {
        vercelConfig.builds = [
          { src: '*.py', use: '@vercel/python' }
        ];
      } else if (projectType === 'Next.js') {
        // Next.js is automatically detected by Vercel
        vercelConfig = {
          version: 2,
          framework: 'nextjs'
        };
      } else if (projectType === 'React') {
        vercelConfig = {
          version: 2,
          builds: [
            { src: 'package.json', use: '@vercel/static-build', config: { distDir: 'build' } }
          ]
        };
      } else if (projectType === 'Vue.js') {
        vercelConfig = {
          version: 2,
          builds: [
            { src: 'package.json', use: '@vercel/static-build', config: { distDir: 'dist' } }
          ]
        };
      }
      
      // Write vercel.json
      await fs.promises.writeFile(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
      logCallback('Created vercel.json configuration file');
    } else {
      logCallback('Using existing vercel.json configuration');
    }
    
    logCallback('Project configured successfully');
    return { success: true };
  } catch (error) {
    logCallback(`Error configuring project: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Helper function to recursively read directory and prepare files for upload
const readFilesRecursively = async (dir, rootDir) => {
  const files = [];
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);
    
    // Skip node_modules, .git directories and hidden files
    if (
      entry.name === 'node_modules' || 
      entry.name === '.git' || 
      entry.name.startsWith('.')
    ) {
      continue;
    }
    
    if (entry.isDirectory()) {
      const subFiles = await readFilesRecursively(fullPath, rootDir);
      files.push(...subFiles);
    } else {
      try {
        const content = await fs.promises.readFile(fullPath);
        files.push({
          file: relativePath.replace(/\\/g, '/'), // Normalize path for Windows
          data: content.toString('base64'),
          encoding: 'base64'
        });
      } catch (error) {
        console.error(`Error reading file ${fullPath}:`, error);
      }
    }
  }
  
  return files;
};

// Deploy to Vercel
const deployToVercel = async (tempDir, logCallback) => {
  try {
    logCallback('Preparing files for Vercel deployment...');
    
    if (!process.env.VERCEL_TOKEN) {
      throw new Error('Vercel API token not configured');
    }
    
    // Read all files recursively
    const files = await readFilesRecursively(tempDir, tempDir);
    logCallback(`Prepared ${files.length} files for deployment`);
    
    // Extract project name from directory
    const projectName = path.basename(tempDir).replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    
    // Prepare deployment payload
    const deploymentData = {
      name: projectName,
      files,
      projectSettings: {
        framework: null // Let Vercel auto-detect
      }
    };
    
    // Add team ID if available
    if (process.env.VERCEL_TEAM_ID) {
      deploymentData.teamId = process.env.VERCEL_TEAM_ID;
    }
    
    logCallback('Sending deployment request to Vercel...');
    
    // Create deployment using Vercel API
    const response = await axios.post('https://api.vercel.com/v13/deployments', deploymentData, {
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.url) {
      const deployedUrl = `https://${response.data.url}`;
      logCallback(`Deployment successful! URL: ${deployedUrl}`);
      return { success: true, deployedUrl };
    } else {
      throw new Error('Deployment response missing URL');
    }
  } catch (error) {
    logCallback(`Error deploying to Vercel: ${error.message}`);
    if (error.response) {
      logCallback(`Response status: ${error.response.status}`);
      logCallback(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return { success: false, error: error.message };
  }
};

// Main deployment function
export const deployProject = async (repoUrl, logCallback, updateStepCallback) => {
  try {
    // Extract repo name for temp directory
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
    const tempDir = await createTempDir(repoName);
    
    // Step 1: Clone repository
    const cloneResult = await cloneRepository(repoUrl, tempDir, logCallback);
    if (!cloneResult.success) {
      updateStepCallback(0, 'error');
      return { success: false, error: cloneResult.error };
    }
    updateStepCallback(0, 'success');
    
    // Step 2: Install dependencies and detect project type
    updateStepCallback(1, 'pending');
    const setupResult = await setupProject(tempDir, logCallback);
    if (!setupResult.success) {
      updateStepCallback(1, 'error');
      return { success: false, error: setupResult.error };
    }
    updateStepCallback(1, 'success');
    
    // Step 3: Detect project type (already done in setupProject)
    updateStepCallback(2, 'success');
    
    // Step 4: Configure project
    updateStepCallback(3, 'pending');
    const configResult = await configureProject(tempDir, setupResult.projectType, logCallback);
    if (!configResult.success) {
      updateStepCallback(3, 'error');
      return { success: false, error: configResult.error };
    }
    updateStepCallback(3, 'success');
    
    // Step 5: Deploy to Vercel
    updateStepCallback(4, 'pending');
    const deployResult = await deployToVercel(tempDir, logCallback);
    if (!deployResult.success) {
      updateStepCallback(4, 'error');
      return { success: false, error: deployResult.error };
    }
    updateStepCallback(4, 'success');
    
    // Clean up temp directory
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
      logCallback('Cleaned up temporary files');
    } catch (cleanupError) {
      logCallback(`Warning: Could not clean up temporary directory: ${cleanupError.message}`);
    }
    
    return { 
      success: true, 
      deployedUrl: deployResult.deployedUrl 
    };
  } catch (error) {
    logCallback(`Deployment process error: ${error.message}`);
    return { success: false, error: error.message };
  }
};
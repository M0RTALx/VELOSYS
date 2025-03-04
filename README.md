# VeloSys - Automated Vercel Deployment Platform

VeloSys is a web application that allows users to deploy their GitHub projects to Vercel effortlessly. The platform automatically detects project types, configures necessary settings, and deploys projects with real-time status updates.

## Features

- **GitHub Integration**: Clone repositories directly from GitHub
- **Smart Project Detection**: Automatically detect project type (React, Next.js, Vue, etc.)
- **Auto-Configuration**: Generate vercel.json and other configuration files
- **Real-time Deployment**: Watch deployment progress with detailed logs
- **Vercel API Integration**: Deploy projects directly to Vercel

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.IO
- **APIs**: GitHub API, Vercel API
- **Git Operations**: simple-git

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- GitHub account with personal access token
- Vercel account with API token

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# GitHub API
GITHUB_TOKEN=your_github_token

# Vercel API
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id_if_applicable

# Server
SERVER_PORT=3001
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the backend server:
   ```
   npm run server
   ```
4. In a separate terminal, start the frontend:
   ```
   npm run dev
   ```

## How It Works

1. **Repository Cloning**: When a user submits a GitHub repository URL, the backend clones the repository to a temporary directory.

2. **Project Analysis**: The system analyzes the project structure to determine its type (React, Next.js, Vue, etc.) and installs the necessary dependencies.

3. **Configuration**: Based on the project type, the system generates or updates configuration files (e.g., vercel.json) to ensure proper deployment.

4. **Deployment**: The system uses the Vercel API to deploy the project and returns the deployment URL to the frontend.

5. **Real-time Updates**: Throughout the process, the frontend receives real-time updates via Socket.IO, displaying the current status and logs to the user.

## License

MIT
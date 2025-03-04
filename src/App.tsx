import { useState, useEffect, useRef } from 'react';
import { Github, Loader2, CheckCircle, AlertCircle, ExternalLink, Rocket, Package, Code, Zap, Server } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

// Define types
type DeploymentStep = {
  name: string;
  status: 'waiting' | 'pending' | 'success' | 'error';
  icon: React.ReactNode;
};

type DeploymentStatus = {
  status: 'pending' | 'success' | 'error';
  message: string;
  deployedUrl?: string;
};

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus | null>(null);
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([
    { name: 'Clone Repository', status: 'waiting', icon: <Github className="h-5 w-5" /> },
    { name: 'Install Dependencies', status: 'waiting', icon: <Package className="h-5 w-5" /> },
    { name: 'Detect Project Type', status: 'waiting', icon: <Code className="h-5 w-5" /> },
    { name: 'Configure Project', status: 'waiting', icon: <Server className="h-5 w-5" /> },
    { name: 'Deploy to Vercel', status: 'waiting', icon: <Rocket className="h-5 w-5" /> },
  ]);
  const [logs, setLogs] = useState<string[]>([]);
  const [deployedUrl, setDeployedUrl] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Initialize socket connection
  useEffect(() => {
    const SOCKET_URL = `http://localhost:${import.meta.env.VITE_SERVER_PORT || 3001}`;
    socketRef.current = io(SOCKET_URL);
    
    const socket = socketRef.current;

    // Connection status
    socket.on('connect', () => {
      setSocketConnected(true);
      setServerError(null);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      setSocketConnected(false);
      setServerError(`Server connection error: ${error.message}`);
    });

    // Deployment events
    socket.on('log', (message) => {
      setLogs((prev) => [...prev, message]);
    });

    socket.on('updateStep', ({ index, status }) => {
      setDeploymentSteps((prev) =>
        prev.map((step, i) => (i === index ? { ...step, status } : step))
      );
    });

    socket.on('deploymentStatus', (status) => {
      setDeploymentStatus(status);
      setIsDeploying(false);
      if (status.deployedUrl) {
        setDeployedUrl(status.deployedUrl);
      }
    });

    // Clean up on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!repoUrl || !socketConnected || !socketRef.current) return;

    // Reset states
    setIsDeploying(true);
    setDeploymentStatus(null);
    setDeployedUrl('');
    setLogs(['Starting deployment process...']);
    
    // Reset deployment steps
    setDeploymentSteps((prev) =>
      prev.map((step) => ({ ...step, status: 'waiting' }))
    );

    // Send deployment request to server
    socketRef.current.emit('deploy', { repoUrl });
  };

  const getProgressPercentage = () => {
    const completedSteps = deploymentSteps.filter(
      (step) => step.status === 'success'
    ).length;
    return (completedSteps / deploymentSteps.length) * 100;
  };

  return (
    <div className="min-h-screen bg-apple-white flex flex-col">
      {/* Header */}
      <header className="bg-apple-white sticky top-0 z-10 border-b border-apple-gray-200">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-apple-blue" />
            <h1 className="text-4xl font-semibold text-apple-black">VeloSys</h1>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <div
                className={`h-3 w-3 rounded-full mr-2 ${
                  socketConnected ? 'bg-apple-green animate-pulse' : 'bg-apple-red'
                }`}
              ></div>
              <span className="text-xl text-apple-gray-600">
                {socketConnected ? 'Server Connected' : 'Server Disconnected'}
              </span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 text-sm text-apple-gray-700 hover:text-apple-blue transition-colors text-xl"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-6 md:p-10 max-w-5xl">
        <div className="text-center mb-16 mt-8 fade-in">
              
          <h2 className="text-4xl md:text-5xl font-semibold mb-3 text-apple-black tracking-tight flex items-center justify-center gap-2">   GitHub to Vercel in a Flash <Zap className= "h-9 w-9 text-apple-blue" /></h2>
          
          <p className="text-apple-blue text-xl font-light mb-6">Deploy to Vercel in One Click</p>
          <p className="text-apple-gray-600 max-w-2xl mx-auto text-lg">
            VeloSys automatically detects your project type, configures it, and deploys it to Vercel - all from your GitHub repository URL.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="bg-apple-red/10 border border-apple-red/30 rounded-apple p-4 mb-8 fade-in">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-apple-red mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-apple-red">{serverError}</p>
                <p className="text-sm mt-1 text-apple-gray-700">
                  Make sure the server is running with <code className="bg-apple-gray-100 px-1.5 py-0.5 rounded text-apple-gray-800">npm run server</code> and that you have configured your environment variables.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mb-16 fade-in">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="Enter GitHub repository URL (e.g., https://github.com/username/repo)"
                className="apple-input w-full text-apple-gray-800"
                disabled={isDeploying || !socketConnected}
              />
            </div>
            <button
              type="submit"
              disabled={isDeploying || !repoUrl || !socketConnected}
              className="apple-button flex items-center justify-center"
            >
              {isDeploying ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="animate-spin mr-2 h-5 w-5" />
                  Deploying...
                </span>
              ) : (
                <span className="flex items-center">
                  <Rocket className="mr-2 h-5 w-5" />
                  Deploy Now
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Deployment Progress */}
        {(isDeploying || deploymentStatus) && (
          <div className="apple-card p-8 mb-16 fade-in">
            <h3 className="text-2xl font-semibold mb-8 text-apple-black">Deployment Progress</h3>
            
            {/* Progress bar */}
            <div className="progress-bar-track mb-10">
              <div 
                className="progress-bar-fill"
                style={{ width: `${getProgressPercentage()}%` }}
              ></div>
            </div>
            
            {/* Steps */}
            <div className="grid md:grid-cols-5 gap-6 mb-10">
              {deploymentSteps.map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className={`step-icon mb-3 ${
                    step.status === 'success' ? 'step-icon-success' :
                    step.status === 'error' ? 'step-icon-error' :
                    step.status === 'pending' ? 'step-icon-pending' : ''
                  }`}>
                    {step.status === 'pending' ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    step.status === 'success' ? 'text-apple-green' :
                    step.status === 'error' ? 'text-apple-red' :
                    step.status === 'pending' ? 'text-apple-blue' : 'text-apple-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Deployment Status */}
            {deploymentStatus && (
              <div className={`p-6 rounded-apple mb-10 ${
                deploymentStatus.status === 'success' 
                  ? 'bg-apple-green/10 border border-apple-green/30' 
                  : 'bg-apple-red/10 border border-apple-red/30'
              }`}>
                <div className="flex items-start">
                  {deploymentStatus.status === 'success' ? (
                    <CheckCircle className="h-6 w-6 text-apple-green mr-3 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-apple-red mr-3 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-medium text-lg ${
                      deploymentStatus.status === 'success' ? 'text-apple-green' : 'text-apple-red'
                    }`}>
                      {deploymentStatus.message}
                    </p>
                    {deployedUrl && (
                      <a 
                        href={deployedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center text-apple-blue hover:underline group"
                      >
                        <span className="mr-2">Visit your deployed site</span>
                        <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Logs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-lg text-apple-black">Deployment Logs</h4>
                <button 
                  className="text-xs text-apple-gray-500 hover:text-apple-blue transition-colors"
                  onClick={() => setLogs([])}
                >
                  Clear
                </button>
              </div>
              <div className="terminal p-4 rounded-apple h-64 overflow-y-auto text-sm">
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <div key={index} className="pb-1">
                      <span className="terminal-timestamp">{`[${new Date().toLocaleTimeString()}]`}</span> {log}
                    </div>
                  ))
                ) : (
                  <p className="text-apple-gray-500">No logs available</p>
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="apple-card p-6 feature-card fade-in" style={{animationDelay: '0.1s'}}>
            <div className="feature-icon mb-4">
              <Code className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-apple-black">Smart Project Detection</h3>
            <p className="text-apple-gray-600">
              Automatically detects your project type (React, Next.js, Vue, etc.) and applies the necessary configurations.
            </p>
          </div>
          <div className="apple-card p-6 feature-card fade-in" style={{animationDelay: '0.2s'}}>
            <div className="feature-icon mb-4">
              <Server className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-apple-black">Auto-Configuration</h3>
            <p className="text-apple-gray-600">
              Generates vercel.json and other configuration files based on your project's requirements.
            </p>
          </div>
          <div className="apple-card p-6 feature-card fade-in" style={{animationDelay: '0.3s'}}>
            <div className="feature-icon mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-apple-black">Live Deployment Status</h3>
            <p className="text-apple-gray-600">
              Watch your deployment progress in real-time with detailed logs to help debug any issues.
            </p>
          </div>
        </div>



      </main>

      {/* Footer */}
      <footer className="bg-apple-gray-100 py-10">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-5 w-5 text-apple-blue mr-2" />
            <h2 className="text-3xl font-semibold text-apple-black">VeloSys</h2>
          </div>
          {/* <p className="text-sm text-apple-gray-500"> */}
          <p className="text-sm text-apple-black -500">
            © {new Date().getFullYear()} VeloSys. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

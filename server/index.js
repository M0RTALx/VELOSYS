import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { deployProject } from './deployment.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Handle deployment request
  socket.on('deploy', async (data) => {
    try {
      const { repoUrl } = data;
      
      // Validate repository URL
      if (!repoUrl || !repoUrl.includes('github.com')) {
        socket.emit('log', 'Invalid GitHub repository URL');
        socket.emit('deploymentStatus', { 
          status: 'error', 
          message: 'Invalid GitHub repository URL' 
        });
        return;
      }

      // Start deployment process
      socket.emit('log', `Starting deployment for ${repoUrl}`);
      socket.emit('updateStep', { index: 0, status: 'pending' });
      
      // Execute deployment
      const result = await deployProject(repoUrl, (message) => {
        socket.emit('log', message);
      }, (index, status) => {
        socket.emit('updateStep', { index, status });
      });

      // Send final status
      if (result.success) {
        socket.emit('deploymentStatus', { 
          status: 'success', 
          message: 'Your website has been deployed successfully!',
          deployedUrl: result.deployedUrl
        });
      } else {
        socket.emit('deploymentStatus', { 
          status: 'error', 
          message: `Deployment failed: ${result.error}` 
        });
      }
    } catch (error) {
      console.error('Deployment error:', error);
      socket.emit('log', `Error: ${error.message}`);
      socket.emit('deploymentStatus', { 
        status: 'error', 
        message: `Unexpected error: ${error.message}` 
      });
    }
  });
});

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
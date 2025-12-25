'use client';

import { Download, Chrome, Zap, FolderOpen, MessageSquare, Sparkles } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-[#0B1121] dark:via-[#0f1729] dark:to-[#0B1121] p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Hero Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/30 mb-6">
            <Chrome className="text-white" size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            BrainBox Chrome Extension
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Save and organize your ChatGPT conversations with one click. Seamlessly integrate with your BrainBox workspace.
          </p>
        </div>

        {/* Download Card */}
        <div className="glass-card rounded-2xl p-8 mb-12 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Get Started in Seconds
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Install the extension and start organizing your AI conversations instantly. No configuration required.
              </p>
              
              <button 
                onClick={() => {
                  // TODO: Add actual download link when extension is packaged
                  alert('Extension download will be available soon!');
                }}
                className="group inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105"
              >
                <Download className="group-hover:animate-bounce" size={24} />
                <span className="text-lg">Download Extension</span>
              </button>
              
              <p className="text-xs text-slate-500 dark:text-slate-600 mt-3">
                For Chrome, Edge, Brave, and other Chromium-based browsers
              </p>
            </div>
            
            <div className="w-full md:w-1/3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 blur-2xl rounded-full"></div>
                <div className="relative bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-white/10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-slate-600 dark:text-slate-400">Version 1.0.0</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                      <span className="text-slate-600 dark:text-slate-400">Free & Open Source</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-slate-600 dark:text-slate-400">Always in Sync</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon={<MessageSquare className="text-cyan-500" size={28} />}
            title="One-Click Save"
            description="Save ChatGPT conversations directly from the chat interface with a single click."
            delay="delay-200"
          />
          <FeatureCard
            icon={<FolderOpen className="text-blue-500" size={28} />}
            title="Smart Organization"
            description="Organize chats into folders and categories for easy access and management."
            delay="delay-300"
          />
          <FeatureCard
            icon={<Zap className="text-purple-500" size={28} />}
            title="Quick Access"
            description="Access your saved chats from any page with the extension popup menu."
            delay="delay-[400ms]"
          />
        </div>

        {/* Installation Steps */}
        <div className="glass-card rounded-2xl p-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="text-cyan-500" size={28} />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              How to Install
            </h2>
          </div>
          
          <div className="space-y-4">
            <Step
              number={1}
              title="Download the Extension"
              description="Click the download button above to get the latest version of BrainBox Extension."
            />
            <Step
              number={2}
              title="Open Chrome Extensions"
              description="Navigate to chrome://extensions/ or click the puzzle icon in your browser toolbar."
            />
            <Step
              number={3}
              title="Enable Developer Mode"
              description="Toggle the 'Developer mode' switch in the top right corner."
            />
            <Step
              number={4}
              title="Load Unpacked Extension"
              description="Click 'Load unpacked' and select the downloaded extension folder."
            />
            <Step
              number={5}
              title="Login to Connect Extension"
              description="After installing, click the extension icon and login with your BrainBox account to sync your chats."
            />
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Need help? Check out our documentation or reach out to support.
          </p>
          <div className="flex gap-4 justify-center">
            <a 
              href="https://github.com/HackamViGo/Chat-Organizer" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  delay: string;
}) {
  return (
    <div className={`glass-card rounded-xl p-6 hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-in fade-in slide-in-from-bottom-5 ${delay}`}>
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function Step({ number, title, description }: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold flex items-center justify-center shadow-lg shadow-cyan-500/30">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
          {title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

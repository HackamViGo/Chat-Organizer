'use client';

import React from 'react';
import { ArrowUpRight, FolderKanban } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  status: 'Active';
  updatedAt: string;
}

interface RecentProjectsProps {
  projects: Project[];
}

export const RecentProjects: React.FC<RecentProjectsProps> = ({ projects }) => {
  return (
    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
      <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FolderKanban size={20} className="text-cyan-500" />
          Recent Projects
        </h2>
        <Link 
          href="/folder" 
          className="text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
        >
          View all <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-slate-200 dark:divide-white/10">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div key={project.id} className="p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Last updated {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium">
                    {project.status}
                  </span>
                  <Link 
                    href={`/folder?id=${project.id}`}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-500 transition-all"
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">
            No projects found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
};

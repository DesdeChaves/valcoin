import React from 'react';
import { BookOpen, User, KeyRound } from 'lucide-react';
import AppSwitcher from '../AppSwitcher'; // Import AppSwitcher

const FeedbackHeader = ({ onLogout, currentUser }) => (
  <header className="bg-indigo-600 shadow-sm border-b border-indigo-700">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-8 h-8 text-white" />
            <h1 className="text-xl font-bold text-white">Sistema de Avaliação</h1>
          </div>
          <div className="hidden md:block">
            <span className="text-sm text-indigo-100">Agrupamento de Escolas de Valpaços</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <AppSwitcher currentApp="feedback" user={currentUser} onLogout={onLogout} />
          {/* Removed ChangePasswordModal button as it's not typically in the feedback app header */}
        </div>
      </div>
    </div>
  </header>
);

export default FeedbackHeader;
import React from 'react';
import { Menu, User, KeyRound } from 'lucide-react'; // Import Menu icon
import AppSwitcher from '../AppSwitcher';

const FeedbackHeader = ({ onLogout, currentUser, onMenuClick }) => (
  <header className="bg-indigo-600 shadow-sm border-b border-indigo-700">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        {/* Hamburger Menu for Mobile */}
        <div className="flex items-center">
          <button 
            onClick={onMenuClick}
            className="md:hidden text-white focus:outline-none"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          {/* Desktop Title */}
          <div className="hidden md:flex items-center space-x-4 text-xl font-bold">
            <span className="bg-blue-500 text-white px-2 py-1 rounded">Respeito</span>
            <span className="bg-green-500 text-white px-2 py-1 rounded">Resiliência</span>
            <span className="bg-purple-500 text-white px-2 py-1 rounded">Aspiração</span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-4">
          <AppSwitcher currentApp="feedback" user={currentUser} onLogout={onLogout} />
        </div>
      </div>
    </div>
  </header>
);

export default FeedbackHeader;
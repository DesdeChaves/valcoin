import React from 'react';
import DefaultSidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children, sidebar: Sidebar = DefaultSidebar }) => {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-6">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Layout;

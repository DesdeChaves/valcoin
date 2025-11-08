import React from 'react';
import { Outlet } from 'react-router-dom';
import Layout from '../Layout/Layout';
import StudentSidebar from './StudentSidebar';

const StudentLayout = () => {
  return (
    <Layout sidebar={StudentSidebar}>
      <div className="min-h-screen bg-gray-50">
        <Outlet />
      </div>
    </Layout>
  );
};

export default StudentLayout;

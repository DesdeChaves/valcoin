import React from 'react';

const SadPiggyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0" fill="#FADBD8" stroke="none" />
    <path d="M9 14c-1 1-1.5 2.5-1.5 4" stroke="#C0392B" />
    <path d="M15 14c1 1 1.5 2.5 1.5 4" stroke="#C0392B" />
    <path d="M9.5 9.5c-.667.667-1.5 1-2.5 1" stroke="#C0392B" />
    <path d="M14.5 9.5c.667.667 1.5 1 2.5 1" stroke="#C0392B" />
    <path d="M12 6l-1 -1l-1 1" stroke="#C0392B" />
    <path d="M12 6l1 -1l1 1" stroke="#C0392B" />
  </svg>
);

const GraphicalError = () => {
  return (
    <div className="mt-4 p-4 bg-red-200 text-red-800 font-bold rounded-2xl text-center animate-shake">
      <h3 className="text-2xl" style={{ fontFamily: '"Comic Sans MS", cursive' }}>Oh não!</h3>
      <div className="flex justify-center my-4">
        <SadPiggyIcon className="w-24 h-24" />
      </div>
    </div>
  );
};

export default GraphicalError;

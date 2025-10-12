import React from 'react';

const PiggyBankIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0" fill="#FFC107" stroke="none" />
    <path d="M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" fill="#FFD54F" stroke="none" />
    <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" fill="#FFECB3" stroke="none" />
    <path d="M12 12, L12 12, M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="#FFA000" stroke="none" />
    <path d="M12 12, L12 12, M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0, M12 10.5v3" stroke="#FFFFFF" strokeWidth="1" />
  </svg>
);

const CoinIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#FFD700" stroke="#F9A825" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="10" fill="#F9A825" fontWeight="bold">VC</text>
  </svg>
);

const ValKidsPiggyBank = ({ saldo }) => {
  const coinCount = Math.floor(saldo);

  return (
    <div className="bg-gradient-to-br from-orange-200 to-yellow-200 p-6 rounded-3xl shadow-2xl border-4 border-white relative overflow-hidden">
      <div className="flex flex-col items-center justify-center text-center">
        <h2 className="text-3xl font-bold text-orange-600 mb-4" style={{ fontFamily: '"Comic Sans MS", cursive' }}>O Meu Mealheiro</h2>
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-4">
          <PiggyBankIcon className="w-full h-full text-pink-400" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl sm:text-5xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
              {saldo.toFixed(2)}
            </span>
          </div>
        </div>
        <p className="text-lg text-yellow-800 font-semibold">
          Tens {coinCount} {coinCount === 1 ? 'moeda' : 'moedas'}!
        </p>
      </div>
    </div>
  );
};

export default ValKidsPiggyBank;

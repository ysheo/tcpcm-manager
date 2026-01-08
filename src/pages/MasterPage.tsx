import React from 'react';
import { FiDatabase } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext'; // ★ Hook Import

const MasterPage = () => {
  const { t } = useLanguage(); // ★ 훅 사용

  return (
    <div className="flex flex-col items-center justify-center h-full bg-white rounded-lg border border-gray-200 shadow-sm p-10">
      <div className="p-6 bg-blue-50 rounded-full mb-4">
        <FiDatabase className="text-4xl text-blue-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('master_title')}</h2>
      <p className="text-gray-500 text-center max-w-md">
        {t('master_desc')}<br/>
        {t('master_sub_desc')}
      </p>
    </div>
  );
};

export default MasterPage;
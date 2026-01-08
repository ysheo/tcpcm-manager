import React from 'react';
import { FiTool } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';

const EmptyPage = ({ title }: { title: string }) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
      <FiTool className="text-5xl mb-4 opacity-30" />
      <p className="text-lg font-medium">{t('empty_title', { title })}</p>
    </div>
  );
};

export default EmptyPage;
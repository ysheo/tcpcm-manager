import React, { useState } from 'react';
import { FiBox } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext';
import MaterialList_Price from './MaterialList_Price';
import MaterialList_Property from './MaterialList_Property';

const MaterialPage = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'Price' | 'Prop'>('Price');

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6 relative">
      
      {/* 1. 상단 타이틀 & 탭 (버튼들 제거됨) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FiBox className="text-teal-600" />
              {t('mat_title')}
            </h2>
            <p className="text-gray-500 text-sm mt-1 mb-4">Master Data Management</p>
            
            {/* 탭 버튼 */}
            <div className="inline-flex bg-gray-100 p-1.5 rounded-xl">
              <button 
                onClick={() => setActiveTab('Price')} 
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'Price' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('mat_tab_price')}
              </button>
              <button 
                onClick={() => setActiveTab('Prop')} 
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === 'Prop' ? 'bg-white text-teal-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('mat_tab_prop')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 탭에 따른 컴포넌트 렌더링 */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'Price' ? <MaterialList_Price /> : <MaterialList_Property />}
      </div>

    </div>
  );
};

export default MaterialPage;
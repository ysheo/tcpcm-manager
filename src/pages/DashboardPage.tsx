import React from 'react';
import { FiSmile, FiBox, FiActivity, FiClock } from 'react-icons/fi';
import { useLanguage } from '../contexts/LanguageContext'; // ★ Hook 추가

const DashboardPage = ({ user }: { user: any }) => {
  const { t } = useLanguage(); // ★ 훅 사용

  return (
    <div className="p-8 h-full bg-gray-50 overflow-y-auto">
      {/* 환영 배너 */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {/* ★ 이름과 문구 번역 적용 */}
            {t('dash_welcome', { name: user.UserName })} 
          </h1>
          <p className="text-gray-500">
            {t('dash_subtitle')}
          </p>
        </div>
        <div className="hidden md:block">
            <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center text-teal-600">
                <FiSmile size={32} />
            </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4"><FiBox size={24}/></div>
                <h3 className="font-bold text-gray-700">{t('dash_card_projects')}</h3>
            </div>
            <p className="text-3xl font-bold text-gray-800">12<span className="text-sm text-gray-400 font-normal ml-1">Projects</span></p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg mr-4"><FiActivity size={24}/></div>
                <h3 className="font-bold text-gray-700">{t('dash_card_status')}</h3>
            </div>
            <p className="text-lg font-bold text-green-600">{t('dash_status_ok')}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center mb-4">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg mr-4"><FiClock size={24}/></div>
                <h3 className="font-bold text-gray-700">{t('dash_card_last_login')}</h3>
            </div>
            <p className="text-sm font-medium text-gray-600">{new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
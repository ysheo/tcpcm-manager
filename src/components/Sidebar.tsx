import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FiLayers, FiRefreshCw, FiSettings, FiUsers, FiBox, FiChevronDown, FiChevronRight, FiMenu,
  FiLogOut, FiPieChart, FiLayout, FiSliders, FiHome, FiDatabase, 
  FiDollarSign, FiCpu, FiPackage, FiUser, FiMapPin, FiTrendingUp, FiGlobe
} from 'react-icons/fi';
import type { TabType } from '../App';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  user: any; 
  onLogout: () => void;
}

const Sidebar = ({ activeTab, setActiveTab, user, onLogout }: SidebarProps) => {
  const { t, language, setLanguage } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const [menuState, setMenuState] = useState({
    cost: true,
    master: true,
    settings: false
  });

  const isAdmin = user && user.UserLevel === 1;

  const toggleMenu = (key: 'cost' | 'master' | 'settings') => {
    if (!isExpanded) setIsExpanded(true);
    setMenuState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMenuClick = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as 'ko' | 'en');
  };

  return (
    // [변경] bg-teal-900 -> bg-white, 텍스트 색상 변경, 우측 테두리 추가
    <aside className={`bg-white border-r border-gray-200 flex flex-col text-gray-600 flex-shrink-0 transition-all duration-300 shadow-xl z-50 ${isExpanded ? 'w-64' : 'w-20'}`}>
      
      {/* 헤더 */}
      {/* [변경] 배경색, 테두리, 텍스트 색상 변경 */}
      <div className={`h-16 flex items-center bg-white border-b border-gray-100 transition-all duration-300 ${isExpanded ? 'px-6 justify-between' : 'justify-center'}`}>
        {isExpanded && (
          <div className="flex items-center font-bold text-xl tracking-wider truncate text-gray-800 animate-fadeIn">
            <FiBox className="mr-2 text-teal-600 flex-shrink-0" /> {/* 로고 아이콘 색상 변경 */}
            TcPCM
          </div>
        )}
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-lg focus:outline-none transition-colors">
          {isExpanded ? <FiMenu size={20} /> : <FiBox size={24} className="text-teal-600" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-2 overflow-x-hidden thin-scrollbar">
        
        {/* 1. 홈 */}
        <MenuItem label={t('menu_home')} icon={FiHome} active={activeTab === 'home'} isExpanded={isExpanded} onClick={() => handleMenuClick('home')} />

        {/* 구분선 색상 변경 */}
        <div className={`my-2 border-t border-gray-100 mx-auto ${isExpanded ? 'w-5/6' : 'w-10'}`}></div>

        {/* 2. Cost Analytics */}
        <div>
            {/* [변경] 메뉴 아이템 스타일링: 활성 상태일 때 bg-teal-50, text-teal-700 적용 */}
            <div onClick={() => toggleMenu('cost')} className={`flex items-center cursor-pointer transition-all border-l-4 relative group ${isExpanded ? 'px-6 py-3 justify-between' : 'px-0 py-3 justify-center'} ${activeTab.startsWith('cost') ? 'border-teal-500 text-teal-700 bg-teal-50 font-bold' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <div className={`flex items-center ${!isExpanded && 'justify-center w-full'}`}>
                <FiPieChart className={`${isExpanded ? 'mr-3' : 'mr-0'} text-lg flex-shrink-0 ${activeTab.startsWith('cost') ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className={`whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>{t('menu_cost')}</span>
              </div>
              {isExpanded && <span className="flex-shrink-0 text-gray-400">{menuState.cost ? <FiChevronDown /> : <FiChevronRight />}</span>}
            </div>
            
            {/* [변경] 서브메뉴 배경: bg-gray-50 (약간 어둡게 해서 계층 구분) */}
            <div className={`overflow-hidden transition-all duration-300 bg-gray-50 ${isExpanded && menuState.cost ? 'max-h-96' : 'max-h-0'}`}>
              <SubMenuItem label={t('menu_explorer')} icon={FiLayers} id="cost-v1" activeTab={activeTab} onClick={handleMenuClick} />
              <SubMenuItem label={t('menu_dashboard')} icon={FiLayout} id="cost-v2" activeTab={activeTab} onClick={handleMenuClick} />
            </div>
        </div>

        <div className={`my-2 border-t border-gray-100 mx-auto ${isExpanded ? 'w-5/6' : 'w-10'}`}></div>

        {/* 3. Master Data */}
        {isAdmin && (
          <div>
            <div onClick={() => toggleMenu('master')} className={`flex items-center cursor-pointer transition-all border-l-4 relative group ${isExpanded ? 'px-6 py-3 justify-between' : 'px-0 py-3 justify-center'} ${activeTab.startsWith('master') || activeTab === 'plant' || activeTab === 'material' ? 'border-teal-500 text-teal-700 bg-teal-50 font-bold' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <div className={`flex items-center ${!isExpanded && 'justify-center w-full'}`}>
                <FiDatabase className={`${isExpanded ? 'mr-3' : 'mr-0'} text-lg flex-shrink-0 ${activeTab.startsWith('master') || activeTab === 'plant' ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className={`whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>{t('menu_master')}</span>
              </div>
              {isExpanded && <span className="flex-shrink-0 text-gray-400">{menuState.master ? <FiChevronDown /> : <FiChevronRight />}</span>}
            </div>

            <div className={`overflow-hidden transition-all duration-300 bg-gray-50 ${isExpanded && menuState.master ? 'max-h-[600px]' : 'max-h-0'}`}>
              <SubMenuItem label={t('menu_plant')} icon={FiMapPin} id="plant" activeTab={activeTab} onClick={handleMenuClick} />
              <SubMenuItem label={t('menu_material')} icon={FiPackage} id="material" activeTab={activeTab} onClick={handleMenuClick} />
              <SubMenuItem label={t('menu_machine')} icon={FiCpu} id="machine" activeTab={activeTab} onClick={handleMenuClick} />
              <SubMenuItem label={t('menu_labor')} icon={FiUser} id="labor" activeTab={activeTab} onClick={handleMenuClick} />
              <SubMenuItem label={t('menu_overhead')} icon={FiTrendingUp} id="overheads" activeTab={activeTab} onClick={handleMenuClick} />              
              <SubMenuItem label={t('menu_factor')} icon={FiDollarSign} id="factor" activeTab={activeTab} onClick={handleMenuClick} />
              <SubMenuItem label={t('menu_exchange')} icon={FiRefreshCw} id="exchange" activeTab={activeTab} onClick={handleMenuClick} />
            </div>
          </div>
        )}        

        {/* 4. 시스템 설정 */}
        {isAdmin && (
          <div>
            <div onClick={() => toggleMenu('settings')} className={`flex items-center cursor-pointer transition-all border-l-4 relative group ${isExpanded ? 'px-6 py-3 justify-between' : 'px-0 py-3 justify-center'} ${activeTab === 'users' || activeTab === 'config' ? 'border-teal-500 text-teal-700 bg-teal-50 font-bold' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
              <div className={`flex items-center ${!isExpanded && 'justify-center w-full'}`}>
                <FiSettings className={`${isExpanded ? 'mr-3' : 'mr-0'} text-lg flex-shrink-0 ${activeTab === 'users' || activeTab === 'config' ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                <span className={`whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>{t('menu_system')}</span>
              </div>
              {isExpanded && <span className="flex-shrink-0 text-gray-400">{menuState.settings ? <FiChevronDown /> : <FiChevronRight />}</span>}
            </div>

            <div className={`overflow-hidden transition-all duration-300 bg-gray-50 ${isExpanded && menuState.settings ? 'max-h-96' : 'max-h-0'}`}>
              <SubMenuItem label={t('menu_user')} icon={FiUsers} id="users" activeTab={activeTab} onClick={handleMenuClick} />
              <SubMenuItem label={t('menu_config')} icon={FiSliders} id="config" activeTab={activeTab} onClick={handleMenuClick} />
            </div>
          </div>
        )}
      </nav>

      {/* 언어 선택 드롭다운 (밝은 테마) */}
      {isExpanded && (
        <div className="px-4 pb-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <FiGlobe className="text-gray-400" />
            </div>
            <select 
              value={language} 
              onChange={handleLanguageChange} 
              className="block w-full pl-9 pr-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded hover:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 appearance-none cursor-pointer shadow-sm transition-colors"
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
              <FiChevronDown className="text-gray-400 text-xs" />
            </div>
          </div>
        </div>
      )}

      {/* 하단 프로필 (밝은 테마) */}
      <div className={`bg-white border-t border-gray-200 transition-all duration-300 flex items-center ${isExpanded ? 'p-4 justify-between' : 'p-4 flex-col justify-center space-y-4'}`}>
        <div className="flex items-center overflow-hidden">
          {/* 아바타: 밝은 청록 배경 + 진한 청록 글씨 */}
          <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-sm font-bold flex-shrink-0 text-teal-600 border border-teal-200 shadow-sm">
            {user.UserName.charAt(0)}
          </div>
          <div className={`ml-3 transition-all duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 hidden'}`}>
            <p className="text-sm font-bold text-gray-800 whitespace-nowrap">{user.UserName}</p>
            <p className="text-xs text-gray-500 whitespace-nowrap font-medium">{user.UserLevel === 1 ? 'Administrator' : 'General User'}</p>
          </div>
        </div>
        <button onClick={onLogout} className={`flex items-center justify-center rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 ${isExpanded ? 'p-2' : 'p-2'}`} title={t('logout')}>
            <FiLogOut size={20} />
        </button>
      </div>
    </aside>
  );
};

// 상위 메뉴 아이템 (밝은 테마)
const MenuItem = ({ label, icon: Icon, active, isExpanded, onClick }: any) => (
  <div onClick={onClick} className={`flex items-center cursor-pointer transition-all border-l-4 relative group ${isExpanded ? 'px-6 py-3' : 'px-0 py-3 justify-center'} ${active ? 'bg-teal-50 border-teal-500 text-teal-700 font-bold' : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`} title={!isExpanded ? label : ""}>
    <Icon className={`${isExpanded ? 'mr-3' : 'mr-0'} text-lg flex-shrink-0 transition-all ${active ? 'text-teal-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
    <span className={`whitespace-nowrap transition-opacity duration-200 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>{label}</span>
  </div>
);

// 하위 메뉴 아이템 (밝은 테마)
const SubMenuItem = ({ label, icon: Icon, id, activeTab, onClick }: any) => (
  <div onClick={() => onClick(id)} className={`flex items-center pl-14 pr-6 py-2 cursor-pointer text-sm transition-colors ${activeTab === id ? 'text-teal-600 font-bold bg-white' : 'text-gray-500 hover:text-teal-600 hover:bg-gray-100'}`}>
    <Icon className={`mr-2 text-xs ${activeTab === id ? 'opacity-100' : 'opacity-50'}`} /> 
    <span>{label}</span>
  </div>
);

export default Sidebar;
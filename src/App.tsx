import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MainScreen from './components/MainScreen';
import LoginPage from './pages/LoginPage'; 
import { LanguageProvider } from './contexts/LanguageContext'; 

export type TabType = 'home' |'cost' |  'cost-v1' |  'cost-v2' |'master' | 'plant' | 'factor' | 'exchange' | 'material'  | 'labor'| 'machine' | 'overheads' | 'users' | 'config';

// Provider 내부에서 로직을 수행하기 위한 분리된 컴포넌트
const AppContent = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');

  useEffect(() => {
    const savedUser = sessionStorage.getItem('loginUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLoginSuccess = (userInfo: any) => {
    sessionStorage.setItem('loginUser', JSON.stringify(userInfo));
    setUser(userInfo);
  };

  const handleLogout = () => {
    // 로그아웃 메시지는 window.confirm이라 여기서 바로 번역하긴 까다로우니 일단 유지
    if(window.confirm('로그아웃 하시겠습니까? (Are you sure you want to logout?)')) {
      sessionStorage.removeItem('loginUser');
      setUser(null);
    }
  };

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />
      <MainScreen activeTab={activeTab} user={user} />
    </div>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
import React, { useState } from 'react';
import axios from 'axios';
import { FiBox, FiUser, FiLock, FiCheckCircle } from 'react-icons/fi';
import { AppConfig } from '../config/AppConfig';

interface LoginPageProps {
  onLoginSuccess: (userInfo: any) => void;
}

const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  const [id, setId] = useState('');
  const [pwd, setPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 제출 시 새로고침 방지
    if (!id || !pwd) return alert('아이디와 비밀번호를 입력해주세요.');

    setLoading(true);
    try {
      // 1. DB에서 사용자 조회 (ID, 비번, 그리고 활성화된 계정인지 확인)
      // 주의: 실무에서는 비밀번호를 이렇게 평문으로 비교하면 안되고 해시(Hash)해야 합니다.
      const query = `
        SELECT UserSeq, UserID, UserName, Department, UserLevel 
        FROM TB_MNG_USER 
        WHERE UserID = '${id}' AND UserPwd = dbo.fn_EncryptString('${pwd}') AND IsActive = 1
      `;

      const res = await axios.post('http://localhost/api/execute', {
        dbName: AppConfig.DB.CONSOLE, // 본인 DB 이름 확인!
        query: query
      });

      if (res.data.success && res.data.data.length > 0) {
        // 로그인 성공!
        const user = res.data.data[0];
        
        // 2. 접속 이력(Log) 남기기 (성공)
        await axios.post('http://localhost/api/execute', {
            dbName: AppConfig.DB.CONSOLE,
            query: `INSERT INTO TB_HIS_ACCESS (UserSeq, AccessIP, AccessDevice, AccessType, IsSuccess, AccessDate) 
                    VALUES (${user.UserSeq}, '127.0.0.1', 'WebClient', 'Login', 1, GETDATE())`
        });

        // 3. 부모 컴포넌트(App.tsx)에 로그인 정보 전달
        onLoginSuccess(user);

      } else {
        // 로그인 실패
        alert('아이디 또는 비밀번호가 잘못되었거나 승인되지 않은 계정입니다.');
        
        // 실패 로그 남기기 (선택사항 - UserSeq를 모르니 0으로 남김)
        /*
        await axios.post('http://localhost/api/execute', {
            dbName: AppConfig.DB.CONSOLE,
            query: `INSERT INTO TB_HIS_ACCESS (UserSeq, AccessIP, AccessDevice, AccessType, IsSuccess, AccessDate) 
                    VALUES (0, '127.0.0.1', 'WebClient', 'LoginFail:${id}', 0, GETDATE())`
        });
        */
      }
    } catch (err) {
      console.error(err);
      alert('서버 연결 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-teal-600">
        
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-50 mb-4">
            <FiBox className="text-4xl text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">TcPCM Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Cost Management System</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="text-gray-400" />
              </div>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md border py-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                placeholder="UserID"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiLock className="text-gray-400" />
              </div>
              <input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="pl-10 block w-full border-gray-300 rounded-md border py-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-400">
          <p>&copy; 2026 TcPCM System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
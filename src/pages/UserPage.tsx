import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/ApiService';
import * as XLSX from 'xlsx';
import { useLanguage } from '../contexts/LanguageContext'; // ★ Hook Import
import {
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiActivity, FiX,
  FiUsers, FiDownload, FiSettings, FiSave, FiFileText, FiUserPlus,
  FiChevronUp, FiChevronDown
} from 'react-icons/fi';
import { AppConfig } from '../config/AppConfig';

// --- 타입 정의 ---
interface User {
  UserSeq: number;
  UserID: string;
  UserName: string;
  Department: string;
  UserLevel: number;
  IsActive: number;
  RegDate: string;
}

interface AccessLog {
  LogSeq: number;
  UserSeq: number;
  AccessIP: string;
  AccessDevice: string;
  AccessType: string;
  IsSuccess: boolean;
  AccessDate: string;
}

interface TcConnInfo {
  ConnSeq: number;
  AuthKey: string;
  AuthSecret: string;
}

const UserPage = () => {
  const { t } = useLanguage(); // ★ 훅 사용
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);

  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // 정렬 상태
  const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' } | null>(null);

  // 모달 상태
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isConnModalOpen, setIsConnModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    UserID: '', UserPwd: '', UserName: '', Department: '', UserLevel: 'User', IsActive: 1
  });

  const [connData, setConnData] = useState<TcConnInfo>({ ConnSeq: 0, AuthKey: '', AuthSecret: '' });

  const [exportTarget, setExportTarget] = useState<'WEB' | 'TCPCM'>('WEB');
  const [isAllDate, setIsAllDate] = useState(false);

  const [exportCondition, setExportCondition] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    userName: '',
    userLevel: 'All'
  });

  // 조회 함수
  const fetchUsers = async () => {
    setLoading(true);
    const result = await api.executeQuery(`SELECT UserSeq, UserID, UserName, Department, UserLevel, IsActive, RegDate FROM TB_MNG_USER ORDER BY UserSeq DESC`);
    if (result.success) setUsers(result.data);
    setLoading(false);
  };

  const fetchHistory = async (userSeq: number) => {
    setLogs([]);
    const result = await api.executeQuery(`SELECT TOP 100 * FROM TB_HIS_ACCESS WHERE UserSeq = ${userSeq} ORDER BY AccessDate DESC`);
    if (result.success) setLogs(result.data);
  };

  const fetchConnInfo = async () => {
    const result = await api.executeQuery(`
      SELECT TOP 1 ConnSeq, AuthKey, 
      dbo.fn_DecryptString(AuthSecret) as AuthSecret 
      FROM TB_MNG_API_CONN
    `);

    if (result.success && result.data.length > 0) {
      const data = result.data[0];
      setConnData({
        ConnSeq: data.ConnSeq,
        AuthKey: data.AuthKey,
        AuthSecret: data.AuthSecret || ''
      });
    } else {
      setConnData({ ConnSeq: 0, AuthKey: '', AuthSecret: '' });
    }
  };

  const uniqueDepts = Array.from(new Set(users.map(u => u.Department))).filter(Boolean);
  const safeUsers = Array.isArray(users) ? users : [];

  const filteredUsers = safeUsers.filter(user => {
    const matchesSearch = (user.UserName || '').includes(searchTerm) || (user.UserID || '').includes(searchTerm);
    const matchesDept = filterDept === 'All' || user.Department === filterDept;
    const matchesLevel = filterLevel === 'All' || (user.UserLevel === 1 ? 'Admin' : 'User') === filterLevel;
    const matchesStatus = filterStatus === 'All' || (Number(user.IsActive) === 1 ? 'Active' : 'Inactive') === filterStatus;
    return matchesSearch && matchesDept && matchesLevel && matchesStatus;
  });

  const sortedUsers = useMemo(() => {
    let sortableItems = [...filteredUsers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredUsers, sortConfig]);

  const requestSort = (key: keyof User) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof User) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <FiChevronUp className="inline ml-1" /> : <FiChevronDown className="inline ml-1" />;
  };

  const handleSimpleExcelExport = () => {
    if (users.length === 0) return alert(t('no_data'));
    const excelData = users.map(u => ({
      'No': u.UserSeq, 'ID': u.UserID, 'Name': u.UserName, 'Dept': u.Department,
      'Role': u.UserLevel === 1 ? 'Admin' : 'User',
      'Status': u.IsActive == 1 ? 'Active' : 'Inactive', 'Date': u.RegDate
    }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, `UserList_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDetailedExport = async () => {
    if (!isAllDate && exportCondition.startDate > exportCondition.endDate) return alert("Date Error");

    let query = '';
    let fileName = '';
    let sheetName = '';
    let targetDB = AppConfig.DB.CONSOLE;

    if (exportTarget === 'TCPCM') {
      targetDB = AppConfig.DB.PCM;
      let whereClause = '1=1';
      if (!isAllDate) whereClause += ` AND SessionStart >= '${exportCondition.startDate} 00:00:00' AND SessionStart <= '${exportCondition.endDate} 23:59:59'`;
      query = `SELECT LogonName, SessionStart, SessionEnd, ComputerName FROM [dbo].[ApplicationSessionLogs] WHERE ${whereClause} ORDER BY SessionStart DESC`;
      sheetName = 'TcPCM_Logs';
      fileName = `TcPCM_Logs_${isAllDate ? 'All' : exportCondition.startDate}.xlsx`;
    } else {
      targetDB = AppConfig.DB.CONSOLE;
      let whereClause = '1=1';
      if (!isAllDate) whereClause += ` AND H.AccessDate >= '${exportCondition.startDate} 00:00:00' AND H.AccessDate <= '${exportCondition.endDate} 23:59:59'`;
      if (exportCondition.userName) whereClause += ` AND U.UserName LIKE N'%${exportCondition.userName}%'`;
      if (exportCondition.userLevel !== 'All') whereClause += ` AND U.UserLevel = ${exportCondition.userLevel === 'Admin' ? 1 : 0}`;
      query = `SELECT U.UserID, U.UserName, U.Department, CASE WHEN U.UserLevel = 1 THEN 'Admin' ELSE 'User' END as Role, H.AccessDate, H.AccessIP, H.AccessType, CASE WHEN H.IsSuccess = 1 THEN 'Success' ELSE 'Fail' END as Result FROM TB_MNG_USER U INNER JOIN TB_HIS_ACCESS H ON U.UserSeq = H.UserSeq WHERE ${whereClause} ORDER BY H.AccessDate DESC`;
      sheetName = 'Web_Access_Logs';
      fileName = `WebAccess_${isAllDate ? 'All' : exportCondition.startDate}.xlsx`;
    }

    const result = await api.executeQuery(query, targetDB);
    if (!result.success || result.data.length === 0) return alert(t('msg_no_data_cond'));

    const ws = XLSX.utils.json_to_sheet(result.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
    setIsExportModalOpen(false);
  };

  const handleSaveConn = async () => {
    if (!connData.AuthKey || !connData.AuthSecret) return alert(t('msg_req_input'));
    let query = connData.ConnSeq > 0
      ? `UPDATE TB_MNG_API_CONN SET AuthKey='${connData.AuthKey}', AuthSecret=dbo.fn_EncryptString('${connData.AuthSecret}') WHERE ConnSeq=${connData.ConnSeq}`
      : `INSERT INTO TB_MNG_API_CONN (ConnName, ApiUrl, AuthKey, AuthSecret, UseYN, SortOrder, RegDate) VALUES ('TcPCM_Default', 'http://localhost/api', '${connData.AuthKey}', dbo.fn_EncryptString('${connData.AuthSecret}'), 'Y', 1, GETDATE())`;
    const res = await api.executeQuery(query);
    if (res.success) { alert(t('msg_saved')); setIsConnModalOpen(false); fetchConnInfo(); }
  };

  const handleDelete = async (userSeq: number) => {
    if (!window.confirm(t('msg_confirm_delete'))) return;
    await api.executeQuery(`DELETE FROM TB_HIS_ACCESS WHERE UserSeq = ${userSeq}`);
    const res = await api.executeQuery(`DELETE FROM TB_MNG_USER WHERE UserSeq = ${userSeq}`);
    if (res.success) { alert(t('msg_deleted')); fetchUsers(); }
  };

  const handleSaveUser = async () => {
    if (!formData.UserID || !formData.UserName) return alert(t('msg_req_id_name'));
    const safeName = formData.UserName.replace(/'/g, "");
    const safeDept = formData.Department.replace(/'/g, "");
    const userLevelInt = formData.UserLevel === 'Admin' ? 1 : 0;
    const activeBit = Number(formData.IsActive);

    let query = '';
    if (editingUser) {
      const pwdUpdate = formData.UserPwd ? `, UserPwd=dbo.fn_EncryptString('${formData.UserPwd}')` : '';
      query = `UPDATE TB_MNG_USER SET UserName=N'${safeName}', Department=N'${safeDept}', UserLevel=${userLevelInt}, IsActive=${activeBit} ${pwdUpdate} WHERE UserSeq=${editingUser.UserSeq}`;
    } else {
      query = `INSERT INTO TB_MNG_USER (UserID, UserPwd, UserName, Department, UserLevel, IsActive, RegDate) VALUES ('${formData.UserID}', dbo.fn_EncryptString('${formData.UserPwd}'), N'${safeName}', N'${safeDept}', ${userLevelInt}, ${activeBit}, GETDATE())`;
    }

    const res = await api.executeQuery(query);
    if (res.success) { alert(t('msg_saved')); setIsFormOpen(false); fetchUsers(); }
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* 툴바 영역 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col space-y-4">
        <div>
          <h2 className="font-bold text-gray-800 text-lg flex items-center">
            <FiUsers className="mr-2" /> {t('user_title')}
          </h2>
        </div>

        <div className="flex justify-between items-center w-full">
          <div className="flex space-x-2 items-center">
            <div className="relative">
              <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
              <input type="text" placeholder={t('user_search_placeholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-48 bg-white" />
            </div>
            <div className="h-6 w-px bg-gray-300 mx-2"></div>
            <div className="relative">
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="pl-2 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer hover:bg-gray-50">
                <option value="All">{t('user_filter_dept')}: {t('all')}</option>
                {uniqueDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
            </div>
            <div className="relative">
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="pl-2 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer hover:bg-gray-50">
                <option value="All">{t('user_filter_role')}: {t('all')}</option>
                <option value="Admin">Admin</option>
                <option value="User">User</option>
              </select>
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="pl-2 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer hover:bg-gray-50">
                <option value="All">{t('user_filter_status')}: {t('all')}</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-2 items-center">
            <button onClick={() => { fetchConnInfo(); setIsConnModalOpen(true); }}
              className="flex items-center px-3 py-2 bg-white border border-gray-600 text-gray-600 rounded-md text-sm font-bold hover:bg-gray-700 transition-colors shadow-sm">
              <FiSettings className="mr-1" /> {t('user_btn_api')}
            </button>
            <div className="flex rounded-md shadow-sm" role="group">
              <button onClick={handleSimpleExcelExport}
                className="flex items-center px-3 py-2 bg-white border border-green-600 text-green-600 rounded-md text-sm font-bold hover:bg-gray-700 transition-colors shadow-sm">
                <FiDownload className="mr-1" /> {t('user_btn_export_user')}
              </button>
              <button onClick={() => setIsExportModalOpen(true)}
                className="flex items-center px-3 py-2 bg-white border border-green-600 text-green-600 rounded-md text-sm font-bold hover:bg-gray-700 transition-colors shadow-sm">
                <FiDownload className="mr-1" /> {t('user_btn_export_log')}
              </button>
            </div>
            <button onClick={() => { setEditingUser(null); setFormData({ UserID: '', UserPwd: '', UserName: '', Department: '', UserLevel: 'User', IsActive: 1 }); setIsFormOpen(true); }}
              className="flex items-center px-4 py-2 bg-white border border-teal-600 text-teal-600 rounded-md text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm">
              <FiPlus className="mr-1" /> {t('add')}
            </button>
          </div>
        </div>
      </div>

      {/* 그리드 */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th onClick={() => requestSort('UserSeq')} className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase w-16 cursor-pointer hover:bg-gray-200 transition-colors">{t('user_th_no')} {getSortIcon('UserSeq')}</th>
              <th onClick={() => requestSort('UserID')} className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-200 transition-colors">{t('user_th_id')} {getSortIcon('UserID')}</th>
              <th onClick={() => requestSort('UserName')} className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-200 transition-colors">{t('user_th_name')} {getSortIcon('UserName')}</th>
              <th onClick={() => requestSort('Department')} className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-200 transition-colors">{t('user_th_dept')} {getSortIcon('Department')}</th>
              <th onClick={() => requestSort('UserLevel')} className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-200 transition-colors">{t('user_th_role')} {getSortIcon('UserLevel')}</th>
              <th onClick={() => requestSort('IsActive')} className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-200 transition-colors">{t('user_th_status')} {getSortIcon('IsActive')}</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase w-48">{t('user_th_manage')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (<tr><td colSpan={7} className="text-center py-10">{t('loading')}</td></tr>) :
              sortedUsers.length === 0 ? (<tr><td colSpan={7} className="text-center py-10 text-gray-500">{t('no_data')}</td></tr>) :
                sortedUsers.map((user) => (
                  <tr key={user.UserSeq} className="hover:bg-teal-50 transition-colors">
                    <td className="px-6 py-4 text-xs text-center text-gray-500">{user.UserSeq}</td>
                    <td className="px-6 py-4 text-sm text-center font-bold text-gray-900">{user.UserID}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-700">{user.UserName}</td>
                    <td className="px-6 py-4 text-sm text-center text-gray-500">{user.Department}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${user.UserLevel === 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{user.UserLevel === 1 ? 'Admin' : 'User'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {Number(user.IsActive) === 1 ?
                        <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs font-bold">{t('user_status_active')}</span> :
                        <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded text-xs font-bold">{t('user_status_inactive')}</span>
                      }
                    </td>
                    <td className="px-6 py-4 flex justify-center space-x-2">
                      <button onClick={() => { setEditingUser(user); fetchHistory(user.UserSeq); setIsHistoryOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"><FiActivity /></button>
                      <button onClick={() => { setEditingUser(user); setFormData({ ...user, UserLevel: user.UserLevel === 1 ? 'Admin' : 'User', UserPwd: '' }); setIsFormOpen(true); }} className="p-1.5 text-teal-600 hover:bg-teal-100 rounded"><FiEdit2 /></button>
                      <button onClick={() => handleDelete(user.UserSeq)} className="p-1.5 text-red-600 hover:bg-red-100 rounded"><FiTrash2 /></button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* --- 사용자 모달 --- */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6 border-t-4 border-teal-600">
            <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
              <span className="flex items-center">
                <FiUserPlus className="mr-2" /> {editingUser ? t('user_modal_edit_title') : t('user_modal_add_title')}
              </span>
              <button onClick={() => setIsFormOpen(false)}><FiX /></button>
            </h3>
            <div className="bg-gray-50 p-3 rounded mb-4 text-xs text-gray-500 border border-gray-200">
              <p>{t('user_modal_desc')}<br /><span className="text-teal-600 font-bold">{t('user_modal_desc_sub')}</span></p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('label_id')}</label>
                <input type="text" placeholder={t('placeholder_id')} disabled={!!editingUser} value={formData.UserID} onChange={e => setFormData({ ...formData, UserID: e.target.value })} className="w-full border border-gray-300 p-2 rounded text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('label_pwd')} {editingUser && <span className="text-gray-400 font-normal">{t('label_pwd_change')}</span>}</label>
                <input type="password" placeholder={t('placeholder_pwd')} value={formData.UserPwd} onChange={e => setFormData({ ...formData, UserPwd: e.target.value })} className="w-full border border-gray-300 p-2 rounded text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('label_name')}</label>
                <input type="text" placeholder={t('placeholder_name')} value={formData.UserName} onChange={e => setFormData({ ...formData, UserName: e.target.value })} className="w-full border border-gray-300 p-2 rounded text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('label_dept')}</label>
                <input type="text" placeholder={t('placeholder_dept')} value={formData.Department} onChange={e => setFormData({ ...formData, Department: e.target.value })} className="w-full border border-gray-300 p-2 rounded text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-600 mb-1">{t('label_role')}</label>
                  <select value={formData.UserLevel} onChange={e => setFormData({ ...formData, UserLevel: e.target.value })} className="w-full border border-gray-300 p-2 rounded text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                    <option value="User">User</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center cursor-pointer select-none">
                    <input type="checkbox" checked={Number(formData.IsActive) === 1} onChange={e => setFormData({ ...formData, IsActive: e.target.checked ? 1 : 0 })} className="mr-2 h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded" />
                    <span className="text-sm font-bold text-gray-700">{t('label_active_account')}</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">{t('cancel')}</button>
              <button onClick={handleSaveUser} className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 flex items-center"><FiSave className="mr-1" /> {t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- API 연결 설정 모달 --- */}
      {isConnModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6 border-t-4 border-gray-600">
            <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
              <span className="flex items-center"><FiSettings className="mr-2" /> {t('conn_modal_title')}</span>
              <button onClick={() => setIsConnModalOpen(false)}><FiX /></button>
            </h3>
            <div className="bg-gray-50 p-3 rounded mb-4 text-xs text-gray-500 border border-gray-200">
              <p>{t('conn_modal_desc')}<br /><span className="text-red-400">{t('conn_modal_warn')}</span></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('label_auth_key')}</label>
                <input type="text" value={connData.AuthKey} onChange={e => setConnData({ ...connData, AuthKey: e.target.value })} className="w-full border border-gray-300 p-2 rounded text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">{t('label_auth_secret')}</label>
                <input type="password" value={connData.AuthSecret} onChange={e => setConnData({ ...connData, AuthSecret: e.target.value })} className="w-full border border-gray-300 p-2 rounded text-sm focus:border-gray-500 focus:ring-1 focus:ring-gray-500" />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setIsConnModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">{t('cancel')}</button>
              <button onClick={handleSaveConn} className="px-4 py-2 bg-gray-700 text-white rounded text-sm hover:bg-gray-800 flex items-center"><FiSave className="mr-1" /> {t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 내보내기 모달 --- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6 border-t-4 border-green-600">
            <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
              <span className="flex items-center"><FiFileText className="mr-2" /> {t('export_modal_title')} </span>
              <button onClick={() => setIsExportModalOpen(false)}><FiX /></button>
            </h3>
            <div className="bg-green-50 p-3 rounded mb-4 text-xs text-green-700 border border-green-200">
              <p className="leading-relaxed">{t('export_modal_desc')}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2">{t('label_export_target')}</label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="exportTarget" checked={exportTarget === 'WEB'} onChange={() => setExportTarget('WEB')} className="mr-2 text-green-600 focus:ring-green-500" />
                    <span className="text-sm">{t('target_web')}</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input type="radio" name="exportTarget" checked={exportTarget === 'TCPCM'} onChange={() => setExportTarget('TCPCM')} className="mr-2 text-green-600 focus:ring-green-500" />
                    <span className="text-sm">{t('target_tcpcm')}</span>
                  </label>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-600">{t('label_period')}</label>
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" checked={isAllDate} onChange={e => setIsAllDate(e.target.checked)} className="mr-1" />
                    <span className="text-xs text-blue-600 font-bold">{t('label_all_period')}</span>
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="date" disabled={isAllDate} value={exportCondition.startDate} onChange={e => setExportCondition({ ...exportCondition, startDate: e.target.value })} className="border p-2 rounded text-sm w-full disabled:bg-gray-200" />
                  <span className="text-gray-400">~</span>
                  <input type="date" disabled={isAllDate} value={exportCondition.endDate} onChange={e => setExportCondition({ ...exportCondition, endDate: e.target.value })} className="border p-2 rounded text-sm w-full disabled:bg-gray-200" />
                </div>
              </div>
              {exportTarget === 'WEB' && (
                <div className="space-y-3 pt-2 border-t border-dashed">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">{t('label_user_name')}</label>
                    <input type="text" value={exportCondition.userName} onChange={e => setExportCondition({ ...exportCondition, userName: e.target.value })} className="w-full border p-2 rounded text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">{t('label_role_filter')}</label>
                    <select value={exportCondition.userLevel} onChange={e => setExportCondition({ ...exportCondition, userLevel: e.target.value })} className="w-full border p-2 rounded text-sm">
                      <option value="All">{t('all')}</option>
                      <option value="Admin">Admin</option>
                      <option value="User">User</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button onClick={() => setIsExportModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">{t('cancel')}</button>
              <button onClick={handleDetailedExport} className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center">
                <FiDownload className="mr-1" /> {t('btn_export')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 접속 이력 모달 --- */}
      {isHistoryOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[600px] h-[500px] flex flex-col border-t-4 border-blue-600">
            <div className="p-6 pb-0">
              <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
                <span className="flex items-center"><FiActivity className="mr-2" /> {t('history_modal_title')}</span>
                <button onClick={() => setIsHistoryOpen(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
              </h3>
              <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 border border-blue-200">
                <p>{t('history_modal_desc', { name: editingUser.UserName })}</p>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 pt-4">
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left font-bold text-gray-600 border-b">{t('history_th_time')}</th>
                    <th className="p-2 text-left font-bold text-gray-600 border-b">{t('history_th_ip')}</th>
                    <th className="p-2 text-left font-bold text-gray-600 border-b">{t('history_th_type')}</th>
                    <th className="p-2 text-center font-bold text-gray-600 border-b">{t('history_th_result')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center text-gray-400">{t('msg_no_history')}</td></tr>
                  ) : logs.map((log) => (
                    <tr key={log.LogSeq} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-2 text-gray-700">{new Date(log.AccessDate).toLocaleString()}</td>
                      <td className="p-2 text-gray-600">{log.AccessIP}</td>
                      <td className="p-2 text-gray-600">{log.AccessType}</td>
                      <td className="p-2 text-center">
                        {log.IsSuccess ?
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">{t('history_success')}</span> :
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">{t('history_fail')}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-lg text-right">
              <button onClick={() => setIsHistoryOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 font-medium text-gray-700 shadow-sm">{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;
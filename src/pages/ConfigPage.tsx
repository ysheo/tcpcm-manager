import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/ApiService';
import { useLanguage } from '../contexts/LanguageContext'; // ★ Hook Import
import {
  FiSearch, FiPlus, FiEdit2, FiTrash2, FiSettings, FiFilter,
  FiSave, FiX, FiRefreshCw, FiChevronUp, FiChevronDown, FiHash
} from 'react-icons/fi';

interface ConfigItem {
  Id: number;
  Class: string;
  Name: string;
  GUID: string;
}

const ConfigPage = () => {
  const { t } = useLanguage(); // ★ 훅 사용
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('All');

  const [sortConfig, setSortConfig] = useState<{ key: keyof ConfigItem; direction: 'asc' | 'desc' } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [formData, setFormData] = useState({ Class: '', Name: '', GUID: '' });

  const fetchConfigs = async () => {
    setLoading(true);
    const query = `SELECT Id, Class, Name, GUID FROM TB_MNG_CONFIG ORDER BY Class, Name`;
    const result = await api.executeQuery(query);
    if (result.success) {
      setConfigs(result.data);
    }
    setLoading(false);
  };

  const uniqueClasses = useMemo(() => {
    const classes = configs.map(c => c.Class).filter(Boolean);
    return Array.from(new Set(classes)).sort();
  }, [configs]);

  const processedConfigs = useMemo(() => {
    let items = [...configs];

    if (filterClass !== 'All') {
      items = items.filter(item => item.Class === filterClass);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.Name.toLowerCase().includes(lower) ||
        item.Class.toLowerCase().includes(lower) ||
        item.GUID.toLowerCase().includes(lower)
      );
    }

    if (sortConfig !== null) {
      items.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [configs, filterClass, searchTerm, sortConfig]);

  const handleSort = (key: keyof ConfigItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof ConfigItem) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <FiChevronUp className="inline ml-1" /> : <FiChevronDown className="inline ml-1" />;
  };

  const openModal = (item: ConfigItem | null) => {
    setEditingItem(item);
    if (item) {
      setFormData({ Class: item.Class, Name: item.Name, GUID: item.GUID });
    } else {
      setFormData({ Class: '', Name: '', GUID: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.Class || !formData.Name || !formData.GUID) return alert(t('config_msg_valid_req'));

    let query = "";
    if (editingItem) {
      query = `UPDATE TB_MNG_CONFIG SET Class = N'${formData.Class}', Name = N'${formData.Name}', GUID = '${formData.GUID}' WHERE Id = ${editingItem.Id}`;
    } else {
      query = `INSERT INTO TB_MNG_CONFIG (Class, Name, GUID) VALUES (N'${formData.Class}', N'${formData.Name}', '${formData.GUID}')`;
    }

    const result = await api.executeQuery(query);
    if (result.success) {
      alert(t('config_msg_save_success'));
      setIsModalOpen(false);
      fetchConfigs();
    } else {
      alert(t('config_msg_save_fail') + ": " + result.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('config_msg_delete_confirm'))) return;
    const query = `DELETE FROM TB_MNG_CONFIG WHERE Id = ${id}`;
    const result = await api.executeQuery(query);
    if (result.success) {
      fetchConfigs();
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

      {/* 1. 툴바 영역 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col space-y-4">
        <div>
          <h2 className="font-bold text-gray-800 text-lg flex items-center">
            <FiSettings className="mr-2" /> {t('config_title')} ({processedConfigs.length})
          </h2>
        </div>

        <div className="flex justify-between items-center w-full">
          <div className="flex space-x-2 items-center">
            <div className="relative">
              <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder={t('config_search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-64 bg-white"
              />
            </div>

            <div className="h-6 w-px bg-gray-300 mx-2"></div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <FiFilter className="text-gray-400" />
              </div>
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="pl-8 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer hover:bg-gray-50 appearance-none min-w-[150px]"
              >
                <option value="All">{t('config_filter_class')}: {t('all')}</option>
                {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                <FiChevronDown className="text-gray-400" />
              </div>
            </div>
          </div>

          <div className="flex space-x-2 items-center">
            <button onClick={fetchConfigs} className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-100 rounded-md transition-colors" title={t('refresh')}>
              <FiRefreshCw />
            </button>
            <button
              onClick={() => openModal(null)}
              className="flex items-center px-4 py-2 bg-white border border-teal-600 text-teal-600 rounded-md text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm">
              <FiPlus className="mr-1" /> {t('config_btn_add')}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 그리드 영역 */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th onClick={() => handleSort('Id')} className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase w-16 cursor-pointer hover:bg-gray-200">{t('config_th_no')} {getSortIcon('Id')}</th>
              <th onClick={() => handleSort('Class')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase w-48 cursor-pointer hover:bg-gray-200">{t('config_th_class')} {getSortIcon('Class')}</th>
              <th onClick={() => handleSort('Name')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-200">{t('config_th_name')} {getSortIcon('Name')}</th>
              <th onClick={() => handleSort('GUID')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-200">{t('config_th_guid')} {getSortIcon('GUID')}</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase w-32">{t('config_th_manage')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10">{t('loading')}</td></tr>
            ) : processedConfigs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500">{t('no_data')}</td></tr>
            ) : (
              processedConfigs.map((item) => (
                <tr key={item.Id} className="hover:bg-teal-50 transition-colors">
                  <td className="px-6 py-3 text-xs text-center text-gray-500">{item.Id}</td>
                  <td className="px-6 py-3 text-sm text-gray-700 font-medium">
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200">{item.Class}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900 font-bold">{item.Name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 font-mono">{item.GUID}</td>
                  <td className="px-6 py-3 flex justify-center space-x-2">
                    <button onClick={() => openModal(item)} className="p-1.5 text-teal-600 hover:bg-teal-100 rounded" title={t('edit')}><FiEdit2 /></button>
                    <button onClick={() => handleDelete(item.Id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title={t('delete')}><FiTrash2 /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. 모달 (추가/수정) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-6 border-t-4 border-teal-600 animate-fade-in-up">
            <h3 className="text-lg font-bold mb-4 flex justify-between items-center">
              <span className="flex items-center"><FiSettings className="mr-2" /> {editingItem ? t('config_modal_edit') : t('config_modal_add')}</span>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><FiX /></button>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{t('config_label_class')}</label>
                <input
                  type="text"
                  list="classOptions"
                  placeholder={t('config_placeholder_class')}
                  value={formData.Class}
                  onChange={e => setFormData({ ...formData, Class: e.target.value })}
                  className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
                <datalist id="classOptions">
                  {uniqueClasses.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">{t('config_label_name')}</label>
                <input
                  type="text"
                  placeholder={t('config_placeholder_name')}
                  value={formData.Name}
                  onChange={e => setFormData({ ...formData, Name: e.target.value })}
                  className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center">
                  <FiHash className="mr-1" /> GUID
                </label>
                <input
                  type="text"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={formData.GUID}
                  onChange={e => setFormData({ ...formData, GUID: e.target.value })}
                  className="w-full border p-2 rounded text-sm font-mono bg-gray-50 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-bold hover:bg-gray-300">{t('cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 bg-teal-600 text-white rounded text-sm font-bold hover:bg-teal-700 flex items-center">
                <FiSave className="mr-1" /> {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ConfigPage;
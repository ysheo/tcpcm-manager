import React, { useEffect, useState, useMemo } from 'react';
import {
    FiFolder, FiBriefcase, FiBox, FiTool, FiArrowLeft, FiHome, FiSearch, FiRefreshCw,
    FiSettings, FiX, FiCheck, FiChevronRight
} from 'react-icons/fi';
import * as Service from '../services/CostService';
import { api } from '../services/ApiService';
import { useLanguage } from '../contexts/LanguageContext'; // ★ Hook Import

const CostPageV2 = () => {
    const { t } = useLanguage(); // ★ 훅 사용
    const [currentItems, setCurrentItems] = useState<Service.TreeNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [pathStack, setPathStack] = useState<Service.TreeNode[]>([]);

    const [searchTerm, setSearchTerm] = useState('');

    const loadNodes = async (query: string) => {
        setLoading(true);
        const result = await Service.executeQuery(query);

        if (result.success) {
            const nodes: Service.TreeNode[] = [];
            result.data.forEach((row: any) => {
                const parsed = Service.parseNodeData(row.name, 0);
                if (parsed) nodes.push(parsed);
            });
            setCurrentItems(Service.sortNodes(nodes));
        }
        setLoading(false);
    };

    const fetchRoots = () => {
        loadNodes(Service.getRootQuery());
    };

    const enterFolder = (node: Service.TreeNode) => {
        const query = Service.getChildrenQuery(node);
        if (!query) return;

        setPathStack([...pathStack, node]);
        loadNodes(query);
        setSearchTerm('');
    };

    const handleBreadcrumbClick = (index: number) => {
        const targetNode = pathStack[index];
        const newPath = pathStack.slice(0, index + 1);
        setPathStack(newPath);

        const query = Service.getChildrenQuery(targetNode);
        if (query) loadNodes(query);

        setSearchTerm('');
    };

    const handleRefresh = () => {
        if (pathStack.length > 0) {
            const currentNode = pathStack[pathStack.length - 1];
            const query = Service.getChildrenQuery(currentNode);
            if (query) loadNodes(query);
        } else {
            fetchRoots();
        }
    };

    const navigateUp = () => {
        if (pathStack.length === 0) return;
        const newPath = [...pathStack];
        newPath.pop();
        setPathStack(newPath);

        const parentNode = newPath[newPath.length - 1];
        if (parentNode) {
            const query = Service.getChildrenQuery(parentNode);
            if (query) loadNodes(query);
        } else {
            fetchRoots();
        }
        setSearchTerm('');
    };

    const handleCardClick = (node: Service.TreeNode) => {
        if (node.type === 'folder' || node.type === 'project' || node.type === 'part') {
            enterFolder(node);
        }
    };

    const filteredItems = useMemo(() => {
        if (!searchTerm) return currentItems;
        return currentItems.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentItems, searchTerm]);

    useEffect(() => {
        fetchRoots();
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-50 relative">

            {/* --- Header & Breadcrumb --- */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center space-x-2 text-lg text-gray-700">
                    <button
                        onClick={navigateUp}
                        disabled={pathStack.length === 0}
                        className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${pathStack.length === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'}`}
                    >
                        <FiArrowLeft />
                    </button>

                    <div className="flex items-center space-x-1 text-sm">
                        <button
                            onClick={() => { setPathStack([]); fetchRoots(); setSearchTerm(''); }}
                            className="flex items-center hover:text-teal-600 px-2 py-1 rounded hover:bg-teal-50 transition-colors cursor-pointer"
                        >
                            <FiHome className="mr-1" /> {t('home')}
                        </button>
                        {pathStack.map((crumb, index) => (
                            <React.Fragment key={crumb.uniqueId}>
                                <span className="text-gray-400">/</span>
                                <button
                                    onClick={() => handleBreadcrumbClick(index)}
                                    className="font-medium px-2 py-1 text-gray-800 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
                                >
                                    {crumb.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* --- 우측 툴바 --- */}
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('cost_search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-teal-500 rounded-lg text-sm w-48 transition-all"
                        />
                    </div>

                    <button
                        onClick={handleRefresh}
                        className="p-2 text-gray-500 hover:text-teal-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={t('refresh')}
                    >
                        <FiRefreshCw />
                    </button>
                </div>
            </div>

            {/* --- Main Content (Grid View) --- */}
            <div className="flex-1 overflow-y-auto p-8">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <FiBox size={48} className="mb-4 opacity-50" />
                        <p>
                            {searchTerm ? t('cost_msg_no_results', { term: searchTerm }) : t('cost_msg_empty')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredItems.map((node) => (
                            <div
                                key={node.uniqueId}
                                onClick={() => handleCardClick(node)}
                                className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-teal-300 cursor-pointer transition-all duration-200 flex flex-col items-center text-center relative"
                            >
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${getBgColor(node.type)}`}>
                                    {getIcon(node.type)}
                                </div>
                                {/* ★ 여기를 수정했습니다 ★ */}
                                <h3
                                    className="font-bold text-gray-800 group-hover:text-teal-700 transition-colors line-clamp-2 mb-1 w-full break-all"
                                    title={node.name} // 마우스 올리면 전체 이름 보임
                                >
                                    {node.name}
                                </h3>
                                <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">
                                    {node.type}
                                </span>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <FiChevronRight className="text-gray-300" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Helper Functions ---
const getIcon = (type: Service.NodeType) => {
    switch (type) {
        case 'folder': return <FiFolder size={32} className="text-yellow-500" />;
        case 'project': return <FiBriefcase size={32} className="text-blue-500" />;
        case 'part': return <FiBox size={32} className="text-green-500" />;
        case 'tool': return <FiTool size={32} className="text-gray-500" />;
    }
};

const getBgColor = (type: Service.NodeType) => {
    switch (type) {
        case 'folder': return 'bg-yellow-50';
        case 'project': return 'bg-blue-50';
        case 'part': return 'bg-green-50';
        case 'tool': return 'bg-gray-100';
    }
};

export default CostPageV2;
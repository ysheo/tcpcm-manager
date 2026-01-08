import React, { useEffect, useState } from 'react';
import * as Service from '../services/CostService';
import { useLanguage } from '../contexts/LanguageContext'; // ★ Hook

import { 
  FiFolder, FiFileText, FiChevronRight, FiChevronDown, 
  FiPieChart, FiBarChart2, FiGrid, FiLayers, FiBriefcase, FiBox, FiTool,
  FiRefreshCw 
} from 'react-icons/fi';

type NodeType = 'folder' | 'project' | 'part' | 'tool';

interface TreeNode {
  uniqueId: string;
  dbId: string;
  type: NodeType;
  name: string;
  level: number;
  children: TreeNode[];
  isExpanded: boolean;
  isLoaded: boolean; 
}

const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
  const typePriority: Record<string, number> = {
    folder: 1,
    project: 2,
    part: 3,
    tool: 4
  };

  return nodes.sort((a, b) => {
    const priorityA = typePriority[a.type] || 99;
    const priorityB = typePriority[b.type] || 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.name.localeCompare(b.name);
  });
};

const CostPage = () => {
  const { t } = useLanguage(); // ★ 훅 사용
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const parseNodeData = (rawItem: string, level: number): TreeNode | null => {
    try {
      const info = rawItem.split('&~&');
      if (info.length < 3) return null;

      const typeCode = info[0] ? info[0].trim().toLowerCase() : ""; 
      const dbId = info[1];      
      const nameString = info[2]; 

      const names = nameString.split('|');
      let displayName = '';
      const enIndex = names.findIndex(m => m.includes("en-US"));
      if (enIndex > -1) {
        displayName = names[enIndex].split(':')[1] || names[enIndex];
      } else {
        const koIndex = names.findIndex(m => m.includes("ko-KR"));
        if (koIndex > -1) {
          displayName = names[koIndex].split(':')[1] || names[koIndex];
        } else {
          const first = names[0].split(':');
          displayName = first.length >= 2 ? first[1] : names[0];
        }
      }

      let type: NodeType = 'part';
      let prefix = 'part';

      if (typeCode === 'f') { type = 'folder'; prefix = 'f'; }
      else if (typeCode === 'p') { type = 'project'; prefix = 'p'; }
      else { type = 'part'; prefix = 'part'; }

      const uniqueId = `${prefix}_${dbId}`;

      return {
        uniqueId: uniqueId,
        dbId: dbId,
        type: type,
        name: displayName,
        level: level,
        children: [],
        isExpanded: false,
        isLoaded: false
      };
    } catch (e) {
      console.error("Parse Error:", e);
      return null;
    }
  };

  const fetchRoots = async () => {
    setLoading(true);
    const query = `
      select CONCAT('f&~&',Id, '&~&',STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name
      from Folders
      OUTER APPLY Folders.Name_LOC.nodes('/translations/value') as m(c)
      where m.c.value('.', 'nvarchar(max)') like '%Private folder%' or m.c.value('.', 'nvarchar(max)') like '%Public folder%'
      GROUP BY Id
    `;

    const result = await Service.executeQuery(query);
    if (result.success) {
      const nodes: TreeNode[] = [];
      result.data.forEach((row: any) => {
        const parsed = parseNodeData(row.name, 0);
        if (parsed) nodes.push(parsed);
      });
      setTreeData(sortNodes(nodes));
    }
    setLoading(false);
  };

  const fetchChildren = async (node: TreeNode) => {
    if (node.isLoaded) {
        setTreeData(prev => expandNodeOnly(prev, node.uniqueId));
        return;
    }

    let query = "";
    const id = node.dbId;

    if (node.type === 'folder') {
        query = `
            select CONCAT('f&~&',Id, '&~&',STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name
            from Folders
            OUTER APPLY Folders.Name_LOC.nodes('/translations/value') as m(c)
            where ParentId = ${id} 
            GROUP BY Id
            Union
            select CONCAT('p&~&',a.Id, '&~&', a.projectName) as name from
            (
                select
                    s.Id, s.FolderID,
                    STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|') as projectName
                from Projects as s
                    outer apply s.Name_LOC.nodes('/translations/value') as m(c)
                where s.FolderID in (${id})
                group by s.Id, s.FolderID
            ) as a
            UNION 
            select CONCAT('&~&',a.Id, '&~&', STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name   
            from Calculations as a
            right join 
            (
                select * from Parts where Id in (select PartID from FolderEntries where FolderId = ${id})
            )as b  on a.Partid = b.Id 
             outer apply b.Name_LOC.nodes('/translations/value') as m(c)
            GROUP BY a.Id;
        `;
    } else if (node.type === 'project') {
        query = `
            select CONCAT('&~&',a.Id, '&~&',STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name   
            from Calculations as a
            right join 
            (
                select * from Parts where Id in (select PartID from ProjectPartEntries where ProjectID = ${id})
            )as b on a.Partid = b.Id
            outer apply b.Name_LOC.nodes('/translations/value') as m(c)
            where master = 1
            GROUP BY a.Id;
        `;
    } else if (node.type === 'part') {
        query = `
            select CONCAT('&~&',b.Id, '&~&',STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name   
            from Parts as a
            right join 
            (
             select * from Calculations where id in (select CurrentCalcId from CalcBomChildren(${id}) where ParentCalcId = ${id})
            ) as b  on a.Id = b.PartId
            outer apply a.Name_LOC.nodes('/translations/value') as m(c)
            GROUP BY b.Id;
        `;
    }

    if (!query) return;

    const result = await Service.executeQuery(query);
    
    if (result.success) {
      if (result.data.length === 0) {
          setTreeData(prev => markAsLoaded(prev, node.uniqueId));
      } else {
          const childNodes: TreeNode[] = [];
          result.data.forEach((row: any) => {
            const parsed = parseNodeData(row.name, node.level + 1);
            if (parsed) childNodes.push(parsed);
          });
          
          const sortedChildren = sortNodes(childNodes);
          setTreeData(prev => updateTreeData(prev, node.uniqueId, sortedChildren));
      }
    }
  };

  const updateTreeData = (nodes: TreeNode[], targetId: string, newChildren: TreeNode[]): TreeNode[] => {
    return nodes.map(node => {
      if (node.uniqueId === targetId) {
        return { ...node, children: newChildren, isExpanded: true, isLoaded: true };
      }
      if (node.children.length > 0) {
        return { ...node, children: updateTreeData(node.children, targetId, newChildren) };
      }
      return node;
    });
  };

  const expandNodeOnly = (nodes: TreeNode[], targetId: string): TreeNode[] => {
    return nodes.map(node => {
      if (node.uniqueId === targetId) return { ...node, isExpanded: true };
      if (node.children.length > 0) return { ...node, children: expandNodeOnly(node.children, targetId) };
      return node;
    });
  };

  const collapseNode = (nodes: TreeNode[], targetId: string): TreeNode[] => {
    return nodes.map(node => {
      if (node.uniqueId === targetId) {
          return { 
              ...node, 
              isExpanded: false, 
              isLoaded: false, 
              children: []      
          };
      }
      if (node.children.length > 0) {
          return { ...node, children: collapseNode(node.children, targetId) };
      }
      return node;
    });
  };

  const markAsLoaded = (nodes: TreeNode[], targetId: string): TreeNode[] => {
    return nodes.map(node => {
      if (node.uniqueId === targetId) return { ...node, isLoaded: true, isExpanded: true };
      if (node.children.length > 0) return { ...node, children: markAsLoaded(node.children, targetId) };
      return node;
    });
  };

  const handleToggle = (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.isExpanded) {
        setTreeData(prev => collapseNode(prev, node.uniqueId));
    } else {
        fetchChildren(node);
    }
  };

  useEffect(() => {
    fetchRoots();
  }, []);

  return (
    <div className="flex h-full bg-gray-100">
      
      {/* 탐색기 */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm flex-shrink-0">
        
        <div className="h-12 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-4 font-bold text-gray-700 text-sm">
          <div className="flex items-center">
            <FiLayers className="mr-2 text-teal-600" /> {t('cost_explorer_title')}
          </div>
          <button 
            onClick={fetchRoots}
            title={t('refresh')}
            className={`p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-all ${loading ? 'animate-spin text-teal-600' : ''}`}
          >
            <FiRefreshCw size={14}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading && treeData.length === 0 ? (
            <div className="text-center py-4 text-xs text-gray-400">{t('loading')}</div>
          ) : (
            <div className="space-y-0.5">
              {treeData.map(node => (
                <TreeNodeItem 
                  key={node.uniqueId} 
                  node={node} 
                  selectedId={selectedNode?.uniqueId}
                  onSelect={setSelectedNode}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 우측 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-6 justify-between">
          <h2 className="font-bold text-lg text-gray-800 flex items-center">
            {selectedNode ? (
              <>
                {getNodeIcon(selectedNode.type)} 
                <span className="ml-2">{selectedNode.name}</span>
                <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">{selectedNode.type}</span>
              </>
            ) : (
              <span className="text-gray-400 flex items-center"><FiPieChart className="mr-2"/> {t('cost_analytics_title')}</span>
            )}
          </h2>
          <div className="flex space-x-2">
            <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><FiGrid /></button>
            <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"><FiBarChart2 /></button>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-auto bg-gray-50">
          {selectedNode ? (
            <div className="bg-white rounded-lg shadow p-10 h-full border border-gray-200 flex flex-col items-center justify-center text-gray-400">
               <FiBarChart2 size={64} className="mb-4 text-teal-100" />
               <p className="text-xl font-bold text-gray-600">{t('cost_msg_analyzing')}</p>
               <p className="mt-2 text-sm">{t('cost_msg_selected_id')}: {selectedNode.dbId} (Type: {selectedNode.type})</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FiFolder size={64} className="mb-4 text-gray-200" />
              <p>{t('cost_msg_select_item')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TreeNodeItem = ({ node, selectedId, onSelect, onToggle }: { 
    node: TreeNode, 
    selectedId: string | undefined, 
    onSelect: (n: TreeNode) => void,
    onToggle: (n: TreeNode, e: React.MouseEvent) => void 
}) => {
  return (
    <div>
      <div 
        onClick={() => onSelect(node)}
        className={`
          flex items-center px-2 py-1 cursor-pointer rounded text-sm select-none transition-colors
          ${selectedId === node.uniqueId ? 'bg-teal-100 text-teal-900 font-bold' : 'text-gray-700 hover:bg-gray-100'}
        `}
        style={{ paddingLeft: `${node.level * 16 + 4}px` }}
      >
        <span 
            onClick={(e) => onToggle(node, e)}
            className={`mr-1 p-0.5 rounded cursor-pointer flex items-center justify-center w-5 h-5
                text-gray-400 hover:text-gray-600
            `}
        >
          {node.isExpanded ? <FiChevronDown size={14}/> : <FiChevronRight size={14}/>}
        </span>
        
        <span className={`mr-2 ${selectedId === node.uniqueId ? 'text-teal-700' : getNodeColor(node.type)}`}>
          {getNodeIcon(node.type, node.isExpanded)}
        </span>
        <span className="truncate">{node.name}</span>
      </div>

      {node.isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map(child => (
            <TreeNodeItem 
              key={child.uniqueId} 
              node={child} 
              selectedId={selectedId} 
              onSelect={onSelect} 
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const getNodeIcon = (type: NodeType, isExpanded: boolean = false) => {
  switch (type) {
    case 'folder': return <FiFolder fill={isExpanded ? "#fbbf24" : "#fbbf24"} className="text-yellow-400" />;
    case 'project': return <FiBriefcase />; 
    case 'part': return <FiBox />;
    case 'tool': return <FiTool />;
    default: return <FiFileText />;
  }
};

const getNodeColor = (type: NodeType) => {
    switch (type) {
        case 'folder': return 'text-yellow-500';
        case 'project': return 'text-blue-500';
        case 'part': return 'text-green-600';
        default: return 'text-gray-500';
    }
};

export default CostPage;
import { api } from './ApiService'; // ★ 공통 API 모듈 import
import { AppConfig } from '../config/AppConfig';
// --- 타입 정의 ---
export type NodeType = 'folder' | 'project' | 'part' | 'tool';

export interface TreeNode {
  uniqueId: string;
  dbId: string;
  type: NodeType;
  name: string;
  level: number;
  children: TreeNode[];
  isExpanded: boolean;
  isLoaded: boolean; 
}

// --- API 실행기 (이제 ApiService를 통합니다) ---
export const executeQuery = async (query: string) => {
  // ★ axios 직접 호출 대신 api.executeQuery 사용
  // Cost Analytics는 'TcPCM_Test' DB를 쓴다고 가정 (혹은 파라미터화 가능)
  return await api.executeQuery(query, AppConfig.DB.PCM);
};

// --- 정렬 함수 ---
export const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
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

// --- 파싱 로직 ---
export const parseNodeData = (rawItem: string, level: number): TreeNode | null => {
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

// --- 쿼리 생성기 ---
export const getRootQuery = () => {
  return `
    select CONCAT('f&~&',Id, '&~&',STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name
    from Folders
    OUTER APPLY Folders.Name_LOC.nodes('/translations/value') as m(c)
    where m.c.value('.', 'nvarchar(max)') like '%Private folder%' or m.c.value('.', 'nvarchar(max)') like '%Public folder%'
    GROUP BY Id
  `;
};

export const getChildrenQuery = (node: TreeNode) => {
  const id = node.dbId;
  if (node.type === 'folder') {
      return `
          select CONCAT('f&~&',Id, '&~&',STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name
          from Folders
          OUTER APPLY Folders.Name_LOC.nodes('/translations/value') as m(c)
          where ParentId = ${id} 
          GROUP BY Id
          Union
          select CONCAT('p&~&',a.Id, '&~&', a.projectName) as name from
          (
              select s.Id, s.FolderID, STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|') as projectName
              from Projects as s outer apply s.Name_LOC.nodes('/translations/value') as m(c)
              where s.FolderID in (${id}) group by s.Id, s.FolderID
          ) as a
          UNION 
          select CONCAT('&~&',a.Id, '&~&', STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name   
          from Calculations as a
          right join (select * from Parts where Id in (select PartID from FolderEntries where FolderId = ${id}))as b on a.Partid = b.Id 
          outer apply b.Name_LOC.nodes('/translations/value') as m(c)
          GROUP BY a.Id;
      `;
  } else if (node.type === 'project') {
      return `
          select CONCAT('&~&',a.Id, '&~&',STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name   
          from Calculations as a
          right join (select * from Parts where Id in (select PartID from ProjectPartEntries where ProjectID = ${id}))as b on a.Partid = b.Id
          outer apply b.Name_LOC.nodes('/translations/value') as m(c) where master = 1 GROUP BY a.Id;
      `;
  } else if (node.type === 'part') {
      return `
          select CONCAT('&~&',b.Id, '&~&',STRING_AGG(CONCAT(m.c.value('@lang', 'varchar(max)'), ':', m.c.value('.', 'nvarchar(max)')), '|')) as name   
          from Parts as a
          right join (select * from Calculations where id in (select CurrentCalcId from CalcBomChildren(${id}) where ParentCalcId = ${id})) as b on a.Id = b.PartId
          outer apply a.Name_LOC.nodes('/translations/value') as m(c) GROUP BY b.Id;
      `;
  }
  return "";
};
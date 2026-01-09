import { api } from './ApiService';
import { AppConfig } from '../config/AppConfig';
import { getNameSql } from '../utils/SqlHelper'; // ★ 방금 만든 파일 Import

export interface MaterialFilters {
    searchText: string;
    classKey: string;
    groupKey: string;     // 1번 필터
    materialType: string; // 2번 필터
    includeRef: boolean;
}

export const MaterialService = {

    // 1. 분류(Classification) 조회
    getClassOptions: async (lang: string) => {
        const query = `
            SELECT DISTINCT c.Id, c.UniqueKey,
                ${getNameSql('c.Name_LOC', lang)} AS Name

            FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s ON c.Id = s.ClassId
            WHERE c.UniqueKey NOT LIKE '%Scrap%' AND s.Obsolete IS NULL 
            ORDER BY c.UniqueKey
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    getMaterialType: async (lang: string) => {
        const query = `
            SELECT DISTINCT c.Id, c.UniqueKey,
                ${getNameSql('c.Name_LOC', lang)} AS Name

            FROM [${AppConfig.DB.PCM}].[dbo].[ClassificationPropertyListItem] as c
            where [ClassificationPropertyId] = 28
            ORDER BY c.UniqueKey
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    getMaterialGroupTree: async (lang: string) => {
        const query = `
            WITH TreeCTE AS (
                SELECT Id, ParentClassificationId, UniqueKey, Name_LOC
                FROM [${AppConfig.DB.PCM}].[dbo].[Classifications]
                WHERE Id = 17 -- 루트 시작
                UNION ALL
                SELECT c.Id, c.ParentClassificationId, c.UniqueKey, c.Name_LOC
                FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c
                JOIN TreeCTE p ON c.ParentClassificationId = p.Id
            )
            SELECT DISTINCT 
                 t.Id
                ,t.ParentClassificationId AS ParentId -- 부모 ID 필요
                ,t.UniqueKey
                ,${getNameSql('t.Name_LOC', lang)} AS Name
            FROM TreeCTE t
            WHERE t.Id <> 17
            ORDER BY t.UniqueKey
        `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    },


    makeQueryParts: (filters: MaterialFilters) => {
        let where = `WHERE s.Obsolete IS NULL`;
        let cte = ""; // 재귀 쿼리 부분
        // 1. 참조 데이터 포함 여부
        if (!filters.includeRef) where += ` AND s.ExternallyManaged = 0`;

        // 2. 분류 필터 (Classification)
        if (filters.classKey) where += ` AND cls.UniqueKey = N'${filters.classKey}'`;

        // 3. 그룹 필터 (Material Group)
        // ★ 그룹 필터 로직 변경
        if (filters.groupKey) {
            // (1) CTE 생성: 재귀 쿼리 문자열을 변수에 담습니다.
            cte = `
                TargetGroup AS (
                    SELECT Id FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] 
                    WHERE UniqueKey = N'${filters.groupKey}'
                    UNION ALL
                    SELECT c.Id FROM [${AppConfig.DB.PCM}].[dbo].[Classifications] c
                    JOIN TargetGroup p ON c.ParentClassificationId = p.Id
                )
            `;
            // (2) WHERE 절 연결: 만들어둔 CTE를 참조합니다.
            where += ` AND s.ClassId IN (SELECT Id FROM TargetGroup)`;
        }

        // 4. 검색어 (Search Text)
        if (filters.searchText) {
            where += ` AND (s.UniqueKey LIKE N'%${filters.searchText}%' OR std_n.Name_LOC LIKE N'%${filters.searchText}%')`;
        }

        // 5. 재료 타입 (Material Type - EXISTS 구문)
        if (filters.materialType) {
            where += `
                AND EXISTS (
                    SELECT 1 
                    FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstancePropertyValues] pv
                    WHERE pv.SubstanceId = s.Id 
                      AND pv.ClassificationPropertyId = 28 
                      AND pv.ListItemValues = N'${filters.materialType}'
                )
            `;
        }

        return { where, cte };
    },

    getList: async (page: number, itemsPerPage: number, filters: MaterialFilters) => {
        const { where, cte } = MaterialService.makeQueryParts(filters);

        // 2. CTE 조립 (TargetGroup이 있으면 쉼표로 연결)
        // cte가 있으면: WITH TargetGroup AS (...), PagedRows AS (...)
        // cte가 없으면: WITH PagedRows AS (...)
        const withClause = cte
            ? `WITH ${cte}, PagedRows AS (`
            : `WITH PagedRows AS (`;

        // 3. 카운트 쿼리 (CTE가 있을 땐 WITH 구문이 필요함)
        const countCte = cte ? `WITH ${cte}` : ``;
        const countQuery = `
            ${countCte}
            SELECT COUNT(DISTINCT s.Id) as total
            FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON s.ClassId = cls.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstanceStandardNames] std_n ON s.Id = std_n.SubstanceId
            ${where}
        `;

        // 4. 목록 조회 쿼리
        const rowQuery = `
            ${withClause} -- ★ 여기서 동적으로 WITH 구문 시작
                SELECT s.Id
                FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s
                LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON s.ClassId = cls.Id
                ${where}
                ORDER BY s.UniqueKey ASC
                OFFSET ${(page - 1) * itemsPerPage} ROWS FETCH NEXT ${itemsPerPage} ROWS ONLY
            )
            SELECT DISTINCT s.Id AS SubstanceId, s.UniqueKey, s.Density, u.Name AS DensityUnit
            FROM PagedRows p
            JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s ON p.Id = s.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON s.ClassId = cls.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON s.DensityUnitId = u.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstanceStandardNames] std_n ON s.Id = std_n.SubstanceId
            ORDER BY s.UniqueKey ASC
        `;
        //console.log(rowQuery)
        // 병렬 실행
        const [cntRes, listRes] = await Promise.all([
            api.executeQuery(countQuery, AppConfig.DB.PCM),
            api.executeQuery(rowQuery, AppConfig.DB.PCM)
        ]);

        return {
            total: cntRes.success ? cntRes.data[0].total : 0,
            data: listRes.success ? listRes.data : []
        };
    },


    // 2. 엑셀용 데이터 전체 조회
    getExcelData: async (filters: MaterialFilters) => {
        // 1. CTE(재귀 쿼리 부분)와 WHERE 절을 분리해서 받아옵니다.
        const { where, cte } = MaterialService.makeQueryParts(filters);

        // 2. CTE가 존재하면(그룹 필터 사용 시) 쿼리 맨 앞에 WITH 구문을 붙입니다.
        const prefix = cte ? `WITH ${cte}` : '';

        const query = `
            ${prefix} -- ★ [핵심] WITH 구문(TargetGroup)은 무조건 맨 위에 있어야 합니다.
            SELECT DISTINCT s.Id AS SubstanceId, s.UniqueKey, s.Density, u.Name AS DensityUnit
            FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstances] s
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Classifications] cls ON s.ClassId = cls.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON s.DensityUnitId = u.Id
            LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[MDSubstanceStandardNames] std_n ON s.Id = std_n.SubstanceId
            
            ${where} -- ★ 여기서 위에서 정의한 CTE(TargetGroup)를 참조하여 필터링합니다.
            ORDER BY s.UniqueKey ASC
        `;

        return await api.executeQuery(query, AppConfig.DB.PCM);
    },

    // 3. 물성(Property) 값 조회
    getPropertyValues: async (ids: string, lang: string) => {
        const query = `                   

                    -- 2. 규격 이름 (Standard Names) -> 이것도 동적 컬럼으로 취급!
                    SELECT 
                        sn.SubstanceId
                        ,'STD_' + CAST(sn.SubstanceStandardId AS NVARCHAR(50)) AS PropertyId -- 키 충돌 방지용 접두사
                        ,${getNameSql('sn.Name_LOC', lang)} AS Value -- 규격 이름 (예: PESU GF20)
                        ,${getNameSql('bs.Name_LOC', lang)} AS PropertyName -- 규격 타입 (예: DIN, ISO)
                        ,'' AS UnitName
                    FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstanceStandardNames] sn
                    JOIN [${AppConfig.DB.PCM}].[dbo].[BDSubstanceStandards] bs ON sn.SubstanceStandardId = bs.Id
                    WHERE sn.SubstanceId IN (${ids})

                    UNION ALL

                    SELECT 
                         v.SubstanceId
                        ,CAST(v.ClassificationPropertyId AS NVARCHAR(50)) AS PropertyId
                        ,COALESCE(CAST(v.DecimalValue AS NVARCHAR(50)), v.TextValue, v.ListItemValues, FORMAT(v.DateTimeValue, 'yyyy-MM-dd')) AS Value
                        -- 헤더 생성을 위한 정보 추가
                        , ${getNameSql('cp.Name_LOC', lang)} AS PropertyName
                        ,u.Name AS UnitName
                    FROM [${AppConfig.DB.PCM}].[dbo].[MDSubstancePropertyValues] v
                    JOIN [${AppConfig.DB.PCM}].[dbo].[ClassificationProperties] cp ON v.ClassificationPropertyId = cp.Id
                    LEFT JOIN [${AppConfig.DB.PCM}].[dbo].[Units] u ON cp.UnitId = u.Id
                    WHERE v.SubstanceId IN (${ids})

                `;
        return await api.executeQuery(query, AppConfig.DB.PCM);
    }
};
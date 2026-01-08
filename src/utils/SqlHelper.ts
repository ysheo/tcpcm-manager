// src/utils/SqlHelper.ts

/**
 * 프론트엔드 언어 코드(ko, en)를 DB 로케일 포맷(ko-KR, en-US)으로 변환하는 매핑 테이블
 */
const LOCALE_MAP: Record<string, string> = {
    'ko': 'ko-KR',
    'en': 'en-US',
    'zh': 'zh-CN', // 중국어 (예시)
    'de': 'de-DE', // 독일어 (예시)
    'ja': 'ja-JP', // 일본어 (예시)
    // 필요 시 여기에 추가하면 전역 반영됨
};

/**
 * 언어 코드를 받아 DB용 로케일 문자열을 반환합니다.
 * 매핑되지 않은 언어는 기본값 'en-US'를 반환합니다.
 * @param lang 프론트엔드 언어 코드 (예: 'ko', 'en')
 */
export const getDbLocale = (lang: string): string => {
    return LOCALE_MAP[lang] || 'en-US';
};

/**
 * 다국어 컬럼에 대해 [설정언어 -> 영어 -> 한국어] 순서의 Fallback 로직이 적용된 SQL 구문을 생성합니다.
 * * @param colName DB 컬럼명 (예: 's.Name_LOC')
 * @param lang 프론트엔드 언어 코드 (예: 'ko')
 * @returns 완성된 SQL COALESCE 구문 문자열
 */
export const getNameSql = (colName: string, lang: string): string => {
    const dbLang = getDbLocale(lang);

    // 줄바꿈이나 공백은 쿼리 가독성을 위해 포함 (실제 실행엔 영향 없음)
    return `
        COALESCE(
            NULLIF([dbo].[GetSingleTranslation](${colName}, N'${dbLang}', ''), ''),
            NULLIF([dbo].[GetSingleTranslation](${colName}, N'en-US', ''), ''),
            [dbo].[GetSingleTranslation](${colName}, N'ko-KR', '')
        )
    `;
};
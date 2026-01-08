import os

# 생성할 파일들의 경로와 내용 정의
files = {
    # ---------------------------------------------------------
    # 1. 한국어 파일들 (src/locales/ko/...)
    # ---------------------------------------------------------
    "src/locales/ko/common.ts": """export default {
  confirm: "확인",
  cancel: "취소",
  save: "저장",
  delete: "삭제",
  add: "추가",
  edit: "수정",
  close: "닫기",
  search: "검색",
  loading: "로딩 중...",
  refresh: "새로고침",
  logout: "로그아웃",
  no_data: "데이터가 없습니다.",
  all: "전체",
  home: "Home",
  lang_select: "언어 선택",
};""",

    "src/locales/ko/sidebar.ts": """export default {
  menu_home: "홈",
  menu_cost: "원가 분석",
  menu_explorer: "탐색기 (Legacy)",
  menu_dashboard: "대시보드 (Web)",
  menu_master: "기준 정보",
  menu_plant: "공장/지역 (Plant)",
  menu_material: "재료 관리 (Material)",
  menu_machine: "기계 관리 (Machine)",
  menu_labor: "임율 관리 (Labor)",
  menu_overhead: "간접비 (Overhead)",
  menu_factor: "Cost Factor",
  menu_exchange: "환율 관리",
  menu_system: "시스템 설정",
  menu_user: "사용자 관리",
  menu_config: "Configuration",
};""",

    "src/locales/ko/user.ts": """export default {
  user_title: "사용자 관리",
  user_search_placeholder: "이름/ID 검색",
  user_filter_dept: "부서",
  user_filter_role: "권한",
  user_filter_status: "상태",
  user_status_active: "Active",
  user_status_inactive: "Inactive",
  user_btn_api: "API 계정 설정",
  user_btn_export_user: "계정 목록 내보내기",
  user_btn_export_log: "로그인 이력 내보내기",
  user_th_no: "No",
  user_th_id: "ID",
  user_th_name: "이름",
  user_th_dept: "부서",
  user_th_role: "권한",
  user_th_status: "상태",
  user_th_manage: "관리",
  user_modal_add_title: "새 사용자 등록",
  user_modal_edit_title: "사용자 정보 수정",
  user_modal_desc: "시스템에 접속할 수 있는 사용자를 관리합니다.",
  user_modal_desc_sub: "* 아이디, 비밀번호, 이름은 필수 항목입니다.",
  
  label_id: "아이디",
  label_pwd: "비밀번호",
  label_pwd_change: "(변경 시 입력)",
  label_name: "이름",
  label_dept: "부서",
  label_role: "권한",
  label_active_account: "계정 활성화",
  placeholder_id: "아이디 입력",
  placeholder_pwd: "비밀번호 입력",
  placeholder_name: "이름 입력",
  placeholder_dept: "부서명 입력",

  conn_modal_title: "TcPCM API 연결 설정",
  conn_modal_desc: "TcPCM 서버 API와 통신할 때 사용할 대표 계정(Service Account)을 설정합니다.",
  conn_modal_warn: "* 잘못된 정보 입력 시 API 호출이 실패할 수 있습니다.",
  label_auth_key: "계정명 (AuthKey)",
  label_auth_secret: "비밀번호 (AuthSecret)",

  export_modal_title: "로그인 이력 엑셀 내보내기",
  export_modal_desc: "웹 접속 이력 또는 TcPCM 사용 이력을 조건별로 조회하여 엑셀 파일(.xlsx)로 내려받습니다.",
  label_export_target: "내보내기 대상",
  target_web: "웹 접속 이력",
  target_tcpcm: "TcPCM 이력",
  label_period: "조회 기간",
  label_all_period: "전체 기간 조회",
  label_user_name: "사용자 이름",
  label_role_filter: "권한 필터",
  btn_export: "내보내기",

  history_modal_title: "접속 이력 조회",
  history_modal_desc: "{name} 님의 시스템 접속 기록입니다.",
  history_th_time: "접속 시간",
  history_th_ip: "IP 주소",
  history_th_type: "유형",
  history_th_result: "결과",
  history_success: "성공",
  history_fail: "실패",
  
  msg_no_history: "접속 이력이 없습니다.",
  msg_confirm_delete: "선택한 사용자를 정말 삭제하시겠습니까?\\n이 작업은 되돌릴 수 없습니다.",
  msg_deleted: "삭제되었습니다.",
  msg_saved: "저장되었습니다.",
  msg_req_id_name: "아이디와 이름은 필수입니다.",
  msg_req_input: "입력값 확인 필요",
  msg_no_data_cond: "조건에 맞는 데이터가 없습니다.",
};""",

    "src/locales/ko/plant.ts": """export default {
  plant_title: "공장/지역 관리",
  plant_tab_region: "지역 (Region)",
  plant_tab_plant: "공장 (Plant)",
  plant_upload: "엑셀 업로드",
  plant_download: "엑셀 다운로드",
  plant_save_db: "DB에 저장하기",
  plant_header_no: "No.",
  plant_header_region: "지역 코드",
  plant_header_key: "키 (Key)",
  plant_header_ko: "국문명",
  plant_header_en: "영문명",
  plant_msg_uploading: "현재 {tab} 데이터를 업로드 중입니다.",
  plant_sheet_select: "시트 선택:",
  plant_msg_valid_region: "존재하지 않는 지역 코드가 포함되어 있습니다",
  plant_filter_all: "모든 지역 보기",
};""",

    "src/locales/ko/config.ts": """export default {
  config_title: "Configuration 관리",
  config_search_placeholder: "Name / GUID 검색",
  config_filter_class: "Class",
  config_btn_add: "항목 추가",
  config_th_no: "No",
  config_th_class: "Class",
  config_th_name: "Name",
  config_th_guid: "GUID",
  config_th_manage: "관리",
  config_modal_add: "새 설정 추가",
  config_modal_edit: "설정 수정",
  config_label_class: "Class (분류)",
  config_label_name: "Name (항목명)",
  config_placeholder_class: "예: CBD, Material",
  config_placeholder_name: "예: Import_Header",
  config_msg_delete_confirm: "정말 삭제하시겠습니까?",
  config_msg_save_success: "저장되었습니다.",
  config_msg_save_fail: "저장 실패",
  config_msg_valid_req: "모든 필드를 입력해주세요.",
};""",

    "src/locales/ko/cost.ts": """export default {
  cost_explorer_title: "PCM Explorer",
  cost_analytics_title: "Cost Analytics",
  cost_search_placeholder: "항목 필터링...",
  cost_msg_select_item: "좌측 탐색기에서 항목을 선택해주세요.",
  cost_msg_analyzing: "데이터 분석 준비 중",
  cost_msg_selected_id: "선택된 항목 ID",
  cost_msg_no_results: "'{term}'에 대한 검색 결과가 없습니다.",
  cost_msg_empty: "표시할 항목이 없습니다.",
};""",

    "src/locales/ko/master.ts": """export default {
  master_title: "Master Data Management",
  master_desc: "자재, 설비, 환율 등 기준 정보를 관리하는 화면입니다.",
  master_sub_desc: "(여기에 그리드나 폼이 들어갈 예정입니다)",
};""",

    "src/locales/ko/dashboard.ts": """export default {
  dash_welcome: "반갑습니다, {name}님! 👋",
  dash_subtitle: "오늘도 TcPCM 시스템과 함께 효율적인 원가 관리를 시작해보세요.",
  dash_card_projects: "프로젝트",
  dash_card_status: "시스템 상태",
  dash_status_ok: "정상 가동 중",
  dash_card_last_login: "마지막 접속",
};""",

    "src/locales/ko/empty.ts": """export default {
  empty_title: "'{title}' 화면은 개발 중입니다.",
};""",

    # ---------------------------------------------------------
    # 2. 영어 파일들 (src/locales/en/...)
    # ---------------------------------------------------------
    "src/locales/en/common.ts": """export default {
  confirm: "Confirm",
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  add: "Add",
  edit: "Edit",
  close: "Close",
  search: "Search",
  loading: "Loading...",
  refresh: "Refresh",
  logout: "Logout",
  no_data: "No data available.",
  all: "All",
  home: "Home",
  lang_select: "Language",
};""",

    "src/locales/en/sidebar.ts": """export default {
  menu_home: "Home",
  menu_cost: "Cost Analytics",
  menu_explorer: "Explorer (Legacy)",
  menu_dashboard: "Dashboard (Web)",
  menu_master: "Master Data",
  menu_plant: "Plant/Region",
  menu_material: "Material Mgmt",
  menu_machine: "Machine Mgmt",
  menu_labor: "Labor Rates",
  menu_overhead: "Overheads",
  menu_factor: "Cost Factor",
  menu_exchange: "Exchange Rates",
  menu_system: "System Settings",
  menu_user: "User Management",
  menu_config: "Configuration",
};""",

    "src/locales/en/user.ts": """export default {
  user_title: "User Management",
  user_search_placeholder: "Search Name/ID",
  user_filter_dept: "Dept",
  user_filter_role: "Role",
  user_filter_status: "Status",
  user_status_active: "Active",
  user_status_inactive: "Inactive",
  user_btn_api: "API Settings",
  user_btn_export_user: "Export Users",
  user_btn_export_log: "Export Logs",
  user_th_no: "No",
  user_th_id: "ID",
  user_th_name: "Name",
  user_th_dept: "Dept",
  user_th_role: "Role",
  user_th_status: "Status",
  user_th_manage: "Manage",
  user_modal_add_title: "Add New User",
  user_modal_edit_title: "Edit User Info",
  user_modal_desc: "Manage users who can access the system.",
  user_modal_desc_sub: "* ID, Password, and Name are required.",
  
  label_id: "ID",
  label_pwd: "Password",
  label_pwd_change: "(Enter to change)",
  label_name: "Name",
  label_dept: "Department",
  label_role: "Role",
  label_active_account: "Active Account",
  placeholder_id: "Enter ID",
  placeholder_pwd: "Enter Password",
  placeholder_name: "Enter Name",
  placeholder_dept: "Enter Dept",

  conn_modal_title: "TcPCM API Settings",
  conn_modal_desc: "Configure the Service Account for TcPCM API communication.",
  conn_modal_warn: "* Incorrect info may cause API failures.",
  label_auth_key: "Account (AuthKey)",
  label_auth_secret: "Password (AuthSecret)",

  export_modal_title: "Export Login History",
  export_modal_desc: "Export Web Access or TcPCM Usage logs to Excel (.xlsx).",
  label_export_target: "Target",
  target_web: "Web Access Log",
  target_tcpcm: "TcPCM Log",
  label_period: "Period",
  label_all_period: "All Time",
  label_user_name: "User Name",
  label_role_filter: "Role Filter",
  btn_export: "Export",

  history_modal_title: "Access History",
  history_modal_desc: "Login records for {name}.",
  history_th_time: "Time",
  history_th_ip: "IP Address",
  history_th_type: "Type",
  history_th_result: "Result",
  history_success: "Success",
  history_fail: "Fail",
  
  msg_no_history: "No history found.",
  msg_confirm_delete: "Are you sure you want to delete this user?\\nThis cannot be undone.",
  msg_deleted: "Deleted successfully.",
  msg_saved: "Saved successfully.",
  msg_req_id_name: "ID and Name are required.",
  msg_req_input: "Please check your input.",
  msg_no_data_cond: "No data matches the condition.",
};""",

    "src/locales/en/plant.ts": """export default {
  plant_title: "Plant/Region Mgmt",
  plant_tab_region: "Region",
  plant_tab_plant: "Plant",
  plant_upload: "Upload Excel",
  plant_download: "Download Excel",
  plant_save_db: "Save to DB",
  plant_header_no: "No.",
  plant_header_region: "Region Code",
  plant_header_key: "Key",
  plant_header_ko: "Name (KR)",
  plant_header_en: "Name (EN)",
  plant_msg_uploading: "Uploading {tab} data.",
  plant_sheet_select: "Select Sheet:",
  plant_msg_valid_region: "Invalid region codes detected",
  plant_filter_all: "View All Regions",
};""",

    "src/locales/en/config.ts": """export default {
  config_title: "Configuration Mgmt",
  config_search_placeholder: "Search Name / GUID",
  config_filter_class: "Class",
  config_btn_add: "Add Item",
  config_th_no: "No",
  config_th_class: "Class",
  config_th_name: "Name",
  config_th_guid: "GUID",
  config_th_manage: "Manage",
  config_modal_add: "Add New Config",
  config_modal_edit: "Edit Config",
  config_label_class: "Class",
  config_label_name: "Name",
  config_placeholder_class: "Ex: CBD, Material",
  config_placeholder_name: "Ex: Import_Header",
  config_msg_delete_confirm: "Are you sure you want to delete this?",
  config_msg_save_success: "Saved successfully.",
  config_msg_save_fail: "Save Failed",
  config_msg_valid_req: "All fields are required.",
};""",

    "src/locales/en/cost.ts": """export default {
  cost_explorer_title: "PCM Explorer",
  cost_analytics_title: "Cost Analytics",
  cost_search_placeholder: "Filter items...",
  cost_msg_select_item: "Please select an item from the explorer.",
  cost_msg_analyzing: "Preparing Data Analysis",
  cost_msg_selected_id: "Selected ID",
  cost_msg_no_results: "No results found for '{term}'.",
  cost_msg_empty: "No items to display.",
};""",

    "src/locales/en/master.ts": """export default {
  master_title: "Master Data Management",
  master_desc: "Screen for managing master data such as materials, equipment, and exchange rates.",
  master_sub_desc: "(Grid or Form will be placed here)",
};""",

    "src/locales/en/dashboard.ts": """export default {
  dash_welcome: "Welcome back, {name}! 👋",
  dash_subtitle: "Start efficient cost management with the TcPCM system today.",
  dash_card_projects: "Projects",
  dash_card_status: "System Status",
  dash_status_ok: "Optimal",
  dash_card_last_login: "Last Login",
};""",

    "src/locales/en/empty.ts": """export default {
  empty_title: "'{title}' page is under development.",
};""",

    # ---------------------------------------------------------
    # 3. 통합 파일 (src/locales/index.ts)
    # ---------------------------------------------------------
    "src/locales/index.ts": """// [Korean Imports]
import commonKo from './ko/common';
import sidebarKo from './ko/sidebar';
import userKo from './ko/user';
import plantKo from './ko/plant';
import configKo from './ko/config';
import costKo from './ko/cost';
import masterKo from './ko/master';
import dashboardKo from './ko/dashboard';
import emptyKo from './ko/empty';

// [English Imports]
import commonEn from './en/common';
import sidebarEn from './en/sidebar';
import userEn from './en/user';
import plantEn from './en/plant';
import configEn from './en/config';
import costEn from './en/cost';
import masterEn from './en/master';
import dashboardEn from './en/dashboard';
import emptyEn from './en/empty';

// Combine
export const translations = {
  ko: {
    ...commonKo,
    ...sidebarKo,
    ...userKo,
    ...plantKo,
    ...configKo,
    ...costKo,
    ...masterKo,
    ...dashboardKo,
    ...emptyKo,
  },
  en: {
    ...commonEn,
    ...sidebarEn,
    ...userEn,
    ...plantEn,
    ...configEn,
    ...costEn,
    ...masterEn,
    ...dashboardEn,
    ...emptyEn,
  }
};
""",

    # ---------------------------------------------------------
    # 4. Context 파일 업데이트 (src/contexts/LanguageContext.tsx)
    # ---------------------------------------------------------
    "src/contexts/LanguageContext.tsx": """import React, { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import { translations } from '../locales';

type Language = 'ko' | 'en';

// 타입 안전성을 위해 ko 데이터의 키를 추출
type TranslationKey = keyof typeof translations.ko;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, placeholder?: {[key:string]: string}) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('ko');

  const t = (key: TranslationKey, placeholder?: {[key:string]: string}) => {
    // 1. 해당 언어에서 키 찾기
    let text = translations[language][key];

    // 2. 만약 번역이 없으면(누락 시), 한국어(기본) 텍스트 사용 (Fallback)
    if (!text) {
      text = translations['ko'][key] || key;
    }

    // 3. 플레이스홀더 치환 ({name} -> 사용자명 등)
    if (placeholder && typeof text === 'string') {
      Object.keys(placeholder).forEach(phKey => {
        text = text.replace(`{${phKey}}`, placeholder[phKey]);
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};
"""
}

def create_files():
    for path, content in files.items():
        # 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # 파일 쓰기 (utf-8 인코딩)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Created: {path}")

    print("\\n✅ 모든 언어 파일이 성공적으로 생성되었습니다!")
    print("이제 'npm start' 또는 'yarn start'로 앱을 실행해보세요.")

if __name__ == "__main__":
    create_files()
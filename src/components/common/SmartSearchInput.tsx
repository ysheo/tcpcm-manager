import React from 'react';
import { FiSearch, FiX, FiRefreshCw } from 'react-icons/fi';

interface SmartSearchInputProps {
    // --- 기본 검색 Props ---
    value: string;
    onChange: (val: string) => void;
    onRefresh?: () => void;
    placeholder?: string;
    label?: string;
    loading?: boolean;
    className?: string;

    // --- ★ 내장된 옵션(체크박스) 기능 ---
    showOption?: boolean;           // true면 체크박스 보임 (기본값: false)
    optionChecked?: boolean;        // 체크박스 값 (state)
    onOptionChange?: (checked: boolean) => void; // 변경 핸들러
    optionLabel?: string;           // 라벨 텍스트 (기본값 설정됨)

    // 혹시 모를 추가 커스텀을 위해 남겨둠 (보통 안 씀)
    extraContent?: React.ReactNode;
}

const SmartSearchInput: React.FC<SmartSearchInputProps> = ({
    value,
    onChange,
    onRefresh,
    placeholder = "Search...",
    label = "Smart Search",
    loading = false,
    className = "",

    // 옵션 Props 기본값
    showOption = false,
    optionChecked = false,
    onOptionChange,
    optionLabel = "Include Siemens Reference", // 기본 라벨

    extraContent
}) => {
    return (
        <div className={`flex flex-col gap-1 ${className}`}>
            {/* 1. 라벨 및 옵션 영역 */}
            <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {label}
                </span>

                <div className="flex items-center gap-2">
                    {/* ★ 내장된 체크박스 옵션 */}
                    {showOption && (
                        <label className="text-[10px] font-bold text-teal-600 cursor-pointer flex items-center gap-1 hover:text-teal-700 select-none">
                            <input
                                type="checkbox"
                                checked={optionChecked}
                                onChange={(e) => onOptionChange?.(e.target.checked)}
                                className="rounded-sm accent-teal-600 cursor-pointer"
                            />
                            {optionLabel}
                        </label>
                    )}

                    {/* 추가 커스텀 슬롯 (필요한 경우에만 사용) */}
                    {extraContent}
                </div>
            </div>

            {/* 2. 검색 인풋 영역 (스타일 고정) */}
            <div className="relative flex items-center">
                <FiSearch className="absolute left-3.5 text-gray-400" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    // ★ Material 페이지 표준 디자인
                    className="w-full pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-teal-500 transition-colors"
                />

                {/* 검색어 삭제 버튼 */}
                {value && (
                    <button
                        onClick={() => onChange('')}
                        className="absolute right-10 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <FiX />
                    </button>
                )}

                {/* 새로고침 버튼 */}
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="absolute right-2 p-2 text-gray-400 hover:text-teal-600 transition-colors"
                    >
                        <FiRefreshCw className={loading ? 'animate-spin' : ''} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default SmartSearchInput;
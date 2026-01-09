import React, { useState, useEffect, useRef } from 'react';
import {
    FiSearch, FiChevronDown, FiX // ★ FiX 아이콘 추가
} from 'react-icons/fi';

// [인터페이스]
interface FilterOption {
    id?: string;
    uniqueKey: string;
    name: string;
}

const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder,
    getLabel
}: {
    options: FilterOption[],
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    getLabel: (opt: FilterOption) => string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // 1. 외부 값 변경 감지
    useEffect(() => {
        const selected = options.find(o => o.uniqueKey === value);
        if (selected) {
            setSearchTerm(getLabel(selected));
        } else {
            setSearchTerm('');
        }
    }, [value, options, getLabel]);

    // 2. 바깥 클릭 감지
    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                // 닫힐 때, 유효한 값이 선택 안 되어 있으면 입력창을 현재 선택된 값의 이름으로 복구
                const selected = options.find(o => o.uniqueKey === value);
                setSearchTerm(selected ? getLabel(selected) : '');
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, value, options, getLabel]);

    // 3. 검색 필터링
    const filteredOptions = options.filter(opt =>
        getLabel(opt).toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.uniqueKey.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // ★ 초기화 핸들러
    const handleClear = (e?: React.MouseEvent) => {
        e?.stopPropagation(); // 드롭다운 열림 방지
        onChange('');         // 부모에게 빈 값 전달
        setSearchTerm('');    // 검색어 초기화
        setIsOpen(false);     // 목록 닫기
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative flex items-center">
                <input
                    type="text"
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 focus:border-teal-500 rounded-xl text-sm font-semibold text-teal-800 outline-none transition-all placeholder-gray-400 cursor-pointer"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        if (e.target.value === '') onChange('');
                    }}
                    onClick={() => setIsOpen(true)} // 클릭 시 오픈
                    onFocus={() => {
                        setIsOpen(true);
                        // 포커스 시 검색 편의를 위해 텍스트 전체 선택 (선택 사항)
                        // e.target.select(); 
                    }}
                />

                {/* ★ 우측 아이콘 영역: 값이 있으면 X 버튼, 없으면 화살표/돋보기 */}
                <div className="absolute right-3 flex items-center text-gray-400">
                    {(value || searchTerm) ? (
                        <button
                            onClick={handleClear}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                            title="Clear selection"
                        >
                            <FiX />
                        </button>
                    ) : (
                        isOpen ? <FiSearch className="text-teal-500" /> : <FiChevronDown />
                    )}
                </div>
            </div>

            {/* 드롭다운 목록 */}
            {isOpen && (
                <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg animate-fadeIn thin-scrollbar">

                    {/* ★ [추가됨] 기본 선택 해제 옵션 (항상 맨 위에 표시) */}
                    <li
                        onClick={() => handleClear()}
                        className="px-4 py-3 text-sm cursor-pointer hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors border-b border-gray-50 flex items-center gap-2"
                    >
                        <FiX className="text-xs" />
                        <span>- 전체 (선택 해제) -</span>
                    </li>

                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <li
                                key={opt.uniqueKey}
                                onClick={() => {
                                    onChange(opt.uniqueKey);
                                    setSearchTerm(getLabel(opt));
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-teal-50 transition-colors flex flex-col
                                    ${opt.uniqueKey === value ? 'bg-teal-50 text-teal-700 font-bold' : 'text-gray-600'}
                                `}
                            >
                                <span>{getLabel(opt)}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{opt.uniqueKey}</span>
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-3 text-sm text-gray-400 text-center">검색 결과가 없습니다.</li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default SearchableSelect;
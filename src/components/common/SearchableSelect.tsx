import React, { useState, useEffect, useRef } from 'react';
import {
    FiSearch, FiChevronDown,
} from 'react-icons/fi';

// [인터페이스]
interface FilterOption {
    id?: string;
    uniqueKey: string;
    nameEn: string;
    nameKo: string;
}



// ★ [신규 컴포넌트] 검색 가능한 셀렉트 박스 (파일 하단에 두거나 내부에 정의)
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

    // 1. 외부에서 value가 바뀌면(초기화 등) 검색어(표시명)도 업데이트
    useEffect(() => {
        const selected = options.find(o => o.uniqueKey === value);
        if (selected) {
            setSearchTerm(getLabel(selected));
        } else {
            setSearchTerm('');
        }
    }, [value, options, getLabel]);

    // 2. 바깥 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                // 닫힐 때, 유효한 값이 선택 안되어 있으면 입력창 초기화 (선택된 값의 이름으로 복구)
                const selected = options.find(o => o.uniqueKey === value);
                setSearchTerm(selected ? getLabel(selected) : '');
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef, value, options, getLabel]);

    // 3. 검색어에 따른 필터링
    const filteredOptions = options.filter(opt =>
        getLabel(opt).toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.uniqueKey.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative flex items-center">
                <input
                    type="text"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-teal-500 rounded-xl text-sm font-semibold text-teal-800 outline-none transition-all placeholder-gray-400"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        if (e.target.value === '') onChange(''); // 지우면 선택 해제
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setSearchTerm(''); // 포커스 시 편하게 검색하라고 비워줌 (취향따라 제거 가능)
                    }}
                />
                <div className="absolute right-4 text-teal-500 pointer-events-none">
                    {isOpen ? <FiSearch /> : <FiChevronDown />}
                </div>
            </div>

            {/* 드롭다운 목록 */}
            {isOpen && (
                <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-lg animate-fadeIn thin-scrollbar">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt) => (
                            <li
                                key={opt.uniqueKey}
                                onClick={() => {
                                    onChange(opt.uniqueKey); // 부모에게 키값 전달
                                    setSearchTerm(getLabel(opt)); // 화면엔 이름 표시
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
                        <li className="px-4 py-3 text-sm text-gray-400 text-center">No results found</li>
                    )}
                </ul>
            )}
        </div>
    );
};


export default SearchableSelect;
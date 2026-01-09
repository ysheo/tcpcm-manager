import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PaginationProps {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
    onPageChange: (page: number) => void; // 부모의 setCurrentPage를 여기에 연결
}

const Pagination: React.FC<PaginationProps> = ({
    totalItems,
    itemsPerPage,
    currentPage,
    onPageChange
}) => {
    // 내부 입력값 관리 (부모에서 제거됨!)
    const [inputVal, setInputVal] = useState(String(currentPage));
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    // 외부에서 페이지가 바뀌면(예: 버튼 클릭) 입력창 숫자도 동기화
    useEffect(() => {
        setInputVal(String(currentPage));
    }, [currentPage]);

    // 엔터키 입력 처리
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const p = parseInt(inputVal);
            if (!isNaN(p) && p > 0 && p <= totalPages) {
                onPageChange(p);
            } else {
                setInputVal(String(currentPage)); // 잘못된 값이면 원래 페이지로 복구
            }
        }
    };

    return (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs text-gray-500">
                Total <span className="font-bold text-teal-600">{totalItems.toLocaleString()}</span> items
            </div>

            <div className="flex items-center space-x-1">
                {/* 이전 버튼 */}
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"
                >
                    <FiChevronLeft />
                </button>

                {/* 페이지 입력 영역 */}
                <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-1 text-sm font-medium text-gray-700 shadow-sm">
                    <span className="text-gray-400 mr-2 text-[10px] uppercase font-bold">Page</span>
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-8 text-center bg-transparent outline-none text-teal-700 font-bold"
                    />
                    <span className="text-gray-300 ml-2">/ {totalPages}</span>
                </div>

                {/* 다음 버튼 */}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 disabled:opacity-30 transition-colors"
                >
                    <FiChevronRight />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
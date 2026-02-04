import { useState, useEffect, useMemo } from 'react';
import PageMeta from '../../components/common/PageMeta';
import Badge from '../../components/ui/badge/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../components/ui/table';
import { skillService, DUMMY_SKILLS, SKILL_CATEGORIES } from '../../services/skills';
import type { Skill } from '../../types/database';

// 카테고리별 배지 색상
const getCategoryBadge = (category: string | null): { color: 'primary' | 'success' | 'warning' | 'info' | 'error' | 'light'; label: string } => {
  const config: Record<string, { color: 'primary' | 'success' | 'warning' | 'info' | 'error' | 'light'; label: string }> = {
    data: { color: 'primary', label: '데이터' },
    communication: { color: 'info', label: '커뮤니케이션' },
    analysis: { color: 'success', label: '분석' },
    automation: { color: 'warning', label: '자동화' },
    integration: { color: 'error', label: '연동' },
    content: { color: 'light', label: '콘텐츠' },
  };
  return config[category || 'data'] || { color: 'light', label: '기타' };
};

// 구현 타입별 라벨
const getImplementationTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    supabase_query: 'Supabase 쿼리',
    supabase_mutation: 'Supabase 변경',
    mcp_tool: 'MCP 도구',
    llm_call: 'LLM 호출',
    python_function: 'Python 함수',
    workflow: '워크플로우',
  };
  return labels[type] || type;
};

// 통계 카드 컴포넌트
interface StatCardProps {
  title: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, color, icon }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// 스킬 카드 컴포넌트 (그리드 뷰용)
interface SkillCardProps {
  skill: Skill;
}

function SkillCard({ skill }: SkillCardProps) {
  const categoryBadge = getCategoryBadge(skill.category);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {skill.name}
            </h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                skill.is_active
                  ? 'bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {skill.is_active ? '활성' : '비활성'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {skill.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Badge color={categoryBadge.color} size="sm">
          {categoryBadge.label}
        </Badge>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded">
          {getImplementationTypeLabel(skill.implementation_type)}
        </span>
      </div>

      <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          <span className="font-mono text-gray-600 dark:text-gray-400">
            {skill.skill_code}
          </span>
        </p>
      </div>
    </div>
  );
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchSkills() {
      try {
        const data = await skillService.getAll();
        setSkills(data);
      } catch {
        setSkills(DUMMY_SKILLS);
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, []);

  // 필터링된 스킬
  const filteredSkills = useMemo(() => {
    return skills.filter((skill) => {
      const categoryMatch =
        filterCategory === 'all' || skill.category === filterCategory;
      const statusMatch =
        filterStatus === 'all' ||
        (filterStatus === 'active' && skill.is_active) ||
        (filterStatus === 'inactive' && !skill.is_active);
      const searchMatch =
        searchQuery === '' ||
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (skill.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      return categoryMatch && statusMatch && searchMatch;
    });
  }, [skills, filterCategory, filterStatus, searchQuery]);

  // 통계 계산
  const stats = useMemo(() => {
    const activeCount = skills.filter((s) => s.is_active).length;
    const implementationTypes = skillService.getImplementationTypeCounts(skills);
    return {
      total: skills.length,
      active: activeCount,
      inactive: skills.length - activeCount,
      mcpTools: implementationTypes['mcp_tool'] || 0,
      llmCalls: implementationTypes['llm_call'] || 0,
    };
  }, [skills]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="스킬 관리 | 썬데이허그 AI"
        description="에이전트 스킬 관리 페이지"
      />
      <div className="p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            스킬 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            에이전트가 사용하는 스킬을 관리하고 구성합니다.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="전체 스킬"
            value={stats.total}
            color="bg-brand-100 dark:bg-brand-500/20"
            icon={
              <svg
                className="w-6 h-6 text-brand-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
          />
          <StatCard
            title="활성"
            value={stats.active}
            color="bg-success-100 dark:bg-success-500/20"
            icon={
              <svg
                className="w-6 h-6 text-success-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            }
          />
          <StatCard
            title="비활성"
            value={stats.inactive}
            color="bg-gray-100 dark:bg-gray-500/20"
            icon={
              <svg
                className="w-6 h-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            }
          />
          <StatCard
            title="MCP 도구"
            value={stats.mcpTools}
            color="bg-blue-100 dark:bg-blue-500/20"
            icon={
              <svg
                className="w-6 h-6 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
          />
          <StatCard
            title="LLM 호출"
            value={stats.llmCalls}
            color="bg-purple-100 dark:bg-purple-500/20"
            icon={
              <svg
                className="w-6 h-6 text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            }
          />
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            {/* 검색 */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="스킬 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* 카테고리 필터 */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                카테고리:
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="all">전체</option>
                {Object.entries(SKILL_CATEGORIES).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 상태 필터 */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                상태:
              </label>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')
                }
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="all">전체</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </div>

            {/* 뷰 모드 토글 */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredSkills.length}개의 스킬 표시 중
            </div>
          </div>
        </div>

        {/* 스킬 목록 */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredSkills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <Table className="w-full">
              <TableHeader className="bg-gray-50 dark:bg-gray-700/50">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    스킬명
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    카테고리
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    구현 타입
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    상태
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    업데이트
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSkills.map((skill) => {
                  const categoryBadge = getCategoryBadge(skill.category);
                  return (
                    <TableRow
                      key={skill.id}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <TableCell className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {skill.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                            {skill.skill_code}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge color={categoryBadge.color} size="sm">
                          {categoryBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {getImplementationTypeLabel(skill.implementation_type)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            skill.is_active
                              ? 'bg-success-50 text-success-600 dark:bg-success-500/20 dark:text-success-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {skill.is_active ? '활성' : '비활성'}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(skill.updated_at).toLocaleDateString('ko-KR')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 스킬이 없을 때 */}
        {filteredSkills.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              스킬이 없습니다
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              검색 조건에 맞는 스킬이 없습니다.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { rolesApi } from '../../api/roles';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { Search, Briefcase, Building, ChevronRight } from '../../components/icons';

export const RoleExplorer: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getRoles(),
  });

  const categories = ['All', 'Software', 'Data', 'Management', 'Non-Tech'];

  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const roleCategory = role.category || '';
      const matchesCategory =
        selectedCategory === 'All' ||
        roleCategory === selectedCategory ||
        roleCategory.toLowerCase().includes(selectedCategory.toLowerCase());
      const q = search.toLowerCase();
      const title = role.title || '';
      const desc = role.shortDescription || role.description || '';
      const skills = role.topSkills || role.skills || [];
      const matchesSearch =
        !search ||
        title.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        skills.some((s) => s.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [roles, search, selectedCategory]);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-xl bg-[#1F1F1E] border border-gray-800 p-8 overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-3">
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Job roles
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            What each role is tested on, which companies hire for it, and how its interview rounds are run.
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="w-full md:w-96">
          <Input
            placeholder="Search by role name or skill (e.g. React, SQL, SDE)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 p-1 bg-[#171716] border border-gray-800 rounded-xl overflow-x-auto w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filteredRoles.length === 0 ? (
        <div className="text-center py-16 bg-[#171716] rounded-lg border border-gray-800">
          <p className="text-gray-400 text-sm">No engineering roles found matching your query.</p>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setSelectedCategory('All'); }} className="mt-3">
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <Card
              key={role.id}
              variant="interactive"
              className="p-6 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center text-brand-400">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={role.difficulty === 'Hard' ? 'danger' : role.difficulty === 'Medium' ? 'warning' : 'success'}
                      size="sm"
                    >
                      {role.difficulty}
                    </Badge>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {role.salaryRange}
                    </span>
                  </div>
                </div>

                {/* Role Title & Summary */}
                <div>
                  <h3 className="text-lg font-bold text-gray-100 group-hover:text-brand-300 transition-colors">
                    {role.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {role.shortDescription}
                  </p>
                </div>

                {/* Top Skills Required */}
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 mb-2">
                    Key Evaluation Skills
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(role.topSkills || role.skills || []).slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-[#1F1F1E] text-gray-300 px-2.5 py-1 rounded-lg border border-gray-700/60 font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-5 mt-5 border-t border-gray-800/80 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs text-gray-400">
                  <Building className="w-3.5 h-3.5 text-gray-500" />
                  <span>{(role.hiringCompanies || ['TCS', 'Infosys', 'Amazon', 'Zoho']).length} visiting firms</span>
                </div>
                <Link to={`/roles/${role.slug}`}>
                  <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                    Explore Track
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

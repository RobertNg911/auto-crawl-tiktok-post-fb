import { Search, Filter, X } from 'lucide-react';
import { TOPICS, STATUS_OPTIONS } from '../../data/mockChannels';

export function ChannelFilters({ filters, onFilterChange, onSearch }) {
  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  const handleClear = () => {
    onFilterChange({ status: 'all', topic: 'all', search: '' });
  };

  const hasFilters = filters.status !== 'all' || filters.topic !== 'all' || filters.search;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/8 bg-black/10 p-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm kênh..."
          value={filters.search}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          className="field-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
        />
      </div>

      <select
        value={filters.status}
        onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
        className="field-input rounded-xl py-2.5 pl-4 pr-10 text-sm"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={filters.topic}
        onChange={(e) => onFilterChange({ ...filters, topic: e.target.value })}
        className="field-input rounded-xl py-2.5 pl-4 pr-10 text-sm"
      >
        {TOPICS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={handleClear}
          className="flex h-10 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400 transition hover:border-white/18 hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
          Xóa lọc
        </button>
      )}
    </div>
  );
}

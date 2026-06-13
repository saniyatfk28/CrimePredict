import React from 'react';

interface CrimeFiltersProps {
  availableTypes: string[];
  selectedTypes: string[];
  onTypesChange: (types: string[]) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange: (d?: string) => void;
  onDateToChange: (d?: string) => void;
  aggregation: 'day' | 'month';
  onAggregationChange: (a: 'day' | 'month') => void;
}

const CrimeFilters: React.FC<CrimeFiltersProps> = ({
  availableTypes,
  selectedTypes,
  onTypesChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  aggregation,
  onAggregationChange,
}) => {
  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) onTypesChange(selectedTypes.filter(t => t !== type));
    else onTypesChange([...selectedTypes, type]);
  };

  return (
    <div className="mb-3">
      <div className="row g-2 align-items-center">
        <div className="col-sm-4">
          <label className="form-label small mb-1">From</label>
          <input type="date" className="form-control form-control-sm" value={dateFrom || ''} onChange={e => onDateFromChange(e.target.value || undefined)} />
        </div>
        <div className="col-sm-4">
          <label className="form-label small mb-1">To</label>
          <input type="date" className="form-control form-control-sm" value={dateTo || ''} onChange={e => onDateToChange(e.target.value || undefined)} />
        </div>
        <div className="col-sm-4">
          <label className="form-label small mb-1">Aggregation</label>
          <select className="form-select form-select-sm" value={aggregation} onChange={e => onAggregationChange(e.target.value as 'day' | 'month')}>
            <option value="day">Day</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label className="form-label small mb-2">Crime Types</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {availableTypes.map(type => (
            <button
              key={type}
              className={`btn btn-sm ${selectedTypes.includes(type) ? 'btn-danger' : 'btn-outline-secondary'}`}
              onClick={() => toggleType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CrimeFilters;

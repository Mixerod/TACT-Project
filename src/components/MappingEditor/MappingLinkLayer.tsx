import { useEffect, useState, useRef } from 'react';
import { useMappingStore } from '../../stores/mappingStore';
import { Mapping } from '../../types';

interface LinkLine {
  id: string;
  type: 'column' | 'cell' | 'range' | 'draft';
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mappingObj?: Mapping;
}

export default function MappingLinkLayer() {
  const {
    mappings,
    activeMappingType,
    selectedCsvColumn,
    selectedCsvColumns,
    selectedExcelCellOrColumn,
    excelStartCell,
    removeMapping,
  } = useMappingStore();

  const [lines, setLines] = useState<LinkLine[]>([]);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const calculatePositions = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const tempLines: LinkLine[] = [];

    // 1. Calculate established mappings
    mappings.forEach((m) => {
      let srcId = '';
      let dstId = '';

      if (m.type === 'column') {
        srcId = `csv-col-${m.csv_column.replace(/\s+/g, '-')}`;
        dstId = `excel-col-${m.excel_column}`;
      } else if (m.type === 'cell') {
        // value_source can be static or column name. If it's a column name, connect it!
        // For simplicity, connect to its Excel cell
        srcId = `csv-col-${String(m.value_source).replace(/\s+/g, '-')}`;
        dstId = `excel-cell-${m.excel_cell}`;
      } else if (m.type === 'range') {
        // connect first column of range
        if (m.csv_columns.length > 0) {
          srcId = `csv-col-${m.csv_columns[0].replace(/\s+/g, '-')}`;
        }
        dstId = `excel-cell-${m.excel_start_cell}`;
      }

      const srcEl = document.getElementById(srcId);
      const dstEl = document.getElementById(dstId);

      if (srcEl && dstEl) {
        const srcRect = srcEl.getBoundingClientRect();
        const dstRect = dstEl.getBoundingClientRect();

        // Check if elements are visible in viewport/scroll view
        const srcVisible = srcRect.bottom > containerRect.top && srcRect.top < containerRect.bottom;
        const dstVisible = dstRect.bottom > containerRect.top && dstRect.top < containerRect.bottom;

        if (srcVisible && dstVisible) {
          tempLines.push({
            id: m.id,
            type: m.type,
            label: m.label,
            x1: srcRect.right - containerRect.left,
            y1: srcRect.top + srcRect.height / 2 - containerRect.top,
            x2: dstRect.left - containerRect.left,
            y2: dstRect.top + dstRect.height / 2 - containerRect.top,
            mappingObj: m,
          });
        }
      }
    });

    // 2. Calculate active draft connection
    let draftSrcId = '';
    let draftDstId = '';

    if (activeMappingType === 'column' && selectedCsvColumn && selectedExcelCellOrColumn) {
      draftSrcId = `csv-col-${selectedCsvColumn.replace(/\s+/g, '-')}`;
      draftDstId = `excel-col-${selectedExcelCellOrColumn}`;
    } else if (activeMappingType === 'cell' && selectedCsvColumn && selectedExcelCellOrColumn) {
      draftSrcId = `csv-col-${selectedCsvColumn.replace(/\s+/g, '-')}`;
      draftDstId = `excel-cell-${selectedExcelCellOrColumn}`;
    } else if (activeMappingType === 'range' && selectedCsvColumns.length > 0 && excelStartCell) {
      draftSrcId = `csv-col-${selectedCsvColumns[0].replace(/\s+/g, '-')}`;
      draftDstId = `excel-cell-${excelStartCell}`;
    }

    if (draftSrcId && draftDstId) {
      const srcEl = document.getElementById(draftSrcId);
      const dstEl = document.getElementById(draftDstId);

      if (srcEl && dstEl) {
        const srcRect = srcEl.getBoundingClientRect();
        const dstRect = dstEl.getBoundingClientRect();

        tempLines.push({
          id: 'draft-line',
          type: 'draft',
          label: 'Draft Connection',
          x1: srcRect.right - containerRect.left,
          y1: srcRect.top + srcRect.height / 2 - containerRect.top,
          x2: dstRect.left - containerRect.left,
          y2: dstRect.top + dstRect.height / 2 - containerRect.top,
        });
      }
    }

    setLines(tempLines);
  };

  // Bind scroll and resize listeners to recalculate dynamically
  useEffect(() => {
    calculatePositions();

    // Find grid containers to capture scroll events
    const grids = document.querySelectorAll('.flex-1.min-h-0.overflow-auto');
    
    const handleScrollAndResize = () => {
      calculatePositions();
    };

    const handleMappingHover = (e: Event) => {
      const customEvent = e as CustomEvent;
      setHoveredLineId(customEvent.detail);
    };

    window.addEventListener('resize', handleScrollAndResize);
    window.addEventListener('mapping-hover', handleMappingHover);
    grids.forEach((grid) => grid.addEventListener('scroll', handleScrollAndResize));

    // Also recalculate frequently in case of minor layout shifts
    const interval = setInterval(calculatePositions, 100);

    return () => {
      window.removeEventListener('resize', handleScrollAndResize);
      window.removeEventListener('mapping-hover', handleMappingHover);
      grids.forEach((grid) => grid.removeEventListener('scroll', handleScrollAndResize));
      clearInterval(interval);
    };
  }, [
    mappings,
    activeMappingType,
    selectedCsvColumn,
    selectedCsvColumns,
    selectedExcelCellOrColumn,
    excelStartCell,
  ]);

  const getLineColor = (type: 'column' | 'cell' | 'range' | 'draft', active: boolean) => {
    if (type === 'draft') return '#facc15'; // pulsing gold
    if (active) return '#e0f2fe'; // hover sky-100 highlight

    if (type === 'column') return '#10b981'; // emerald-500
    if (type === 'cell') return '#06b6d4'; // cyan-500
    return '#6366f1'; // indigo-500
  };

  const getLineShadow = (type: 'column' | 'cell' | 'range' | 'draft', active: boolean) => {
    if (type === 'draft') return 'drop-shadow(0 0 4px #facc15)';
    if (active) return 'drop-shadow(0 0 6px #0ea5e9)';

    if (type === 'column') return 'drop-shadow(0 0 3px #10b981)';
    if (type === 'cell') return 'drop-shadow(0 0 3px #06b6d4)';
    return 'drop-shadow(0 0 3px #6366f1)';
  };

  const handleDeleteSelected = () => {
    if (selectedLineId && selectedLineId !== 'draft-line') {
      const mapping = mappings.find((m) => m.id === selectedLineId);
      if (mapping && confirm(`Xóa mapping "${mapping.label}"?`)) {
        removeMapping(selectedLineId);
        setSelectedLineId(null);
      }
    }
  };

  return (
    <div
      id="mapping-editor-container"
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-20"
      style={{ overflow: 'hidden' }}
    >
      <svg className="w-full h-full">
        <defs>
          <marker
            id="arrow-emerald"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
          </marker>
          <marker
            id="arrow-cyan"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
          </marker>
          <marker
            id="arrow-indigo"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
          </marker>
          <marker
            id="arrow-draft"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#facc15" />
          </marker>
        </defs>

        {lines.map((line) => {
          const isHovered = hoveredLineId === line.id;
          const isSelected = selectedLineId === line.id;
          const active = isHovered || isSelected;

          // Standard cubic bezier curve paths
          const dx = Math.abs(line.x2 - line.x1) * 0.4;
          const path = `M ${line.x1} ${line.y1} C ${line.x1 + dx} ${line.y1}, ${line.x2 - dx} ${line.y2}, ${line.x2} ${line.y2}`;

          return (
            <g key={line.id}>
              {/* Invisible wide interactive hover path trigger */}
              <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                className="cursor-pointer pointer-events-auto"
                onMouseEnter={() => setHoveredLineId(line.id)}
                onMouseLeave={() => setHoveredLineId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (line.id !== 'draft-line') {
                    setSelectedLineId(line.id === selectedLineId ? null : line.id);
                  }
                }}
              />

              {/* Glowing decorative path */}
              <path
                d={path}
                fill="none"
                stroke={getLineColor(line.type, active)}
                strokeWidth={active ? 3 : 1.5}
                strokeDasharray={line.type === 'draft' ? '5,5' : undefined}
                style={{
                  filter: getLineShadow(line.type, active),
                  transition: 'stroke 0.2s, stroke-width 0.2s',
                }}
                className={line.type === 'draft' ? 'animate-dash-scroll' : ''}
                markerEnd={`url(#arrow-${line.type === 'draft' ? 'draft' : line.type})`}
              />

              {/* Text tooltip overlay label */}
              {active && (
                <foreignObject
                  x={(line.x1 + line.x2) / 2 - 70}
                  y={(line.y1 + line.y2) / 2 - 14}
                  width={140}
                  height={28}
                  className="pointer-events-none"
                >
                  <div className="bg-slate-950/90 border border-slate-800 text-[10px] text-slate-300 font-bold px-2 py-0.5 rounded text-center shadow-lg uppercase tracking-wider truncate">
                    {line.label}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating delete button when a connection is selected */}
      {selectedLineId && selectedLineId !== 'draft-line' && (
        <div
          className="absolute bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-2xl flex items-center gap-2 pointer-events-auto z-40"
          style={{
            left: `${(lines.find((l) => l.id === selectedLineId)?.x1 || 100) + 120}px`,
            top: `${(lines.find((l) => l.id === selectedLineId)?.y1 || 100) - 20}px`,
          }}
        >
          <span className="text-[10px] text-slate-400 font-bold uppercase">Mapping Selected</span>
          <button
            onClick={handleDeleteSelected}
            className="bg-rose-650 hover:bg-rose-600 text-white font-extrabold px-2.5 py-1 rounded text-[10px] transition-colors"
          >
            Xóa Link
          </button>
          <button
            onClick={() => setSelectedLineId(null)}
            className="text-[10px] text-slate-500 hover:text-slate-300 font-bold px-1"
          >
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}

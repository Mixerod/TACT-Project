import { useState, useEffect } from 'react';
import { useProfileStore } from '../../stores/profileStore';
import {
  HelpCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function IdentityMappingPanel() {
  const { currentProfile, saveProfile } = useProfileStore();

  const [orderSource, setOrderSource] = useState<'filename' | 'condition_sheet' | 'both'>('both');
  const [colorSource, setColorSource] = useState<'filename' | 'condition_sheet' | 'both'>('both');
  const [regex, setRegex] = useState('^([A-Z0-9\\-]+)_([A-Z]+)_');
  const [orderGroup, setOrderGroup] = useState(1);
  const [colorGroup, setColorGroup] = useState(2);
  const [conditionSheet, setConditionSheet] = useState('Condition');
  const [conditionKeys, setConditionKeys] = useState<string[]>(['Sample name', 'Submission']);
  const [newKey, setNewKey] = useState('');
  
  const [orderCell, setOrderCell] = useState('C3');
  const [colorCell, setColorCell] = useState('C4');

  // Regex Live Tester parameters
  const [testFilename, setTestFilename] = useState('ORD001_RED_Tensile.csv');
  const [testResult, setTestResult] = useState<{
    order: string | null;
    color: string | null;
    success: boolean;
    error?: string;
  }>({ order: null, color: null, success: false });

  // Sync state with current profile details on mount or change
  useEffect(() => {
    if (currentProfile?.identity) {
      const iden = currentProfile.identity;
      setOrderSource(iden.order_source);
      setColorSource(iden.color_source);
      setRegex(iden.filename_regex);
      setOrderGroup(iden.filename_order_group);
      setColorGroup(iden.filename_color_group);
      setConditionSheet(iden.condition_sheet || 'Condition');
      setConditionKeys(iden.condition_keys || []);
      
      const ordCellObj = iden.output_cells.find((c) => c.field === 'order');
      const colCellObj = iden.output_cells.find((c) => c.field === 'color');
      if (ordCellObj) setOrderCell(ordCellObj.cell);
      if (colCellObj) setColorCell(colCellObj.cell);
    }
  }, [currentProfile?.id]);

  // Run Regex live simulator instantly on input changes
  useEffect(() => {
    if (!regex) {
      setTestResult({ order: null, color: null, success: false, error: 'Chưa nhập Regex' });
      return;
    }

    try {
      const regObj = new RegExp(regex);
      const match = regObj.exec(testFilename);
      
      if (match) {
        const orderVal = match[orderGroup] || null;
        const colorVal = match[colorGroup] || null;
        setTestResult({
          order: orderVal,
          color: colorVal,
          success: !!(orderVal || colorVal),
        });
      } else {
        setTestResult({
          order: null,
          color: null,
          success: false,
          error: 'Regex không khớp với tên file mẫu.',
        });
      }
    } catch (err: any) {
      setTestResult({
        order: null,
        color: null,
        success: false,
        error: `Regex sai cú pháp: ${err.message}`,
      });
    }
  }, [regex, testFilename, orderGroup, colorGroup]);

  const handleSaveIdentityConfig = async () => {
    if (!currentProfile) return;
    
    // Create new identity config object matching DATA_MODELS.md
    const updatedProfile = {
      ...currentProfile,
      identity: {
        order_source: orderSource,
        color_source: colorSource,
        filename_regex: regex,
        filename_order_group: orderGroup,
        filename_color_group: colorGroup,
        condition_sheet: conditionSheet,
        condition_keys: conditionKeys,
        output_cells: [
          { field: 'order' as const, cell: orderCell.trim().toUpperCase() },
          { field: 'color' as const, cell: colorCell.trim().toUpperCase() },
        ],
      },
    };

    try {
      await saveProfile(updatedProfile);
      alert('Đã lưu cấu hình Identity mapping thành công!');
    } catch (err) {
      alert(`Lưu thất bại: ${err}`);
    }
  };

  const handleAddKey = () => {
    if (newKey.trim() && !conditionKeys.includes(newKey.trim())) {
      setConditionKeys([...conditionKeys, newKey.trim()]);
      setNewKey('');
    }
  };

  const handleRemoveKey = (keyToRemove: string) => {
    setConditionKeys(conditionKeys.filter((k) => k !== keyToRemove));
  };

  if (!currentProfile) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 py-16">
        <HelpCircle className="w-12 h-12 text-slate-700 mx-auto mb-2" />
        <p className="text-sm">Hãy chọn hoặc tải một phương pháp Test để bắt đầu thiết lập.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Stepper details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Extraction sources & Coordinates */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            
            {/* Order Identity routing source */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2">
                1. Extraction Sources
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order extraction */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-bold block">
                    Nguồn trích xuất Mã Đơn (Order ID)
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    {['filename', 'condition_sheet', 'both'].map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setOrderSource(src as any)}
                        className={`py-2 px-2.5 rounded-lg border font-bold capitalize transition-all ${
                          orderSource === src
                            ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                            : 'border-slate-800 bg-slate-950 text-slate-500'
                        }`}
                      >
                        {src === 'both' ? 'Both (Ưu tiên Sheet)' : src.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color extraction */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-bold block">
                    Nguồn trích xuất Mã Màu (Color Code)
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    {['filename', 'condition_sheet', 'both'].map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setColorSource(src as any)}
                        className={`py-2 px-2.5 rounded-lg border font-bold capitalize transition-all ${
                          colorSource === src
                            ? 'border-cyan-500 bg-cyan-950/20 text-cyan-300'
                            : 'border-slate-800 bg-slate-950 text-slate-500'
                        }`}
                      >
                        {src === 'both' ? 'Both (Ưu tiên Sheet)' : src.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Condition sheet keys config */}
            {(orderSource !== 'filename' || colorSource !== 'filename') && (
              <div className="space-y-4 pt-4 border-t border-slate-850/60 animate-in slide-in-from-top-1 duration-200">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2">
                  2. Condition Sheet Search Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Sheet Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold block">
                      Tên sheet Condition tìm kiếm trong CSV
                    </label>
                    <input
                      type="text"
                      value={conditionSheet}
                      onChange={(e) => setConditionSheet(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all"
                    />
                  </div>

                  {/* Condition Keys list builder */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-bold block">
                      Nhãn tìm kiếm giá trị (Keys)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập Key (e.g. Sample ID)"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleAddKey}
                        className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold px-3 py-2 rounded-lg text-xs transition-colors shrink-0"
                      >
                        Thêm
                      </button>
                    </div>

                    {conditionKeys.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950 border border-slate-850 rounded-lg">
                        {conditionKeys.map((key) => (
                          <span
                            key={key}
                            className="bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 hover:bg-rose-950 hover:border-rose-900 hover:text-rose-300 cursor-pointer transition-colors"
                            onClick={() => handleRemoveKey(key)}
                            title="Click để xóa"
                          >
                            {key} &times;
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Target Output cell coords */}
            <div className="space-y-4 pt-4 border-t border-slate-850/60">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2">
                3. Output report Coordinates
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order output cell */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold block">
                    Ô đích ghi mã Đơn trong Excel (e.g. C3)
                  </label>
                  <input
                    type="text"
                    value={orderCell}
                    onChange={(e) => setOrderCell(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono uppercase"
                  />
                </div>

                {/* Color output cell */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold block">
                    Ô đích ghi Mã Màu trong Excel (e.g. C4)
                  </label>
                  <input
                    type="text"
                    value={colorCell}
                    onChange={(e) => setColorCell(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono uppercase"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Submit button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveIdentityConfig}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3 px-8 rounded-xl text-xs transition-all shadow-lg hover:shadow-emerald-500/10"
            >
              <CheckCircle className="w-4 h-4" />
              Lưu cấu hình Identity
            </button>
          </div>
        </div>

        {/* Right Column: Regex Simulator */}
        {(orderSource !== 'condition_sheet' || colorSource !== 'condition_sheet') && (
          <div className="space-y-6 animate-in slide-in-from-right-1 duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
              
              {/* Regex Inputs */}
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2">
                Filename Regex Simulator
              </h3>

              <div className="space-y-3.5 text-xs">
                {/* Filename regex expression */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-bold block">Filename Regex Pattern</label>
                  <input
                    type="text"
                    value={regex}
                    onChange={(e) => setRegex(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Order group index */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold block">Group Order (1-based)</label>
                    <input
                      type="number"
                      min={1}
                      value={orderGroup}
                      onChange={(e) => setOrderGroup(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono"
                    />
                  </div>

                  {/* Color group index */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-bold block">Group Color (1-based)</label>
                    <input
                      type="number"
                      min={1}
                      value={colorGroup}
                      onChange={(e) => setColorGroup(parseInt(e.target.value) || 2)}
                      className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Simulation tester */}
              <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-4">
                
                {/* Test filename input */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Sample Filename to Test:
                  </span>
                  <input
                    type="text"
                    value={testFilename}
                    onChange={(e) => setTestFilename(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none font-mono"
                  />
                </div>

                {/* Tester output scorecard */}
                <div className="border-t border-slate-900 pt-3 space-y-2.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Simulator Match Output:
                  </span>

                  {testResult.success ? (
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500">Order Match Group {orderGroup}:</span>
                        <span className="text-emerald-400 font-mono">{testResult.order || 'None'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-slate-500">Color Match Group {colorGroup}:</span>
                        <span className="text-emerald-400 font-mono">{testResult.color || 'None'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] uppercase font-bold pt-1">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                        Regex Simulator Success
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs font-semibold">
                      <div className="bg-rose-950/20 border border-rose-900/60 text-rose-400 p-2.5 rounded text-[10px] leading-relaxed flex gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{testResult.error || 'Regex failed to capture matching groups.'}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}

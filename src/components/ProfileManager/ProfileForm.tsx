import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProfileStore } from '../../stores/profileStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import { usePythonApi } from '../../hooks/usePythonApi';
import { Profile } from '../../types';
import {
  FolderOpen,
  FileSpreadsheet,
  AlertTriangle,
  ArrowLeft,
  Save,
  HelpCircle,
} from 'lucide-react';

interface ProfileFormProps {
  initialProfile: Profile | null;
  onCancel: () => void;
  onSave: () => void;
}

export default function ProfileForm({
  initialProfile,
  onCancel,
  onSave,
}: ProfileFormProps) {
  const { t } = useTranslation();
  const { saveProfile, profiles, createEmptyProfile } = useProfileStore();
  const { openFileDialog, openFolderDialog } = useTauriCommands();
  const { validateProfile } = usePythonApi();

  // Form State
  const [formData, setFormData] = useState<Profile>(() => {
    if (initialProfile) return JSON.parse(JSON.stringify(initialProfile));
    return createEmptyProfile();
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationAlerts, setValidationAlerts] = useState<{
    errors: Array<{ field: string; message: string }>;
    warnings: Array<{ field: string; message: string }>;
  } | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filenamePreview, setFilenamePreview] = useState('');

  // Filename Live Preview Engine
  useEffect(() => {
    let pattern = formData.output.filename_pattern || 'Report_{order}_{color}_{date}.xlsx';
    
    // Resolve date format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    let resolvedDate = `${year}${month}${day}`;
    if (formData.output.date_format === 'YYYY-MM-DD') {
      resolvedDate = `${year}-${month}-${day}`;
    } else if (formData.output.date_format === 'DDMMYYYY') {
      resolvedDate = `${day}${month}${year}`;
    }

    const resolved = pattern
      .replace('{order}', 'ORD001')
      .replace('{color}', 'RED')
      .replace('{date}', resolvedDate)
      .replace('{method}', formData.method_code || 'tensile');
      
    setFilenamePreview(resolved);
  }, [
    formData.output.filename_pattern,
    formData.output.date_format,
    formData.method_code,
  ]);

  const handleBrowseTemplate = async () => {
    try {
      const path = await openFileDialog(
        'Select Excel Template',
        [{ name: 'Excel Templates', extensions: ['xlsx'] }],
        false
      );
      if (path && typeof path === 'string') {
        // Resolve sheet names on the python side or let them edit it
        setFormData((prev) => ({
          ...prev,
          template: {
            ...prev.template,
            path: path.replace(/\\/g, '/'),
          },
        }));
        setErrors((prev) => ({ ...prev, 'template.path': '' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBrowseOutputDir = async () => {
    try {
      const path = await openFolderDialog('Select Output Folder');
      if (path) {
        setFormData((prev) => ({
          ...prev,
          output: {
            ...prev.output,
            directory: path.replace(/\\/g, '/'),
          },
        }));
        setErrors((prev) => ({ ...prev, 'output.directory': '' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const validateLocalFields = (): boolean => {
    const localErrors: Record<string, string> = {};

    if (!formData.name.trim()) localErrors.name = 'Tên phương pháp bắt buộc nhập';
    if (!formData.method_code.trim()) localErrors.method_code = 'Mã phương pháp bắt buộc nhập';
    else if (!/^[a-zA-Z0-9_\-]+$/.test(formData.method_code)) {
      localErrors.method_code = 'Mã phương pháp chỉ gồm chữ, số, gạch ngang, gạch dưới';
    } else {
      // Check uniqueness of method code
      const isUnique = !profiles.some(
        (p) =>
          p.method_code.toLowerCase() === formData.method_code.toLowerCase() &&
          p.id !== formData.id
      );
      if (!isUnique) {
        localErrors.method_code = 'Mã phương pháp này đã tồn tại ở phương pháp khác';
      }
    }

    if (!formData.template.path.trim()) localErrors['template.path'] = 'Excel template path bắt buộc nhập';
    if (!formData.template.sheet_name.trim()) localErrors['template.sheet_name'] = 'Excel template sheet name bắt buộc nhập';
    if (!formData.output.directory.trim()) localErrors['output.directory'] = 'Output directory bắt buộc nhập';

    setErrors(localErrors);
    return Object.keys(localErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // 1. Client Local check
    if (!validateLocalFields()) return;

    setIsSubmitting(true);
    setValidationAlerts(null);

    try {
      // 2. FastAPI validation check
      const validation = await validateProfile(formData);
      
      if (!validation.valid || validation.errors.length > 0) {
        setValidationAlerts({
          errors: validation.errors,
          warnings: validation.warnings,
        });
        setIsSubmitting(false);
        return;
      }

      // If warnings exist, we still allow saving, but if they want to cancel they can.
      // 3. Complete Rust save CRUD command
      await saveProfile(formData);
      
      onSave();
    } catch (err: any) {
      console.error(err);
      alert(`Lưu profile thất bại: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-300">
      
      {/* Form Header Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-slate-850 border border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
            title="Quay lại"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-100">
              {formData.id ? 'Hiệu chỉnh Phương pháp' : 'Thêm Phương pháp mới'}
            </h2>
            <p className="text-sm text-slate-400">
              {formData.id ? `ID: ${formData.id}` : 'Nhập thông tin thiết lập cho phương pháp test mới.'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 md:flex-none text-center bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-400 font-semibold py-2 px-5 rounded-lg text-xs transition-colors"
          >
            {t('common.cancel')}
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold py-2 px-6 rounded-lg text-xs transition-colors shadow-lg hover:shadow-emerald-500/10"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>

      {/* FastAPI Validation Alerts */}
      {validationAlerts && (
        <div className="space-y-3">
          {validationAlerts.errors.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-900 p-4 rounded-xl space-y-2 text-rose-300 text-xs">
              <span className="font-extrabold flex items-center gap-1.5 text-rose-400 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                Cảnh báo Lỗi xác thực hệ thống:
              </span>
              <ul className="list-disc pl-5 space-y-1 font-medium text-slate-300">
                {validationAlerts.errors.map((err, i) => (
                  <li key={i}>
                    <strong className="text-rose-400 capitalize">{err.field}</strong>: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationAlerts.warnings.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-900 p-4 rounded-xl space-y-2 text-amber-300 text-xs">
              <span className="font-extrabold flex items-center gap-1.5 text-amber-400 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                Lưu ý cảnh báo (Vẫn có thể lưu):
              </span>
              <ul className="list-disc pl-5 space-y-1 font-medium text-slate-300">
                {validationAlerts.warnings.map((warn, i) => (
                  <li key={i}>
                    <strong className="text-amber-400 capitalize">{warn.field}</strong>: {warn.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Inputs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Core Profile setup */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
              General Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold block">
                  Tên phương pháp (Profile Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tensile ISO 13934-1"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full bg-slate-950 border focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all ${
                    errors.name ? 'border-rose-950 bg-rose-950/5' : 'border-slate-850 hover:border-slate-750'
                  }`}
                />
                {errors.name && <p className="text-[10px] text-rose-400 font-semibold">{errors.name}</p>}
              </div>

              {/* Method Code */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold block">
                  Mã phương pháp (Method Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. tensile_iso13934"
                  value={formData.method_code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, method_code: e.target.value }))}
                  className={`w-full bg-slate-950 border focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono ${
                    errors.method_code ? 'border-rose-950 bg-rose-950/5' : 'border-slate-850 hover:border-slate-750'
                  }`}
                />
                {errors.method_code && <p className="text-[10px] text-rose-400 font-semibold">{errors.method_code}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-850/40">
              {/* CSV Main Sheet Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold block">
                  Tên sheet dữ liệu kết quả CSV (Default: "Result")
                </label>
                <input
                  type="text"
                  value={formData.source.sheet_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      source: { ...prev.source, sheet_name: e.target.value },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all"
                />
              </div>

              {/* CSV Header Row index */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold block">
                  Index dòng header tiêu đề CSV (0-based)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.source.header_row}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      source: { ...prev.source, header_row: parseInt(e.target.value) || 0 },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Template & Outputs config */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-emerald-400" />
              Filesystem and Routing Parameters
            </h3>

            {/* Template Path picker */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                Excel Template File Path (.xlsx) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Select absolute path to Excel Template..."
                  value={formData.template.path}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      template: { ...prev.template, path: e.target.value },
                    }))
                  }
                  className={`flex-1 bg-slate-950 border focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono ${
                    errors['template.path'] ? 'border-rose-950 bg-rose-950/5' : 'border-slate-850 hover:border-slate-750'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleBrowseTemplate}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition-colors shrink-0"
                >
                  Browse File
                </button>
              </div>
              {errors['template.path'] && <p className="text-[10px] text-rose-400 font-semibold">{errors['template.path']}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-850/40">
              {/* Template Sheet Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold block">
                  Excel Template Sheet Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Results"
                  value={formData.template.sheet_name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      template: { ...prev.template, sheet_name: e.target.value },
                    }))
                  }
                  className={`w-full bg-slate-950 border focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all ${
                    errors['template.sheet_name'] ? 'border-rose-950 bg-rose-950/5' : 'border-slate-850 hover:border-slate-750'
                  }`}
                />
                {errors['template.sheet_name'] && <p className="text-[10px] text-rose-400 font-semibold">{errors['template.sheet_name']}</p>}
              </div>
            </div>

            {/* Output Directory picker */}
            <div className="space-y-1.5 pt-4 border-t border-slate-850/40">
              <label className="text-xs text-slate-400 font-bold block">
                Output Directory <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Select output target directory..."
                  value={formData.output.directory}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      output: { ...prev.output, directory: e.target.value },
                    }))
                  }
                  className={`flex-1 bg-slate-950 border focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono ${
                    errors['output.directory'] ? 'border-rose-950 bg-rose-950/5' : 'border-slate-850 hover:border-slate-750'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleBrowseOutputDir}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition-colors shrink-0"
                >
                  Browse Folder
                </button>
              </div>
              {errors['output.directory'] && <p className="text-[10px] text-rose-400 font-semibold">{errors['output.directory']}</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Patterns & Filename Live Preview */}
        <div className="space-y-6">
          
          {/* Filename live preview engine */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-2">
              <span className="text-emerald-400">✨</span>
              Filename Live Preview
            </h3>

            <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-2">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">
                Generated Report File Name:
              </span>
              <code className="text-xs text-emerald-400 font-bold font-mono break-all leading-relaxed block select-all">
                {filenamePreview}
              </code>
            </div>

            <div className="text-[10px] text-slate-500 space-y-1.5 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-850/50">
              <span className="font-bold text-slate-400 block mb-0.5">Variables Support:</span>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px]">
                <div><span className="text-indigo-400 font-bold">{'{order}'}</span>: Order ID</div>
                <div><span className="text-indigo-400 font-bold">{'{color}'}</span>: Color</div>
                <div><span className="text-indigo-400 font-bold">{'{date}'}</span>: Run Date</div>
                <div><span className="text-indigo-400 font-bold">{'{method}'}</span>: Method</div>
              </div>
            </div>
          </div>

          {/* Patterns configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-850 pb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              Naming Rules
            </h3>

            {/* Pattern Input */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                Filename Pattern Formats
              </label>
              <input
                type="text"
                placeholder="Report_{order}_{color}_{date}.xlsx"
                value={formData.output.filename_pattern}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    output: { ...prev.output, filename_pattern: e.target.value },
                  }))
                }
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all font-mono"
              />
            </div>

            {/* Date format select */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold block">
                Target Date Formats
              </label>
              <select
                value={formData.output.date_format}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    output: { ...prev.output, date_format: e.target.value },
                  }))
                }
                className="w-full bg-slate-950 border border-slate-850 hover:border-slate-750 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none transition-all cursor-pointer"
              >
                <option value="YYYYMMDD">YYYYMMDD (e.g. 20260601)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-06-01)</option>
                <option value="DDMMYYYY">DDMMYYYY (e.g. 01062026)</option>
              </select>
            </div>
          </div>

        </div>

      </div>

    </form>
  );
}

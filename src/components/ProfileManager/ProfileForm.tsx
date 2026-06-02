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
  FolderOpen as FolderIcon,
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
  const { openFileDialog, openFolderDialog, getAppConfig } = useTauriCommands();
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
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Sync theme
  useEffect(() => {
    getAppConfig().then((config) => {
      if (config && config.theme) setTheme(config.theme);
    }).catch(console.error);

    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.theme) {
        setTheme(customEvent.detail.theme);
      }
    };
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

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

    if (!validateLocalFields()) return;

    setIsSubmitting(true);
    setValidationAlerts(null);

    try {
      const validation = await validateProfile(formData);
      
      if (!validation.valid || validation.errors.length > 0) {
        setValidationAlerts({
          errors: validation.errors,
          warnings: validation.warnings,
        });
        setIsSubmitting(false);
        return;
      }

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
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 ${
        theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={onCancel}
            className={`p-2.5 border rounded-xl transition-all shadow-sm cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650 hover:text-slate-900'
            }`}
            title="Quay lại"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${
              theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {formData.id ? 'Hiệu chỉnh Phương pháp' : 'Thêm Phương pháp mới'}
            </h2>
            <p className={`text-sm mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {formData.id ? `ID: ${formData.id}` : 'Nhập thông tin thiết lập cho phương pháp test mới.'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 md:flex-none text-center font-bold py-2.5 px-6 rounded-xl text-xs transition-all border shadow-sm cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-400 hover:text-slate-200'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            {t('common.cancel')}
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-650 to-emerald-750 hover:from-emerald-600 hover:to-emerald-700 disabled:from-slate-850 disabled:to-slate-850 disabled:bg-slate-850 text-white font-extrabold py-2.5 px-6 rounded-xl text-xs transition-all shadow-md hover:shadow-emerald-500/10 cursor-pointer active:scale-[0.99]"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
        </div>
      </div>

      {/* FastAPI Validation Alerts */}
      {validationAlerts && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          {validationAlerts.errors.length > 0 && (
            <div className="bg-rose-50 border border-rose-250 dark:bg-rose-950/20 dark:border-rose-900 p-4.5 rounded-2xl space-y-2.5 text-rose-800 dark:text-rose-300 text-xs shadow-sm">
              <span className="font-black flex items-center gap-2 uppercase tracking-wider text-rose-600 dark:text-rose-455">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                Lỗi xác thực hệ thống (Bắt buộc sửa):
              </span>
              <ul className="list-disc pl-5 space-y-1 font-semibold">
                {validationAlerts.errors.map((err, i) => (
                  <li key={i}>
                    <strong className="capitalize">{err.field}</strong>: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationAlerts.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-250 dark:bg-amber-950/20 dark:border-amber-900 p-4.5 rounded-2xl space-y-2.5 text-amber-800 dark:text-amber-300 text-xs shadow-sm">
              <span className="font-black flex items-center gap-2 uppercase tracking-wider text-amber-600 dark:text-amber-455">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                Lưu ý cảnh báo dệt QC (Vẫn có thể lưu):
              </span>
              <ul className="list-disc pl-5 space-y-1 font-semibold">
                {validationAlerts.warnings.map((warn, i) => (
                  <li key={i}>
                    <strong className="capitalize">{warn.field}</strong>: {warn.message}
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
        <div className="lg:col-span-2 space-y-8">
          
          {/* General parameters card */}
          <div className={`border rounded-2xl p-6 shadow-sm space-y-6 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-widest border-b pb-3.5 flex items-center gap-2.5 ${
              theme === 'dark' ? 'text-slate-300 border-slate-850' : 'text-slate-800 border-slate-100'
            }`}>
              <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
              General Parameters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Name */}
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Tên phương pháp (Profile Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tensile ISO 13934-1"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all ${
                    errors.name
                      ? 'border-rose-500 bg-rose-500/5 text-rose-600'
                      : theme === 'dark'
                        ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                        : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-800 shadow-inner bg-slate-50/20'
                  }`}
                />
                {errors.name && <p className="text-[10px] text-rose-500 font-bold">{errors.name}</p>}
              </div>

              {/* Method Code */}
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Mã phương pháp (Method Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. tensile_iso13934"
                  value={formData.method_code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, method_code: e.target.value }))}
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold font-mono outline-none transition-all ${
                    errors.method_code
                      ? 'border-rose-500 bg-rose-500/5 text-rose-600'
                      : theme === 'dark'
                        ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                        : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-800 shadow-inner bg-slate-50/20'
                  }`}
                />
                {errors.method_code && <p className="text-[10px] text-rose-500 font-bold">{errors.method_code}</p>}
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t ${
              theme === 'dark' ? 'border-slate-850/60' : 'border-slate-100'
            }`}>
              {/* CSV Main Sheet Name */}
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
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
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                      : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-800 shadow-inner bg-slate-50/20'
                  }`}
                />
              </div>

              {/* CSV Header Row index */}
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
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
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs font-bold font-mono outline-none transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                      : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-800 shadow-inner bg-slate-50/20'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Template & Outputs config */}
          <div className={`border rounded-2xl p-6 shadow-sm space-y-6 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/60 shadow-slate-100'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-widest border-b pb-3.5 flex items-center gap-2.5 ${
              theme === 'dark' ? 'text-slate-300 border-slate-850' : 'text-slate-800 border-slate-100'
            }`}>
              <FolderOpen className="w-5 h-5 text-indigo-500" />
              Filesystem and Routing Parameters
            </h3>

            {/* Template Path picker */}
            <div className="space-y-2">
              <label className={`text-xs font-bold block ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Excel Template File Path (.xlsx) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Chọn đường dẫn tuyệt đối đến Excel Template..."
                  value={formData.template.path}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      template: { ...prev.template, path: e.target.value },
                    }))
                  }
                  className={`flex-1 border rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all font-mono ${
                    errors['template.path']
                      ? 'border-rose-500 bg-rose-500/5 text-rose-600'
                      : theme === 'dark'
                        ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                        : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-800 shadow-inner bg-slate-50/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleBrowseTemplate}
                  className={`flex items-center gap-1.5 border text-xs font-bold px-4 rounded-xl transition-all cursor-pointer shadow-sm shrink-0 ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:bg-slate-850 hover:border-slate-700 text-slate-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-750'
                  }`}
                >
                  <FolderIcon className="w-4 h-4 text-cyan-500" />
                  Chọn File
                </button>
              </div>
              {errors['template.path'] && <p className="text-[10px] text-rose-500 font-bold">{errors['template.path']}</p>}
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t ${
              theme === 'dark' ? 'border-slate-850/60' : 'border-slate-100'
            }`}>
              {/* Template Sheet Name */}
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
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
                  className={`w-full border rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all ${
                    errors['template.sheet_name']
                      ? 'border-rose-500 bg-rose-500/5 text-rose-600'
                      : theme === 'dark'
                        ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                        : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-800 shadow-inner bg-slate-50/20'
                  }`}
                />
                {errors['template.sheet_name'] && <p className="text-[10px] text-rose-500 font-bold">{errors['template.sheet_name']}</p>}
              </div>
            </div>

            {/* Output Directory picker */}
            <div className={`space-y-2 pt-5 border-t ${
              theme === 'dark' ? 'border-slate-850/60' : 'border-slate-100'
            }`}>
              <label className={`text-xs font-bold block ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Thư mục lưu báo cáo (Output Directory) <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Chọn thư mục đích lưu trữ file xuất Excel báo cáo..."
                  value={formData.output.directory}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      output: { ...prev.output, directory: e.target.value },
                    }))
                  }
                  className={`flex-1 border rounded-xl px-4 py-2.5 text-xs font-semibold outline-none transition-all font-mono ${
                    errors['output.directory']
                      ? 'border-rose-500 bg-rose-500/5 text-rose-600'
                      : theme === 'dark'
                        ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                        : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-800 shadow-inner bg-slate-50/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleBrowseOutputDir}
                  className={`flex items-center gap-1.5 border text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm shrink-0 ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-850 hover:bg-slate-850 hover:border-slate-700 text-slate-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-750'
                  }`}
                >
                  <FolderIcon className="w-4 h-4 text-cyan-500" />
                  Chọn Thư mục
                </button>
              </div>
              {errors['output.directory'] && <p className="text-[10px] text-rose-500 font-bold">{errors['output.directory']}</p>}
            </div>
          </div>
        </div>

        {/* Right Column: Patterns & Filename Live Preview */}
        <div className="space-y-8">
          
          {/* Filename live preview card */}
          <div className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-slate-950' : 'bg-white border-slate-200/60 shadow-slate-100'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-widest border-b pb-3 flex items-center gap-2 ${
              theme === 'dark' ? 'text-slate-300 border-slate-850' : 'text-slate-800 border-slate-100'
            }`}>
              <span className="text-emerald-500">✨</span>
              Filename Live Preview
            </h3>

            <div className={`border p-4.5 rounded-xl space-y-2 shadow-inner transition-colors duration-300 ${
              theme === 'dark' ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-150'
            }`}>
              <span className={`text-[9px] font-black uppercase tracking-widest block ${
                theme === 'dark' ? 'text-slate-550' : 'text-slate-450'
              }`}>
                Generated Report File Name:
              </span>
              <code className="text-xs text-emerald-600 dark:text-emerald-400 font-black font-mono break-all leading-relaxed block select-all">
                {filenamePreview}
              </code>
            </div>

            <div className={`text-[10px] space-y-2.5 leading-relaxed p-3.5 rounded-xl border transition-all duration-350 ${
              theme === 'dark'
                ? 'bg-slate-950/40 border-slate-850/50 text-slate-400'
                : 'bg-slate-50/50 border-slate-150 text-slate-600'
            }`}>
              <span className={`font-black uppercase tracking-wider block text-[9px] ${
                theme === 'dark' ? 'text-indigo-400' : 'text-indigo-650'
              }`}>
                QC Biến tên file được hỗ trợ:
              </span>
              <div className="grid grid-cols-2 gap-2 font-mono text-[9px] font-semibold">
                <div><span className="text-cyan-600 dark:text-cyan-400 font-extrabold">{'{order}'}</span>: Order ID</div>
                <div><span className="text-cyan-600 dark:text-cyan-400 font-extrabold">{'{color}'}</span>: Color</div>
                <div><span className="text-cyan-600 dark:text-cyan-400 font-extrabold">{'{date}'}</span>: Run Date</div>
                <div><span className="text-cyan-600 dark:text-cyan-400 font-extrabold">{'{method}'}</span>: Method</div>
              </div>
            </div>
          </div>

          {/* Patterns configuration card */}
          <div className={`border rounded-2xl p-5 shadow-sm space-y-5 transition-all duration-300 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-slate-950' : 'bg-white border-slate-200/60 shadow-slate-100'
          }`}>
            <h3 className={`text-xs font-black uppercase tracking-widest border-b pb-3 flex items-center gap-2 ${
              theme === 'dark' ? 'text-slate-300 border-slate-850' : 'text-slate-800 border-slate-100'
            }`}>
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              Naming Rules
            </h3>

            {/* Pattern Input */}
            <div className="space-y-2">
              <label className={`text-xs font-bold block ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-650'
              }`}>
                Định dạng tên báo cáo Excel xuất ra
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
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-bold font-mono outline-none transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                    : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-850 shadow-inner bg-slate-50/20'
                }`}
              />
            </div>

            {/* Date format select */}
            <div className="space-y-2">
              <label className={`text-xs font-bold block ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-650'
              }`}>
                Định dạng Biến ngày {'{date}'}
              </label>
              <select
                value={formData.output.date_format}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    output: { ...prev.output, date_format: e.target.value },
                  }))
                }
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-slate-950 border-slate-850 hover:border-slate-700 focus:border-cyan-500 text-slate-200'
                    : 'bg-white border-slate-200 hover:border-slate-350 focus:border-cyan-500 text-slate-850 shadow-inner bg-slate-50/20'
                }`}
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

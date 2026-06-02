import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Profile } from '../../types';
import ProfileList from './ProfileList';
import ProfileForm from './ProfileForm';
import MappingEditor from '../MappingEditor';
import { useProfileStore } from '../../stores/profileStore';
import { useTauriCommands } from '../../hooks/useTauriCommands';
import { FileText } from 'lucide-react';

export default function ProfileManager() {
  const { t } = useTranslation();
  const [view, setView] = useState<'list' | 'form' | 'mapping'>('list');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const { selectProfile } = useProfileStore();
  const { getAppConfig } = useTauriCommands();
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

  const handleCreate = () => {
    setEditingProfile(null);
    setView('form');
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setView('form');
  };

  const handleEditMappings = async (profile: Profile) => {
    await selectProfile(profile.id);
    setView('mapping');
  };

  const handleDuplicate = (profile: Profile) => {
    const duplicated: Profile = JSON.parse(JSON.stringify(profile));
    duplicated.id = ''; 
    duplicated.name = `${duplicated.name}_Copy`;
    duplicated.method_code = `${duplicated.method_code}_copy`;
    duplicated.created_at = '';
    duplicated.updated_at = '';

    setEditingProfile(duplicated);
    setView('form');
  };

  const handleSave = () => {
    setView('list');
    setEditingProfile(null);
  };

  const handleCancel = () => {
    setView('list');
    setEditingProfile(null);
  };

  if (view === 'mapping') {
    return <MappingEditor onClose={handleCancel} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Dynamic View rendering */}
      {view === 'list' ? (
        <div className="space-y-8">
          {/* Header */}
          <div className={`border-b pb-6 flex flex-col md:flex-row md:items-center md:justify-between ${
            theme === 'dark' ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-3.5">
              <div className={`p-3 rounded-2xl ${
                theme === 'dark' ? 'bg-slate-900 text-indigo-400' : 'bg-white text-indigo-650 shadow-sm border border-slate-100'
              }`}>
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h2 className={`text-2xl font-black tracking-tight ${
                  theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  {t('profile.title')}
                </h2>
                <p className={`text-sm mt-1 leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Create, duplicate, edit, and delete configuration profiles for laboratory reports.
                </p>
              </div>
            </div>
          </div>

          <ProfileList
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onEditMappings={handleEditMappings}
            onCreate={handleCreate}
          />
        </div>
      ) : (
        <ProfileForm
          initialProfile={editingProfile}
          onCancel={handleCancel}
          onSave={handleSave}
        />
      )}

    </div>
  );
}

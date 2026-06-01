import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Profile } from '../../types';
import ProfileList from './ProfileList';
import ProfileForm from './ProfileForm';
import MappingEditor from '../MappingEditor';
import { useProfileStore } from '../../stores/profileStore';
import { FileText } from 'lucide-react';

export default function ProfileManager() {
  const { t } = useTranslation();
  const [view, setView] = useState<'list' | 'form' | 'mapping'>('list');
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const { selectProfile } = useProfileStore();

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
    // Clone profile configuration
    const duplicated: Profile = JSON.parse(JSON.stringify(profile));
    duplicated.id = ''; // Clear ID so it registers as a new profile on save
    duplicated.name = `${duplicated.name}_Copy`;
    
    // Append copy suffix to method code to maintain uniqueness
    duplicated.method_code = `${duplicated.method_code}_copy`;
    
    // Set timestamp values as blank so Rust generates fresh ones
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
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <FileText className="w-7 h-7 text-indigo-400" />
              {t('profile.title')}
            </h2>
            <p className="text-sm text-slate-400">
              Create, duplicate, edit, and delete configuration profiles for laboratory reports.
            </p>
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

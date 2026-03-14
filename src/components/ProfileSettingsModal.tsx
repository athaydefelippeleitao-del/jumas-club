import React, { useState } from 'react';
import { X, User, Mail, Lock, Shield, Loader2, Save, Settings as SettingsIcon, Users, ChevronRight, LogOut, Book, Plus, MapPin, Calendar, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUserManagement: () => void;
  onOpenCategoryManagement: () => void;
  onOpenArtistManagement: () => void;
  onOpenAddSongbook: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onOpenUserManagement,
  onOpenCategoryManagement,
  onOpenArtistManagement,
  onOpenAddSongbook
}) => {
  const { user, login, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [city, setCity] = useState(user?.city || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'A imagem deve ter no máximo 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
        setMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          username, 
          email,
          city, 
          age: age ? parseInt(age) : null, 
          photoUrl,
          password: password || undefined 
        })
      });

      const data = await res.json();

      if (res.ok) {
        login(data.user);
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        setPassword('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar perfil' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-bg-elevated rounded-3xl shadow-2xl overflow-hidden border border-border-color flex flex-col max-h-[85vh] sm:max-h-[80vh]"
        >
          <div className="p-6 border-b border-border-color flex items-center justify-between bg-bg-secondary/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-jumas-green/10 text-jumas-green rounded-xl">
                <SettingsIcon size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Perfil e Configurações</h2>
                <p className="text-xs text-text-secondary">Gerencie sua conta e preferências</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <form onSubmit={handleSubmit} className="space-y-4">
              {message && (
                <div className={`p-3 rounded-xl text-sm font-medium ${
                  message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {message.text}
                </div>
              )}

              <div className="flex flex-col items-center gap-4 mb-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-bg-secondary border-2 border-jumas-green/30 flex items-center justify-center">
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setPhotoUrl('')}
                      />
                    ) : (
                      <User size={40} className="text-text-secondary" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                    <Camera size={20} className="text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="w-full space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-xs font-bold text-text-secondary uppercase">Foto do Perfil</label>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] font-bold text-jumas-green uppercase hover:underline"
                    >
                      Upload de Arquivo
                    </button>
                  </div>
                  <div className="relative">
                    <Camera className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                      type="text"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="URL da imagem ou base64"
                      className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase ml-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase ml-1">Nome de Usuário</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase ml-1">Cidade</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Sua cidade"
                      className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase ml-1">Idade</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Sua idade"
                      className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-secondary uppercase ml-1">Nova Senha (opcional)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a atual"
                    className="w-full bg-bg-secondary border border-border-color rounded-xl pl-10 pr-4 py-2.5 text-text-primary focus:ring-2 focus:ring-jumas-green/50 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-jumas-green hover:bg-jumas-green/90 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-jumas-green/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Salvar Alterações
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border-color space-y-6">
              {user?.role === 'admin' && (
                <div>
                  <h3 className="text-xs font-bold text-text-secondary uppercase mb-4 ml-1">Administração</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        onClose();
                        onOpenUserManagement();
                      }}
                      className="w-full flex items-center justify-between p-3.5 bg-jumas-green/5 hover:bg-jumas-green/10 border border-jumas-green/20 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3 text-jumas-green">
                        <Users size={18} />
                        <span className="font-bold text-sm">Gerenciar Contas</span>
                      </div>
                      <Shield size={16} className="text-jumas-green opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenCategoryManagement();
                      }}
                      className="w-full flex items-center justify-between p-3.5 bg-bg-secondary/50 hover:bg-bg-secondary border border-border-color rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3 text-text-primary">
                        <SettingsIcon size={18} />
                        <span className="font-bold text-sm">Gerenciar Categorias</span>
                      </div>
                      <ChevronRight size={16} className="text-text-secondary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenArtistManagement();
                      }}
                      className="w-full flex items-center justify-between p-3.5 bg-bg-secondary/50 hover:bg-bg-secondary border border-border-color rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3 text-text-primary">
                        <User size={18} />
                        <span className="font-bold text-sm">Gerenciar Artistas</span>
                      </div>
                      <ChevronRight size={16} className="text-text-secondary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenAddSongbook();
                      }}
                      className="w-full flex items-center justify-between p-3.5 bg-bg-secondary/50 hover:bg-bg-secondary border border-border-color rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-3 text-text-primary">
                        <Book size={18} />
                        <span className="font-bold text-sm">Novo Cancioneiro</span>
                      </div>
                      <Plus size={16} className="text-text-secondary opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-text-secondary uppercase mb-4 ml-1">Sessão</h3>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-2xl transition-all font-bold text-sm"
                >
                  <LogOut size={18} />
                  Sair da Conta
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

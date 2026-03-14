import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Shield, ShieldAlert, Loader2, Edit2, Check, Mail, MapPin, Calendar, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface User {
  id: number;
  username: string;
  email?: string;
  name: string;
  role: 'admin' | 'user';
  last_active: string;
  city?: string;
  age?: number;
  photoUrl?: string;
}

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  const isOnline = (lastActive: string) => {
    if (!lastActive) return false;
    const lastActiveDate = new Date(lastActive + 'Z'); // SQLite timestamp is UTC
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);
    return diffInMinutes < 5;
  };

  const formatLastActive = (lastActive: string) => {
    if (!lastActive) return 'Nunca';
    const lastActiveDate = new Date(lastActive + 'Z');
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Agora mesmo';
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    return lastActiveDate.toLocaleDateString('pt-BR');
  };

  const toggleRole = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    handleUpdate(user.id, { ...user, role: newRole });
  };

  const handleUpdate = async (id: number, data: Partial<User>) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === id ? { ...u, ...data } : u));
        setEditingId(null);
      }
    } catch (error) {
      console.error('Failed to update user', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const startEditing = (user: User) => {
    setEditingId(user.id);
    setEditForm(user);
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
          className="relative w-full max-w-2xl bg-bg-elevated rounded-3xl shadow-2xl overflow-hidden border border-border-color flex flex-col max-h-[85vh] sm:max-h-[70vh]"
        >
          <div className="p-6 border-b border-border-color flex items-center justify-between bg-bg-secondary/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-jumas-green/10 text-jumas-green rounded-xl">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Gerenciar Usuários</h2>
                <p className="text-xs text-text-secondary">Defina quem pode administrar o conteúdo</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="animate-spin text-jumas-green" size={40} />
                <p className="text-text-secondary font-medium">Carregando usuários...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex flex-col p-4 bg-bg-secondary/30 rounded-2xl border border-border-color/50 hover:border-jumas-green/30 transition-all group gap-4"
                  >
                    {editingId === user.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-text-secondary uppercase px-1">Nome</label>
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-text-secondary uppercase px-1">Nome de Usuário</label>
                            <input
                              type="text"
                              value={editForm.username || ''}
                              onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                              className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-text-secondary uppercase px-1">E-mail</label>
                            <input
                              type="email"
                              value={editForm.email || ''}
                              onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                              className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-text-secondary uppercase px-1">Cidade</label>
                            <input
                              type="text"
                              value={editForm.city || ''}
                              onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                              className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-text-secondary uppercase px-1">Idade</label>
                            <input
                              type="number"
                              value={editForm.age || ''}
                              onChange={e => setEditForm({ ...editForm, age: parseInt(e.target.value) })}
                              className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-text-secondary uppercase px-1">Papel</label>
                            <select
                              value={editForm.role}
                              onChange={e => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'user' })}
                              className="w-full bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                            >
                              <option value="user">Usuário</option>
                              <option value="admin">Administrador</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between px-1">
                            <label className="text-[10px] font-bold text-text-secondary uppercase">Foto do Usuário</label>
                            <button 
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-[9px] font-bold text-jumas-green uppercase hover:underline"
                            >
                              Upload
                            </button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div 
                              onClick={() => fileInputRef.current?.click()}
                              className="w-10 h-10 rounded-full overflow-hidden bg-bg-elevated border border-border-color flex-shrink-0 cursor-pointer hover:border-jumas-green transition-colors"
                            >
                              {editForm.photoUrl ? (
                                <img src={editForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-text-secondary">
                                  <Camera size={16} />
                                </div>
                              )}
                            </div>
                            <input
                              type="text"
                              value={editForm.photoUrl || ''}
                              onChange={e => setEditForm({ ...editForm, photoUrl: e.target.value })}
                              placeholder="URL ou base64"
                              className="flex-1 bg-bg-elevated border border-border-color rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-jumas-green/50"
                            />
                          </div>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handlePhotoUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-4 py-2 text-xs font-bold text-text-secondary hover:bg-bg-secondary rounded-xl transition-all"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleUpdate(user.id, editForm)}
                            disabled={updatingId === user.id}
                            className="px-4 py-2 text-xs font-bold bg-jumas-green text-white rounded-xl hover:bg-jumas-green/90 transition-all flex items-center gap-2"
                          >
                            {updatingId === user.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="relative flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center ${user.role === 'admin' ? 'bg-jumas-green/10 text-jumas-green' : 'bg-bg-secondary text-text-secondary'}`}>
                                {user.photoUrl ? (
                                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <UserIcon size={24} />
                                )}
                              </div>
                              <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-bg-elevated ${isOnline(user.last_active) ? 'bg-green-500' : 'bg-gray-400'}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-text-primary truncate">{user.name}</h3>
                                {isOnline(user.last_active) && (
                                  <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider flex-shrink-0">Online</span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <p className="text-sm text-text-secondary truncate flex items-center gap-1">
                                  <UserIcon size={12} /> {user.username}
                                </p>
                                {user.email && (
                                  <p className="text-xs text-text-secondary/80 flex items-center gap-1">
                                    <Mail size={12} /> {user.email}
                                  </p>
                                )}
                                {user.city && (
                                  <p className="text-xs text-text-secondary/80 flex items-center gap-1">
                                    <MapPin size={12} /> {user.city}
                                  </p>
                                )}
                                {user.age && (
                                  <p className="text-xs text-text-secondary/80 flex items-center gap-1">
                                    <Calendar size={12} /> {user.age} anos
                                  </p>
                                )}
                              </div>
                              <p className="text-[10px] text-text-secondary/60 mt-0.5">
                                Visto por último: {formatLastActive(user.last_active)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border-color/30">
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              user.role === 'admin' 
                                ? 'bg-jumas-green/10 text-jumas-green' 
                                : 'bg-bg-secondary text-text-secondary'
                            }`}>
                              {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditing(user)}
                                className="p-2 text-text-secondary hover:text-jumas-green hover:bg-jumas-green/10 rounded-xl transition-all"
                                title="Editar usuário"
                              >
                                <Edit2 size={20} />
                              </button>
                              <button
                                onClick={() => toggleRole(user)}
                                disabled={updatingId === user.id}
                                className={`p-2 rounded-xl transition-all ${
                                  user.role === 'admin'
                                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                    : 'text-jumas-green hover:bg-jumas-green/10'
                                }`}
                                title={user.role === 'admin' ? "Remover privilégios" : "Tornar administrador"}
                              >
                                {updatingId === user.id ? (
                                  <Loader2 className="animate-spin" size={20} />
                                ) : user.role === 'admin' ? (
                                  <ShieldAlert size={20} />
                                ) : (
                                  <Shield size={20} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-bg-secondary/30 border-t border-border-color text-center">
            <p className="text-xs text-text-secondary">
              Administradores podem criar, editar e excluir qualquer conteúdo do aplicativo.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

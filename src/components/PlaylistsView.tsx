import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Share2, X, Music, Calendar, GripVertical, ListMusic } from 'lucide-react';

interface Playlist {
  id: string;
  name: string;
  description?: string;
  date?: string;
  shareId: string;
}

interface PlaylistSong {
  id: string;
  title: string;
  category: string;
  artistId?: string;
  position: number;
}

interface PlaylistsViewProps {
  onSelectPlaylist: (id: string) => void;
  selectedPlaylistId: string | null;
  songs: any[];
  artists: any[];
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({ onSelectPlaylist, selectedPlaylistId, songs, artists }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [newPlaylistDate, setNewPlaylistDate] = useState('');

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data.playlists.map((p: any) => ({ ...p, id: p.id.toString() })));
      }
    } catch (error) {
      console.error('Failed to fetch playlists', error);
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName) return;

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlaylistName,
          description: newPlaylistDesc,
          date: newPlaylistDate || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setPlaylists(prev => [{...data.playlist, id: data.playlist.id.toString()}, ...prev]);
        setIsCreateModalOpen(false);
        setNewPlaylistName('');
        setNewPlaylistDesc('');
        setNewPlaylistDate('');
      }
    } catch (error) {
      console.error('Failed to create playlist', error);
    }
  };

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta lista?')) return;

    try {
      const res = await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPlaylists(prev => prev.filter(p => p.id !== id));
        if (selectedPlaylistId === id) {
          onSelectPlaylist('');
        }
      }
    } catch (error) {
      console.error('Failed to delete playlist', error);
    }
  };

  const handleCreateFavoritesPlaylist = async () => {
    try {
      const res = await fetch('/api/playlists/create-favorites', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setPlaylists(prev => [{...data.playlist, id: data.playlist.id.toString()}, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create favorites playlist', error);
    }
  };

  const handleShare = (shareId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/playlist/${shareId}`;
    navigator.clipboard.writeText(url);
    alert('Link copiado para a área de transferência!');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-color flex justify-between items-center">
        <h2 className="font-bold text-lg text-text-primary">Minhas Playlists</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCreateFavoritesPlaylist}
            className="p-2 bg-bg-secondary text-text-primary rounded-xl hover:bg-bg-elevated border border-border-color transition-colors"
            title="Criar Playlist de Favoritas"
          >
            <Music size={20} />
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="p-2 bg-jumas-green text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {playlists.length === 0 ? (
          <div className="text-center text-text-secondary py-12">
            <ListMusic size={48} className="mx-auto mb-4 opacity-20" />
            <p>Você ainda não tem nenhuma playlist.</p>
            <p className="text-sm mt-2">Crie uma para organizar suas músicas favoritas!</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {playlists.map(playlist => (
              <div
                key={playlist.id}
                onClick={() => onSelectPlaylist(playlist.id)}
                role="button"
                tabIndex={0}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedPlaylistId === playlist.id
                    ? 'bg-jumas-green/10 border-jumas-green/30'
                    : 'bg-bg-elevated border-border-color hover:border-jumas-green/30'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-text-primary text-lg">{playlist.name}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleShare(playlist.shareId, e)}
                      className="p-1.5 text-text-secondary hover:text-jumas-green rounded-lg transition-colors"
                      title="Compartilhar"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDeletePlaylist(playlist.id, e)}
                      className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {playlist.description && (
                  <p className="text-sm text-text-secondary mb-2 line-clamp-2">{playlist.description}</p>
                )}
                {playlist.date && (
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                    <Calendar size={14} />
                    {new Date(playlist.date).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-elevated rounded-3xl p-6 shadow-2xl border border-border-color"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-text-primary">Nova Playlist</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-text-secondary hover:text-text-primary">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreatePlaylist} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Nome da Playlist *</label>
                  <input
                    type="text"
                    required
                    value={newPlaylistName}
                    onChange={e => setNewPlaylistName(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-color rounded-xl px-4 py-2.5 focus:outline-none focus:border-jumas-green"
                    placeholder="Ex: Músicas Favoritas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Data (Opcional)</label>
                  <input
                    type="date"
                    value={newPlaylistDate}
                    onChange={e => setNewPlaylistDate(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-color rounded-xl px-4 py-2.5 focus:outline-none focus:border-jumas-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Descrição (Opcional)</label>
                  <textarea
                    value={newPlaylistDesc}
                    onChange={e => setNewPlaylistDesc(e.target.value)}
                    className="w-full bg-bg-secondary border border-border-color rounded-xl px-4 py-2.5 focus:outline-none focus:border-jumas-green resize-none h-24"
                    placeholder="Detalhes sobre a playlist..."
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-jumas-green text-white rounded-xl font-bold hover:bg-green-700 transition-colors mt-2"
                >
                  Criar Playlist
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

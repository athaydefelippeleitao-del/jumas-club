import React, { useState, useEffect } from 'react';
import { categories as initialCategories, songs as initialSongs, songbooks as initialSongbooks } from '../data/mockData';
import { ChevronLeft, Search, Music, Plus, Trash2, ChevronDown, Book, Edit2, ChevronRight, Home, Heart, FileText, X, List, ExternalLink, Minus, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AddSongModal } from './AddSongModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DeleteSongbookConfirmModal } from './DeleteSongbookConfirmModal';
import { AddSongbookModal } from './AddSongbookModal';
import { ManageCategoriesModal } from './ManageCategoriesModal';
import { ManageArtistsModal } from './ManageArtistsModal';
import { PdfViewer } from './PdfViewer';
import { Header } from './Header';
import { UserManagementModal } from './UserManagementModal';
import { AdminSettingsModal } from './AdminSettingsModal';
import { ProfileView } from './ProfileView';
import { Tuner } from './Tuner';
import { PlaylistsView } from './PlaylistsView';
import { AcademyView } from './AcademyView';
import { Settings, User, ShieldCheck, Volume2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { renderSongContent, extractChords } from '../utils/chordParser';
import { ChordDiagrams } from './ChordDiagrams';

export const Songbook: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [songbooks, setSongbooks] = useState<{id: string, name: string, image?: string, pdfUrl?: string}[]>([]);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [artists, setArtists] = useState<{id: string, name: string, photoUrl?: string, biography?: string}[]>([]);
  const [songs, setSongs] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sbRes, artRes, songRes] = await Promise.all([
          fetch('/api/songbooks'),
          fetch('/api/artists'),
          fetch('/api/songs')
        ]);
        
        if (sbRes.ok) {
          const data = await sbRes.json();
          setSongbooks(data.songbooks.map((sb: any) => ({ ...sb, id: sb.id.toString() })));
        }
        if (artRes.ok) {
          const data = await artRes.json();
          setArtists(data.artists.map((a: any) => ({ ...a, id: a.id.toString() })));
        }
        if (songRes.ok) {
          const data = await songRes.json();
          setSongs(data.songs.map((s: any) => ({ 
            ...s, 
            id: s.id.toString(), 
            songbookId: s.songbookId.toString(),
            artistId: s.artistId ? s.artistId.toString() : null,
            isFavorite: !!s.isFavorite
          })));
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };
    fetchData();
  }, []);

  const [activeSongbookId, setActiveSongbookId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [selectedArtistProfileId, setSelectedArtistProfileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSongbookModalOpen, setIsAddSongbookModalOpen] = useState(false);
  const [songbookToEdit, setSongbookToEdit] = useState<{id: string, name: string, image?: string, pdfUrl?: string} | null>(null);
  const [songToDelete, setSongToDelete] = useState<{id: string, title: string} | null>(null);
  const [songToEdit, setSongToEdit] = useState<any>(null);
  const [songbookToDelete, setSongbookToDelete] = useState<{id: string, name: string, songCount: number} | null>(null);
  const [isGlobalSearchActive, setIsGlobalSearchActive] = useState(false);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [isFavoritesActive, setIsFavoritesActive] = useState(false);
  const [isProfileActive, setIsProfileActive] = useState(false);
  const [isPdfActive, setIsPdfActive] = useState(false);
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState(false);
  const [isManageArtistsModalOpen, setIsManageArtistsModalOpen] = useState(false);
  const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
  const [isAdminSettingsModalOpen, setIsAdminSettingsModalOpen] = useState(false);
  const [isTunerActive, setIsTunerActive] = useState(false);
  const [isAcademyActive, setIsAcademyActive] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [activeChord, setActiveChord] = useState<string | null>(null);

  useEffect(() => {
    setActiveChord(null);
  }, [selectedSongId]);

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Derive categories for the active songbook or favorites
  const currentSongs = isFavoritesActive 
    ? songs.filter(s => s.isFavorite)
    : songs.filter(s => s.songbookId === activeSongbookId);
    
  const currentCategories = Array.from(new Set(currentSongs.map(s => s.category)));
  const displayCategories = categories.filter(c => currentCategories.includes(c));
  const customCategories = currentCategories.filter(c => !categories.includes(c)).sort();
  const finalCategories = ['Todos', ...displayCategories, ...customCategories];

  useEffect(() => {
    if (activeSongbookId || isFavoritesActive) {
      if (finalCategories.length > 0 && !finalCategories.includes(activeCategory)) {
        setActiveCategory('Todos');
      } else if (finalCategories.length === 0) {
        setActiveCategory('Todos');
      }
    }
  }, [activeSongbookId, isFavoritesActive, songs]);

  const handleAddOrEditSongbook = async (newSongbook: { id: string; name: string; image?: string; pdfUrl?: string }, importedSongs?: any[]) => {
    console.log('Handling songbook:', newSongbook, 'Imported songs count:', importedSongs?.length);
    try {
      if (songbookToEdit) {
        const res = await fetch(`/api/songbooks/${newSongbook.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSongbook)
        });
        if (res.ok) {
          setSongbooks(prev => prev.map(sb => sb.id === newSongbook.id ? newSongbook : sb));
          alert('Cancioneiro atualizado com sucesso!');
        } else {
          const data = await res.json();
          alert(data.error || 'Erro ao atualizar cancioneiro');
        }
      } else {
        const res = await fetch('/api/songbooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSongbook)
        });
        if (res.ok) {
          const data = await res.json();
          const createdSb = { ...data.songbook, id: data.songbook.id.toString() };
          setSongbooks(prev => [...prev, createdSb]);
          
          // Automatically select the new songbook
          setActiveSongbookId(createdSb.id);
          setSearchQuery('');
          
          // If it has a PDF and no songs are being imported, show the PDF view
          if (createdSb.pdfUrl && (!importedSongs || importedSongs.length === 0)) {
            setIsPdfActive(true);
          } else {
            setIsPdfActive(false);
          }
          
          if (importedSongs && importedSongs.length > 0) {
            for (const s of importedSongs) {
              await fetch('/api/songs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...s, songbookId: createdSb.id })
              });
            }
            // Refresh songs
            const songRes = await fetch('/api/songs');
            if (songRes.ok) {
              const songData = await songRes.json();
              setSongs(songData.songs.map((s: any) => ({ 
                ...s, 
                id: s.id.toString(), 
                songbookId: s.songbookId.toString(),
                artistId: s.artistId?.toString(),
                isFavorite: !!s.isFavorite
              })));
            }
          }
          alert('Cancioneiro criado com sucesso!');
        } else {
          const data = await res.json();
          alert(data.error || 'Erro ao criar cancioneiro');
        }
      }
    } catch (error) {
      console.error('Failed to handle songbook', error);
      alert('Erro de conexão ao salvar cancioneiro');
    }
    
    setSongbookToEdit(null);
  };

  const handleAddSong = async (newSong: { id?: string; title: string; category: string; number: number; content: string; songbookId: string; artistId?: string; imageUrl?: string; videoUrl?: string }) => {
    try {
      if (newSong.id) {
        // Edit existing song
        const res = await fetch(`/api/songs/${newSong.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSong)
        });
        
        if (res.ok) {
          setSongs(prev => prev.map(s => s.id === newSong.id ? { ...s, ...newSong } : s));
          
          if (!categories.includes(newSong.category)) {
            setCategories(prev => [...prev, newSong.category]);
          }
        } else {
          alert('Erro ao editar cifra');
        }
      } else {
        // Add new song
        const res = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSong)
        });
        
        if (res.ok) {
          const data = await res.json();
          const songEntry = {
            ...data.song,
            id: data.song.id.toString(),
            songbookId: data.song.songbookId.toString(),
            artistId: data.song.artistId ? data.song.artistId.toString() : null,
            isFavorite: !!data.song.isFavorite,
            videoUrl: data.song.videoUrl
          };
          
          setSongs(prev => [...prev, songEntry].sort((a, b) => a.number - b.number));
          
          if (!categories.includes(newSong.category)) {
            setCategories(prev => [...prev, newSong.category]);
          }
          
          setActiveSongbookId(songEntry.songbookId);
          setActiveCategory(songEntry.category);
          setSelectedSongId(songEntry.id);
          setSelectedArtistProfileId(null);
        } else {
          alert('Erro ao adicionar cifra');
        }
      }
    } catch (error) {
      console.error('Failed to save song', error);
      alert('Erro de conexão ao salvar cifra');
    }
    setSongToEdit(null);
  };

  const handleDeleteSong = async (id: string) => {
    try {
      const res = await fetch(`/api/songs/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSongs(prev => prev.filter(s => s.id !== id));
        if (selectedSongId === id) {
          setSelectedSongId(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete song', error);
    }
  };

  const toggleFavorite = async (id: string) => {
    try {
      const res = await fetch(`/api/songs/${id}/favorite`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSongs(prev => prev.map(s => s.id === id ? { ...s, isFavorite: data.isFavorite } : s));
      } else if (res.status === 401) {
        alert('Você precisa estar logado para favoritar músicas.');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao favoritar música');
      }
    } catch (error) {
      console.error('Failed to toggle favorite', error);
      alert('Erro de conexão ao favoritar música');
    }
  };

  const filteredSongs = songs.filter(s => {
    if (isFavoritesActive && selectedPlaylistId) {
      // If a playlist is selected, we don't filter songs here.
      // The PlaylistsView handles its own song filtering/display.
      return false;
    }

    const songbook = songbooks.find(sb => sb.id === s.songbookId);
    const artist = artists.find(a => a.id === s.artistId);
    
    const query = searchQuery.toLowerCase();
    const matchesSearch = s.title.toLowerCase().includes(query) || 
                          s.number.toString().includes(query) ||
                          (songbook && songbook.name.toLowerCase().includes(query)) ||
                          (artist && artist.name.toLowerCase().includes(query));
    
    const matchesCategory = activeCategory === 'Todos' || s.category === activeCategory;

    if (isGlobalSearchActive) return matchesSearch;
    if (isFavoritesActive) return s.isFavorite && matchesCategory && matchesSearch;
    
    const matchesSongbook = s.songbookId === activeSongbookId;
    
    if (searchQuery) return matchesSearch && matchesSongbook;
    return matchesSongbook && matchesCategory;
  });

  const filteredArtists = isGlobalSearchActive && searchQuery
    ? artists.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleNextSong = () => {
    if (!selectedSongId || filteredSongs.length <= 1) return;
    const currentIndex = filteredSongs.findIndex(s => s.id === selectedSongId);
    const nextIndex = (currentIndex + 1) % filteredSongs.length;
    setSelectedSongId(filteredSongs[nextIndex].id);
  };

  const handlePrevSong = () => {
    if (!selectedSongId || filteredSongs.length <= 1) return;
    const currentIndex = filteredSongs.findIndex(s => s.id === selectedSongId);
    const prevIndex = (currentIndex - 1 + filteredSongs.length) % filteredSongs.length;
    setSelectedSongId(filteredSongs[prevIndex].id);
  };

  const selectedSong = songs.find(s => s.id === selectedSongId);
  const activeSongbook = songbooks.find(sb => sb.id === activeSongbookId);
  const selectedArtist = selectedSong?.artistId ? artists.find(a => a.id === selectedSong?.artistId) : null;
  const selectedArtistProfile = artists.find(a => a.id === selectedArtistProfileId);

  const resetToHome = () => {
    setActiveSongbookId(null);
    setSelectedSongId(null);
    setSelectedArtistProfileId(null);
    setSearchQuery('');
    setIsGlobalSearchActive(false);
    setIsFavoritesActive(false);
    setIsProfileActive(false);
    setIsPdfActive(false);
    setIsTunerActive(false);
    setIsAcademyActive(false);
    setIsHeaderSearchOpen(false);
  };

  const BottomNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border-color px-2 py-2 flex items-center justify-around z-50 transition-transform duration-300 translate-y-0">
      <button 
        onClick={resetToHome}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${!activeSongbookId && !isGlobalSearchActive && !isFavoritesActive && !isProfileActive && !isAcademyActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {!activeSongbookId && !isGlobalSearchActive && !isFavoritesActive && !isProfileActive && !isAcademyActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <Home size={24} />
        <span className="text-[10px] font-medium">Início</span>
      </button>

      <button 
        onClick={() => {
          setIsFavoritesActive(true);
          setActiveCategory('Todos');
          setSelectedPlaylistId(null);
          setIsGlobalSearchActive(false);
          setIsProfileActive(false);
          setIsPdfActive(false);
          setIsTunerActive(false);
          setIsAcademyActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setSearchQuery('');
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isFavoritesActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isFavoritesActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <Heart size={24} />
        <span className="text-[10px] font-medium">Favoritas</span>
      </button>

      <button 
        onClick={() => {
          setIsTunerActive(true);
          setIsFavoritesActive(false);
          setIsGlobalSearchActive(false);
          setIsProfileActive(false);
          setIsPdfActive(false);
          setIsAcademyActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setSearchQuery('');
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isTunerActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isTunerActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <Volume2 size={24} />
        <span className="text-[10px] font-medium">Afinador</span>
      </button>
      
      <button 
        onClick={() => {
          setIsGlobalSearchActive(true);
          setIsFavoritesActive(false);
          setIsProfileActive(false);
          setIsPdfActive(false);
          setIsTunerActive(false);
          setIsAcademyActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setIsHeaderSearchOpen(true);
          setSearchQuery('');
          setTimeout(() => {
            const searchInput = document.querySelector('input[placeholder*="quer tocar"]');
            if (searchInput instanceof HTMLInputElement) {
              searchInput.focus();
            }
          }, 100);
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isGlobalSearchActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isGlobalSearchActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <Search size={24} />
        <span className="text-[10px] font-medium">Busca</span>
      </button>

      <button 
        onClick={() => {
          setIsAcademyActive(true);
          setIsGlobalSearchActive(false);
          setIsFavoritesActive(false);
          setIsProfileActive(false);
          setIsPdfActive(false);
          setIsTunerActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setIsHeaderSearchOpen(false);
          setSearchQuery('');
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isAcademyActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isAcademyActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <Book size={24} />
        <span className="text-[10px] font-medium">Academy</span>
      </button>

      <button 
        onClick={() => {
          setIsProfileActive(true);
          setIsGlobalSearchActive(false);
          setIsFavoritesActive(false);
          setIsPdfActive(false);
          setIsTunerActive(false);
          setIsAcademyActive(false);
          setActiveSongbookId(null);
          setSelectedSongId(null);
          setSelectedArtistProfileId(null);
          setIsHeaderSearchOpen(false);
          setSearchQuery('');
        }}
        className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all relative ${isProfileActive ? 'text-jumas-green' : 'text-text-secondary'}`}
      >
        {isProfileActive && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-jumas-green" />
        )}
        <User size={24} />
        <span className="text-[10px] font-medium">Mais</span>
      </button>
    </div>
  );

  const renderModals = () => (
    <>
      <AddSongModal 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setSongToEdit(null);
        }} 
        onAdd={handleAddSong}
        categories={categories}
        songbooks={songbooks}
        activeSongbookId={activeSongbookId || songbooks[0]?.id || ''}
        artists={artists}
        editData={songToEdit}
      />

      <AddSongbookModal
        isOpen={isAddSongbookModalOpen}
        onClose={() => {
          setIsAddSongbookModalOpen(false);
          setSongbookToEdit(null);
        }}
        onAdd={handleAddOrEditSongbook}
        editData={songbookToEdit}
      />

      <DeleteConfirmModal
        isOpen={!!songToDelete}
        onClose={() => setSongToDelete(null)}
        onConfirm={() => songToDelete && handleDeleteSong(songToDelete.id)}
        songTitle={songToDelete?.title || ''}
      />

      <DeleteSongbookConfirmModal 
        isOpen={!!songbookToDelete}
        onClose={() => setSongbookToDelete(null)}
        songbookName={songbookToDelete?.name || ''}
        songCount={songbookToDelete?.songCount || 0}
        onConfirm={async () => {
          if (songbookToDelete) {
            try {
              const res = await fetch(`/api/songbooks/${songbookToDelete.id}`, { method: 'DELETE' });
              if (res.ok) {
                setSongbooks(prev => prev.filter(item => item.id !== songbookToDelete.id));
                setSongs(prev => prev.filter(s => s.songbookId !== songbookToDelete.id));
              }
            } catch (error) {
              console.error('Failed to delete songbook', error);
            }
          }
        }}
      />

      <ManageCategoriesModal
        isOpen={isManageCategoriesModalOpen}
        onClose={() => setIsManageCategoriesModalOpen(false)}
        categories={categories}
        onUpdateCategories={setCategories}
        songs={songs}
        onUpdateSongs={setSongs}
      />

      <ManageArtistsModal
        isOpen={isManageArtistsModalOpen}
        onClose={() => setIsManageArtistsModalOpen(false)}
        artists={artists}
        onUpdateArtists={setArtists}
        songs={songs}
        onUpdateSongs={setSongs}
      />

      <UserManagementModal
        isOpen={isManageUsersModalOpen}
        onClose={() => setIsManageUsersModalOpen(false)}
      />

      <AdminSettingsModal
        isOpen={isAdminSettingsModalOpen}
        onClose={() => setIsAdminSettingsModalOpen(false)}
      />
    </>
  );

  if (isAcademyActive) {
    return (
      <>
        <Header 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isHeaderSearchOpen}
          onSearchOpenChange={setIsHeaderSearchOpen}
          onOpenProfile={() => {
            setIsProfileActive(true);
            setIsAcademyActive(false);
            setIsHeaderSearchOpen(false);
            setIsTunerActive(false);
          }}
          onLogoClick={resetToHome}
          showSearch={false}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AcademyView />
        </div>
        <BottomNav />
        {renderModals()}
      </>
    );
  }

  if (isProfileActive) {
    return (
      <>
        <Header 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearchOpen={isHeaderSearchOpen}
          onSearchOpenChange={setIsHeaderSearchOpen}
          onOpenProfile={() => {
            setIsProfileActive(true);
            setIsHeaderSearchOpen(false);
            setIsTunerActive(false);
          }}
          onLogoClick={resetToHome}
          showSearch={false}
        />
        <div className="flex-1 container mx-auto max-w-7xl p-4 md:p-6 overflow-y-auto">
          <ProfileView 
            onOpenUserManagement={() => setIsManageUsersModalOpen(true)}
            onOpenCategoryManagement={() => setIsManageCategoriesModalOpen(true)}
            onOpenArtistManagement={() => setIsManageArtistsModalOpen(true)}
            onOpenAddSongbook={() => setIsAddSongbookModalOpen(true)}
            onOpenAdminSettings={() => setIsAdminSettingsModalOpen(true)}
          />
        </div>
        <BottomNav />
        {renderModals()}
      </>
    );
  }



  if (!activeSongbookId && !isGlobalSearchActive && !isFavoritesActive && !isProfileActive && !isTunerActive && !isAcademyActive) {
    return (
      <>
        <Header 
          searchQuery={searchQuery}
          onSearchChange={(query) => {
            setSearchQuery(query);
            if (query.trim() !== '') {
              setIsGlobalSearchActive(true);
              setIsTunerActive(false);
            }
          }}
          isSearchOpen={isHeaderSearchOpen}
          onSearchOpenChange={setIsHeaderSearchOpen}
          onOpenProfile={() => {
            setIsProfileActive(true);
            setIsHeaderSearchOpen(false);
            setIsTunerActive(false);
          }}
          onLogoClick={resetToHome}
          showSearch={true}
        />
        <div className="flex-1 container mx-auto max-w-7xl p-4 md:p-6 overflow-y-auto pb-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Histórico</h1>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button 
                  onClick={() => {
                    setSongbookToEdit(null);
                    setIsAddSongbookModalOpen(true);
                  }}
                  className="p-3 bg-jumas-green text-white rounded-2xl shadow-lg shadow-jumas-green/20 active:scale-95 transition-all"
                  title="Novo Cancioneiro"
                >
                  <Plus size={24} />
                </button>
              )}
            </div>
          </div>

          {songbooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center px-6">
              <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Book size={32} className="text-text-secondary opacity-20" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">
                {isAdmin ? 'Comece seu Cancioneiro' : 'Nenhum cancioneiro disponível'}
              </h3>
              <p className="text-text-secondary text-sm max-w-xs mb-8 leading-relaxed">
                {isAdmin 
                  ? 'Você ainda não criou nenhum cancioneiro. Adicione o seu primeiro para começar a organizar suas cifras e PDFs!' 
                  : 'Entre em contato com um administrador para adicionar novos cancioneiros ao sistema.'}
              </p>
              {isAdmin && (
                <button 
                  onClick={() => {
                    setSongbookToEdit(null);
                    setIsAddSongbookModalOpen(true);
                  }}
                  className="px-8 py-3.5 bg-jumas-green text-white rounded-2xl font-bold shadow-lg shadow-jumas-green/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  Criar Primeiro Cancioneiro
                </button>
              )}
            </div>
          )}
        
          <div className="flex flex-col gap-2">
          {songbooks.filter(sb => sb.name.toLowerCase().includes(searchQuery.toLowerCase())).map(sb => {
            const songCount = songs.filter(s => s.songbookId === sb.id).length;
            return (
              <motion.div 
                key={sb.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative group"
              >
                <button 
                  onClick={() => {
                    setActiveSongbookId(sb.id);
                    setIsTunerActive(false);
                    if (songCount === 0 && sb.pdfUrl) {
                      setIsPdfActive(true);
                    } else {
                      setIsPdfActive(false);
                    }
                  }}
                  className="w-full flex items-center gap-4 p-3 bg-bg-elevated rounded-2xl border border-border-color hover:border-jumas-green/30 transition-all"
                >
                  <div className="w-14 h-14 rounded-xl bg-bg-secondary overflow-hidden flex-shrink-0 border border-border-color flex items-center justify-center">
                    {sb.image ? (
                      <img src={sb.image} alt={sb.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-jumas-green bg-jumas-green/10">
                        <Book size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-bold text-base text-text-primary truncate">{sb.name}</h3>
                    <p className="text-xs text-text-secondary mt-0.5">{songCount} {songCount === 1 ? 'música' : 'músicas'}</p>
                  </div>
                </button>
                {isAdmin && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSongbookToEdit(sb);
                        setIsAddSongbookModalOpen(true);
                      }}
                      className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-jumas-green border border-border-color"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSongbookToDelete({
                          id: sb.id,
                          name: sb.name,
                          songCount: songCount
                        });
                      }}
                      className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-red-500 border border-border-color"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
          
          {isAdmin && (
            <motion.button
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setSongbookToEdit(null);
                setIsAddSongbookModalOpen(true);
              }}
              className="bg-bg-secondary/30 border-2 border-dashed border-border-color p-4 rounded-2xl hover:border-jumas-green hover:bg-jumas-green/5 transition-all flex items-center justify-center gap-4 text-text-secondary hover:text-jumas-green group"
            >
              <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center group-hover:bg-jumas-green/10 transition-colors">
                <Plus size={20} />
              </div>
              <span className="font-bold">Novo Cancioneiro</span>
            </motion.button>
          )}
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => {
              setSongbookToEdit(null);
              setIsAddSongbookModalOpen(true);
            }}
            className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-jumas-green text-white rounded-2xl shadow-2xl shadow-jumas-green/40 flex items-center justify-center z-40 active:scale-90 transition-all"
            aria-label="Novo Cancioneiro"
          >
            <Plus size={32} />
          </button>
        )}
      </div>
      <BottomNav />
      {renderModals()}
      </>
    );
  }

  return (
    <>
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearchOpen={isHeaderSearchOpen}
        onSearchOpenChange={setIsHeaderSearchOpen}
        onOpenProfile={() => {
          setIsProfileActive(true);
          setIsHeaderSearchOpen(false);
          setIsTunerActive(false);
        }}
        onLogoClick={resetToHome}
        showSearch={true}
      />
      <div className="flex-1 flex flex-col md:flex-row container mx-auto max-w-7xl p-0 md:p-6 gap-6 h-[calc(100vh-64px)] overflow-hidden pb-16 md:pb-0">
        {/* Categories Sidebar (Desktop) / Header (Mobile) */}
      <div className={`md:w-64 flex flex-col gap-2 ${selectedSongId || selectedArtistProfileId || isTunerActive || isPdfActive || isFavoritesActive ? 'hidden md:flex' : 'flex'} p-4 md:p-0`}>
        
        {/* Back to Songbooks & Title */}
        <div className="md:px-2 md:pt-2 md:pb-4 md:border-b border-border-color md:mb-2">
          {!isGlobalSearchActive && !isFavoritesActive ? (
            <>
              <button 
                onClick={() => {
                  setActiveSongbookId(null);
                  setSelectedSongId(null);
                  setSelectedArtistProfileId(null);
                  setSearchQuery('');
                  setIsPdfActive(false);
                }}
                className="hidden md:flex items-center gap-2 text-text-secondary hover:text-jumas-green transition-colors mb-4 group"
              >
                <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium text-sm">Cancioneiros</span>
              </button>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-2xl md:text-xl text-text-primary tracking-tight leading-tight line-clamp-2">
                    {activeSongbook?.name}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  {activeSongbook?.pdfUrl && (
                    <button 
                      onClick={() => {
                        setIsPdfActive(!isPdfActive);
                        setSelectedSongId(null);
                        setSelectedArtistProfileId(null);
                      }}
                      className={`p-2 rounded-full transition-colors ${isPdfActive ? 'bg-jumas-green text-white shadow-lg shadow-jumas-green/20' : 'text-text-secondary hover:text-jumas-green bg-bg-secondary md:bg-transparent md:p-1'}`}
                      title={isPdfActive ? "Ver Cifras" : "Ver PDF"}
                    >
                      {isPdfActive ? <Music size={18} /> : <FileText size={18} />}
                    </button>
                  )}
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setSongbookToEdit(activeSongbook || null);
                        setIsAddSongbookModalOpen(true);
                      }}
                      className="text-text-secondary hover:text-jumas-green p-2 bg-bg-secondary rounded-full md:bg-transparent md:p-1 transition-colors"
                      title="Editar Nome/Foto"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : isFavoritesActive ? (
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-2xl md:text-xl text-text-primary tracking-tight leading-tight">
                Músicas Favoritas
              </h2>
              <button 
                onClick={() => {
                  setIsFavoritesActive(false);
                  setSelectedArtistProfileId(null);
                  setSearchQuery('');
                }}
                className="text-text-secondary hover:text-red-500 p-2 bg-bg-secondary rounded-full transition-colors"
                title="Fechar Favoritas"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold text-2xl md:text-xl text-text-primary tracking-tight leading-tight">
                Busca Global
              </h2>
              <button 
                onClick={() => {
                  setIsGlobalSearchActive(false);
                  setSelectedArtistProfileId(null);
                  setSearchQuery('');
                  setIsHeaderSearchOpen(false);
                }}
                className="text-text-secondary hover:text-red-500 p-2 bg-bg-secondary rounded-full transition-colors"
                title="Fechar Busca"
              >
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <button
            onClick={() => {
              setIsFavoritesActive(false);
              setIsGlobalSearchActive(false);
              setIsTunerActive(false);
              setIsPdfActive(false);
              setSelectedSongId(null);
              setSelectedArtistProfileId(null);
              setSearchQuery('');
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${!isFavoritesActive && !isGlobalSearchActive && !isTunerActive ? 'bg-jumas-green/10 text-jumas-green' : 'text-text-secondary hover:bg-bg-secondary'}`}
          >
            <Home size={18} />
            Início
          </button>
          <button
            onClick={() => {
              setIsTunerActive(true);
              setIsFavoritesActive(false);
              setIsGlobalSearchActive(false);
              setIsPdfActive(false);
              setSelectedSongId(null);
              setSelectedArtistProfileId(null);
              setSearchQuery('');
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isTunerActive ? 'bg-jumas-green/10 text-jumas-green' : 'text-text-secondary hover:bg-bg-secondary'}`}
          >
            <Volume2 size={18} />
            Afinador
          </button>
          <button
            onClick={() => {
              setIsFavoritesActive(true);
              setActiveCategory('Todos');
              setSelectedPlaylistId(null);
              setIsTunerActive(false);
              setIsGlobalSearchActive(false);
              setIsPdfActive(false);
              setSelectedSongId(null);
              setSelectedArtistProfileId(null);
              setSearchQuery('');
            }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${isFavoritesActive ? 'bg-jumas-green/10 text-jumas-green' : 'text-text-secondary hover:bg-bg-secondary'}`}
          >
            <Heart size={18} />
            Favoritas
          </button>
        </div>

        {!isGlobalSearchActive && !isTunerActive && (
          <div className="mt-4 md:mt-0">
            <div className="flex items-center justify-between px-2 mb-3">
              <h2 className="font-bold text-xs uppercase tracking-wider text-text-secondary">Categorias</h2>
              <div className="flex items-center gap-1">
                {isAdmin && !isFavoritesActive && (
                  <div className="hidden md:flex items-center gap-1">
                    <button 
                      onClick={() => setIsManageArtistsModalOpen(true)}
                      className="flex items-center gap-1.5 text-text-secondary hover:text-jumas-green p-1.5 hover:bg-bg-secondary rounded-lg transition-all group"
                      title="Gerenciar Artistas"
                    >
                      <User size={16} />
                    </button>
                    <button 
                      onClick={() => setIsManageCategoriesModalOpen(true)}
                      className="flex items-center gap-1.5 text-text-secondary hover:text-jumas-green p-1.5 hover:bg-bg-secondary rounded-lg transition-all group"
                      title="Gerenciar Categorias"
                    >
                      <Settings size={16} />
                    </button>
                    <button 
                      onClick={() => setIsManageUsersModalOpen(true)}
                      className="flex items-center gap-1.5 text-text-secondary hover:text-jumas-green p-1.5 hover:bg-bg-secondary rounded-lg transition-all group"
                      title="Gerenciar Usuários"
                    >
                      <ShieldCheck size={16} />
                    </button>
                  </div>
                )}
                <button 
                  onClick={() => {
                    setIsProfileActive(true);
                    setIsGlobalSearchActive(false);
                    setIsFavoritesActive(false);
                    setIsPdfActive(false);
                    setActiveSongbookId(null);
                    setSelectedSongId(null);
                    setSelectedArtistProfileId(null);
                  }}
                  className="flex items-center gap-1.5 text-text-secondary hover:text-jumas-green p-1.5 hover:bg-bg-secondary rounded-lg transition-all group"
                  title="Meu Perfil"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto md:overflow-y-auto flex md:flex-col flex-row gap-2 pb-2 md:pb-0 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              {finalCategories.map(cat => {
                const isActive = activeCategory === cat && !searchQuery;
                return (
                  <button
                    key={cat}
                    onClick={() => { 
                      setActiveCategory(cat); 
                      setSelectedSongId(null); 
                      setSelectedArtistProfileId(null);
                      setSearchQuery(''); 
                    }}
                    className={`px-5 py-2.5 md:py-3 text-left whitespace-nowrap md:whitespace-normal text-sm md:text-base font-bold rounded-full md:rounded-xl transition-all duration-200 flex-shrink-0 md:flex-shrink border-2 ${
                      isActive
                        ? 'bg-jumas-green text-white border-jumas-green shadow-md shadow-jumas-green/20 scale-[1.02]' 
                        : 'text-text-secondary bg-bg-secondary/50 md:bg-transparent hover:bg-bg-primary hover:shadow-sm border-transparent md:border-transparent hover:border-border-color'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
              {finalCategories.length === 1 && finalCategories[0] === 'Todos' && (
                <div className="px-4 py-3 text-sm text-text-secondary text-center w-full">
                  Nenhuma música.
                </div>
              )}
            </div>
          </div>
        )}
        
        {isAdmin && (
          <div className="pt-4 border-t border-border-color mt-auto">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-jumas-green/10 text-jumas-green hover:bg-jumas-green hover:text-white rounded-xl transition-all font-bold shadow-sm"
            >
              <Plus size={20} />
              Nova Cifra
            </button>
          </div>
        )}
      </div>

      {/* Song List */}
      <div className={`md:w-80 bg-bg-elevated md:rounded-3xl md:border border-border-color md:shadow-sm flex flex-col ${selectedSongId || selectedArtistProfileId || isTunerActive || isPdfActive ? 'hidden md:flex' : 'flex'} flex-1 md:flex-none overflow-hidden relative`}>
        <div className="p-4 border-b border-border-color bg-bg-elevated">
          <div className="relative w-full">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={isGlobalSearchActive ? "Buscar cifra ou artista..." : "Buscar música ou nº..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-2xl md:rounded-xl py-3 md:py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all text-sm md:text-base"
            />
            <div className="absolute right-0 top-0 h-full px-4 flex items-center text-text-secondary">
              <Search size={18} />
            </div>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2 custom-scrollbar bg-bg-secondary/10">
          <AnimatePresence mode="popLayout">
            {filteredArtists.length > 0 && (
              <div className="mb-4">
                <h3 className="px-4 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Artistas</h3>
                <motion.ul className="flex flex-col gap-1.5">
                  {filteredArtists.map((artist, index) => (
                    <motion.li 
                      key={`artist-${artist.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <button
                        onClick={() => {
                          setSelectedArtistProfileId(artist.id);
                          setSelectedSongId(null);
                          setIsPdfActive(false);
                          setIsTunerActive(false);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-2xl md:rounded-xl transition-all duration-200 border flex items-center gap-3 ${
                          selectedArtistProfileId === artist.id 
                            ? 'bg-jumas-green/10 font-bold text-jumas-green border-jumas-green/20 shadow-sm' 
                            : 'text-text-primary bg-bg-elevated md:bg-transparent hover:bg-bg-secondary border-transparent'
                        }`}
                      >
                        {artist.photoUrl ? (
                          <img src={artist.photoUrl} alt={artist.name} className="w-8 h-8 rounded-full object-cover border border-border-color" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-bg-secondary border border-border-color flex items-center justify-center text-text-secondary">
                            <User size={14} />
                          </div>
                        )}
                        <span className="text-sm md:text-base leading-tight truncate font-medium">{artist.name}</span>
                      </button>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            )}

            {(filteredSongs.length > 0 || filteredArtists.length > 0) ? (
              <div className="mb-4">
                {filteredArtists.length > 0 && (
                  <h3 className="px-4 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Músicas</h3>
                )}
                <motion.ul className="flex flex-col gap-1.5 pb-32 md:pb-0">
                  {filteredSongs.map((song, index) => (
                    <motion.li 
                      key={song.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="relative group"
                  >
                    <button
                      onClick={() => {
                        setSelectedSongId(song.id);
                        setIsPdfActive(false);
                        setIsTunerActive(false);
                      }}
                      className={`w-full text-left pl-4 pr-24 py-3 rounded-2xl md:rounded-xl transition-all duration-200 border flex items-center gap-4 ${
                        selectedSongId === song.id 
                          ? 'bg-jumas-green/10 font-bold text-jumas-green border-jumas-green/20 shadow-sm' 
                          : 'text-text-primary bg-bg-elevated md:bg-transparent hover:bg-bg-secondary border-transparent'
                      }`}
                    >
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-bg-secondary overflow-hidden flex-shrink-0 border border-border-color">
                        {song.imageUrl ? (
                          <img src={song.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : artists.find(a => a.id === song.artistId)?.photoUrl ? (
                          <img src={artists.find(a => a.id === song.artistId)?.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-text-secondary opacity-30">
                            <Music size={20} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm md:text-base font-bold text-text-primary truncate">{song.title}</span>
                        <span className="block text-xs text-text-secondary truncate mt-0.5">
                          {artists.find(a => a.id === song.artistId)?.name || 'Artista desconhecido'} • {song.category}
                        </span>
                      </div>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(song.id);
                        }}
                        className={`p-2 transition-colors ${song.isFavorite ? 'text-red-500' : 'text-text-secondary hover:text-red-500'}`}
                        title={song.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Heart size={18} fill={song.isFavorite ? "currentColor" : "none"} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSongToDelete({ id: song.id, title: song.title });
                          }}
                          className={`p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 ${selectedSongId === song.id ? 'opacity-100' : ''}`}
                          aria-label="Excluir cifra"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </motion.li>
                ))}
                </motion.ul>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 text-center text-text-secondary flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-bg-secondary rounded-full flex items-center justify-center mb-4">
                  <Music size={32} className="opacity-20" />
                </div>
                <p className="text-sm font-medium mb-4">Nenhuma música encontrada.</p>
                {activeSongbook?.pdfUrl && (
                  <button
                    onClick={() => {
                      setIsPdfActive(true);
                      setSelectedSongId(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-jumas-green text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-md shadow-jumas-green/20"
                  >
                    <FileText size={18} />
                    Ver PDF Original
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Song Details */}
      <div className={`flex-1 bg-bg-elevated md:rounded-3xl md:border border-border-color md:shadow-sm flex flex-col overflow-hidden ${!selectedSongId && !isPdfActive && !selectedArtistProfileId && !isTunerActive ? 'hidden md:flex' : 'flex'} h-full pb-16 md:pb-0`}>
        <AnimatePresence mode="wait">
          {isTunerActive ? (
            <motion.div
              key="tuner"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <div className="md:hidden p-4 border-b border-border-color bg-bg-elevated/80 backdrop-blur-md flex items-center gap-4 sticky top-0 z-10">
                <button 
                  className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors"
                  onClick={() => setIsTunerActive(false)}
                >
                  <ChevronLeft size={24} />
                </button>
                <h2 className="font-bold text-lg text-text-primary">Afinador</h2>
              </div>
              <Tuner />
            </motion.div>
          ) : isPdfActive && activeSongbook?.pdfUrl ? (
            <motion.div
              key="pdf-viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              <div className="p-4 md:p-6 border-b border-border-color bg-bg-elevated/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <button 
                    className="md:hidden p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors"
                    onClick={() => setIsPdfActive(false)}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-jumas-green/10 text-jumas-green text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        PDF
                      </span>
                    </div>
                    <h2 className="font-bold text-lg md:text-2xl text-text-primary tracking-tight truncate">{activeSongbook.name}</h2>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPdfActive(false)}
                  className="px-4 py-2 bg-bg-secondary text-text-primary hover:bg-jumas-green hover:text-white rounded-xl transition-all font-bold text-sm"
                >
                  Voltar para Cifras
                </button>
              </div>
              <div className="flex-1 bg-bg-secondary/20 relative min-h-[500px]">
                <PdfViewer base64Url={activeSongbook.pdfUrl} />
              </div>
            </motion.div>
          ) : selectedSong ? (
            <motion.div 
              key={selectedSong.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <div className="p-4 md:p-6 border-b border-border-color bg-bg-elevated/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <button 
                    className="md:hidden p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors"
                    onClick={() => setSelectedSongId(null)}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-jumas-green/10 text-jumas-green text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        #{selectedSong.number}
                      </span>
                      <span className="text-[10px] md:text-xs text-text-secondary font-bold uppercase tracking-widest truncate">
                        {artists.find(a => a.id === selectedSong.artistId)?.name || 'Artista desconhecido'} • {selectedSong.category}
                      </span>
                    </div>
                    <h2 className="font-bold text-lg md:text-2xl text-text-primary tracking-tight truncate">{selectedSong.title}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <div className="flex items-center bg-bg-secondary rounded-xl p-1 mr-1">
                    <button 
                      onClick={() => setFontSize(prev => Math.max(6, prev - 2))}
                      className="p-1.5 text-text-secondary hover:text-jumas-green hover:bg-bg-primary rounded-lg transition-all flex items-center justify-center"
                      title="Diminuir fonte"
                    >
                      <Minus size={16} />
                      <Type size={14} className="ml-0.5" />
                    </button>
                    <div className="w-px h-4 bg-border-color mx-1" />
                    <button 
                      onClick={() => setFontSize(prev => Math.min(32, prev + 2))}
                      className="p-1.5 text-text-secondary hover:text-jumas-green hover:bg-bg-primary rounded-lg transition-all flex items-center justify-center"
                      title="Aumentar fonte"
                    >
                      <Plus size={16} />
                      <Type size={18} className="ml-0.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleFavorite(selectedSong.id)}
                    className={`p-2.5 rounded-xl transition-all ${selectedSong.isFavorite ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                    title={selectedSong.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Heart size={20} fill={selectedSong.isFavorite ? "currentColor" : "none"} />
                  </button>
                  <div className="flex items-center bg-bg-secondary rounded-xl p-1 mr-1 md:mr-2">
                    <button 
                      onClick={handlePrevSong}
                      className="p-1.5 md:p-2 text-text-secondary hover:text-jumas-green hover:bg-bg-primary rounded-lg transition-all"
                      title="Anterior"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="w-px h-4 bg-border-color mx-1" />
                    <button 
                      onClick={handleNextSong}
                      className="p-1.5 md:p-2 text-text-secondary hover:text-jumas-green hover:bg-bg-primary rounded-lg transition-all"
                      title="Próxima"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setSongToEdit(selectedSong);
                          setIsAddModalOpen(true);
                        }}
                        className="p-2.5 text-text-secondary hover:text-jumas-green hover:bg-jumas-green/10 rounded-xl transition-colors"
                        title="Editar cifra"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => setSongToDelete({ id: selectedSong.id, title: selectedSong.title })}
                        className="p-2.5 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        title="Excluir cifra"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="p-5 md:p-8 overflow-y-auto flex-1 custom-scrollbar bg-bg-secondary/20 pb-32 md:pb-8">
                <div className="max-w-2xl mx-auto">
                  {selectedArtist && (
                    <button 
                      onClick={() => {
                        setSelectedArtistProfileId(selectedArtist.id);
                        setSelectedSongId(null);
                      }}
                      className="w-full text-left mb-8 p-4 bg-bg-elevated rounded-3xl border border-border-color shadow-sm flex items-start gap-4 hover:border-jumas-green/50 hover:shadow-md transition-all group"
                    >
                      {selectedArtist.photoUrl ? (
                        <img src={selectedArtist.photoUrl} alt={selectedArtist.name} className="w-16 h-16 rounded-full object-cover border-2 border-border-color flex-shrink-0 group-hover:border-jumas-green/30 transition-colors" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-bg-secondary border-2 border-border-color flex items-center justify-center text-text-secondary flex-shrink-0 group-hover:border-jumas-green/30 transition-colors">
                          <User size={24} />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-bold text-text-primary text-lg group-hover:text-jumas-green transition-colors">{selectedArtist.name}</h3>
                        {selectedArtist.biography && (
                          <p className="text-sm text-text-secondary mt-1 leading-relaxed line-clamp-2">{selectedArtist.biography}</p>
                        )}
                      </div>
                      <div className="self-center text-text-secondary opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={20} />
                      </div>
                    </button>
                  )}
                  
                  {selectedSong.videoUrl && (
                    <div className="mb-8">
                      <a 
                        href={selectedSong.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-jumas-green/10 text-jumas-green rounded-2xl border border-jumas-green/20 hover:bg-jumas-green/20 transition-all font-bold"
                      >
                        <div className="w-10 h-10 rounded-full bg-jumas-green text-white flex items-center justify-center">
                          <Music size={20} />
                        </div>
                        <div className="flex-1">
                          <span className="block text-sm">Ouvir Música</span>
                          <span className="block text-xs opacity-70 truncate">{selectedSong.videoUrl}</span>
                        </div>
                        <ExternalLink size={18} />
                      </a>
                    </div>
                  )}

                  <ChordDiagrams 
                    chords={extractChords(selectedSong.content)} 
                    highlightedChord={activeChord}
                  />

                  <pre 
                    className="font-mono text-text-primary whitespace-pre leading-relaxed md:leading-loose overflow-x-auto pb-4"
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    {renderSongContent(selectedSong.content, false, (chord) => setActiveChord(chord))}
                  </pre>
                </div>
              </div>
            </motion.div>
          ) : selectedArtistProfile ? (
            <motion.div 
              key={`profile-${selectedArtistProfile.id}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <div className="p-4 md:p-6 border-b border-border-color bg-bg-elevated/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                  <button 
                    className="md:hidden p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary transition-colors"
                    onClick={() => setSelectedArtistProfileId(null)}
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="bg-jumas-green/10 text-jumas-green text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Perfil do Artista
                      </span>
                    </div>
                    <h2 className="font-bold text-lg md:text-2xl text-text-primary tracking-tight truncate">{selectedArtistProfile.name}</h2>
                  </div>
                </div>
              </div>
              <div className="p-5 md:p-8 overflow-y-auto flex-1 custom-scrollbar bg-bg-secondary/20 pb-32 md:pb-8">
                <div className="max-w-2xl mx-auto">
                  <div className="mb-8 flex flex-col items-center text-center">
                    {selectedArtistProfile.photoUrl ? (
                      <img src={selectedArtistProfile.photoUrl} alt={selectedArtistProfile.name} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-bg-elevated shadow-lg mb-4" />
                    ) : (
                      <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-bg-elevated border-4 border-bg-secondary shadow-lg flex items-center justify-center text-text-secondary mb-4">
                        <User size={40} className="md:hidden" />
                        <User size={48} className="hidden md:block" />
                      </div>
                    )}
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-2">{selectedArtistProfile.name}</h1>
                    {selectedArtistProfile.biography && (
                      <p className="text-sm md:text-base text-text-secondary leading-relaxed max-w-lg">{selectedArtistProfile.biography}</p>
                    )}
                  </div>
                  
                  <div className="mt-12">
                    <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                      <Music size={20} className="text-jumas-green" />
                      Músicas de {selectedArtistProfile.name}
                    </h3>
                    <div className="bg-bg-elevated rounded-3xl border border-border-color overflow-hidden shadow-sm">
                      {songs.filter(s => s.artistId?.toString() === selectedArtistProfile.id.toString()).length > 0 ? (
                        <ul className="divide-y divide-border-color">
                          {songs.filter(s => s.artistId?.toString() === selectedArtistProfile.id.toString()).map(song => (
                            <li key={song.id}>
                              <button
                                onClick={() => {
                                  setSelectedSongId(song.id);
                                  setSelectedArtistProfileId(null);
                                  setIsTunerActive(false);
                                }}
                                className="w-full text-left px-6 py-4 hover:bg-bg-secondary transition-colors flex items-center justify-between group"
                              >
                                <div>
                                  <span className="font-medium text-text-primary block">{song.title}</span>
                                  <span className="text-xs text-text-secondary mt-1 block">{songbooks.find(sb => sb.id === song.songbookId)?.name}</span>
                                </div>
                                <ChevronRight size={18} className="text-text-secondary opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-8 text-center text-text-secondary text-sm">
                          Nenhuma música cadastrada para este artista.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isFavoritesActive ? (
            <motion.div 
              key="empty-favorites"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center text-text-secondary p-8 text-center"
            >
              <div className="flex flex-col items-center max-w-sm">
                <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Heart size={32} className="text-text-secondary opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Selecione uma música</h3>
                <p className="text-sm text-text-secondary">Escolha uma cifra na lista ao lado para visualizar os acordes e a letra completa.</p>
              </div>
            </motion.div>
          ) : !isFavoritesActive ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex items-center justify-center text-text-secondary p-8 text-center"
            >
              <div className="flex flex-col items-center max-w-sm">
                <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Music size={32} className="text-text-secondary opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Selecione uma música</h3>
                <p className="text-sm text-text-secondary">Escolha uma cifra na lista ao lado para visualizar os acordes e a letra completa.</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {renderModals()}
      </div>
      <BottomNav />
    </>
  );
};

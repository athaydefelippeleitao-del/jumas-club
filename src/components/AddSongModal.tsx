import React, { useState, useEffect } from 'react';
import { X, Heart, Camera, Loader2, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { renderSongContent } from '../utils/chordParser';
import { ChordEditor } from './ChordEditor';

interface AddSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (song: { id?: string; title: string; category: string; number: number; content: string; songbookId: string; isFavorite?: boolean; artistId?: string; imageUrl?: string; videoUrl?: string }) => void;
  categories: string[];
  songbooks: { id: string; name: string }[];
  activeSongbookId: string;
  artists: { id: string; name: string }[];
  editData?: any;
}

export const AddSongModal: React.FC<AddSongModalProps> = ({ isOpen, onClose, onAdd, categories, songbooks, activeSongbookId, artists, editData }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [number, setNumber] = useState('');
  const [content, setContent] = useState('');
  const [songbookId, setSongbookId] = useState(activeSongbookId);
  const [artistId, setArtistId] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const handleImageScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    try {
      const imageParts: any[] = [];
      
      // Read all files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Set the first image as the song's photo
        if (i === 0) {
          setImageUrl(`data:${file.type};base64,${base64Data}`);
        }
        
        imageParts.push({
          inlineData: {
            mimeType: file.type,
            data: base64Data
          }
        });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            ...imageParts,
            {
              text: "Extraia os detalhes da música destas imagens de uma cifra. Retorne um objeto JSON com as seguintes propriedades: 'title' (string, o título da música), 'artist' (string, o nome do artista, opcional), 'content' (string, a letra com os acordes acima dela). Formate o conteúdo (content) APENAS EM TEXTO PLANO (sem tags HTML). É CRÍTICO que você mantenha RIGOROSAMENTE o alinhamento original dos acordes com a letra usando espaços em branco. Coloque os acordes exatamente acima das sílabas correspondentes. NÃO use nenhuma tag HTML como <span> ou <b>. O sistema irá colorir os acordes automaticamente depois."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ["title", "content"]
          }
        }
      });

      if (response.text) {
        const result = JSON.parse(response.text);
        if (result.title) setTitle(result.title);
        
        // Append content if there's already some content, otherwise set it
        if (result.content) {
          setContent(prev => prev ? prev + '\n\n' + result.content : result.content);
        }
        
        // Try to match artist if provided
        if (result.artist && artists.length > 0) {
          const matchedArtist = artists.find(a => a.name.toLowerCase().includes(result.artist.toLowerCase()) || result.artist.toLowerCase().includes(a.name.toLowerCase()));
          if (matchedArtist) {
            setArtistId(matchedArtist.id);
          }
        }
      }
    } catch (error) {
      console.error("Error processing images with AI:", error);
      alert("Ocorreu um erro ao processar as imagens. Tente novamente.");
    } finally {
      setIsScanning(false);
      // Reset the file input so the same files can be selected again if needed
      e.target.value = '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setTitle(editData.title || '');
        setCategory(editData.category || '');
        setNumber(editData.number?.toString() || '');
        setContent(editData.content || '');
        setSongbookId(editData.songbookId || activeSongbookId);
        setArtistId(editData.artistId || '');
        setIsFavorite(editData.isFavorite || false);
        setImageUrl(editData.imageUrl || '');
        setVideoUrl(editData.videoUrl || '');
      } else {
        if (categories.length > 0 && !category) {
          setCategory(categories[0]);
        }
        if (activeSongbookId) {
          setSongbookId(activeSongbookId);
        }
        setTitle('');
        setNumber('');
        setContent('');
        setNewCategory('');
        setArtistId('');
        setIsFavorite(false);
        setImageUrl('');
        setVideoUrl('');
      }
    }
  }, [isOpen, categories, category, activeSongbookId, editData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = category === 'new' ? newCategory : category;
    
    if (!title || !finalCategory || !number || !content || !songbookId) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    onAdd({
      id: editData?.id,
      title,
      category: finalCategory,
      number: parseInt(number, 10),
      content,
      songbookId,
      isFavorite,
      artistId: artistId || null,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null
    });

    // Reset form
    setTitle('');
    setNumber('');
    setContent('');
    setCategory(categories[0] || '');
    setNewCategory('');
    setArtistId('');
    setIsFavorite(false);
    setImageUrl('');
    setVideoUrl('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
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
            className="relative w-full max-w-3xl bg-bg-elevated rounded-3xl shadow-2xl border border-border-color flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-border-color flex justify-between items-center bg-bg-secondary/50">
              <h2 className="text-xl font-bold text-text-primary">{editData ? 'Editar Cifra' : 'Adicionar Nova Cifra'}</h2>
              <button 
                onClick={onClose} 
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5 custom-scrollbar">
              <div className="w-full">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageScan}
                  className="hidden"
                  id="image-scan-input"
                />
                <label
                  htmlFor="image-scan-input"
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer border-2 border-dashed ${
                    isScanning
                      ? 'bg-bg-secondary border-border-color text-text-secondary cursor-not-allowed'
                      : 'bg-jumas-green/5 border-jumas-green/30 text-jumas-green hover:bg-jumas-green/10 hover:border-jumas-green/50'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Analisando imagem com IA...
                    </>
                  ) : (
                    <>
                      <Camera size={20} />
                      Escanear Cifra com IA (Foto)
                    </>
                  )}
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Cancioneiro</label>
                  <select 
                    value={songbookId} 
                    onChange={e => setSongbookId(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all appearance-none"
                    required
                  >
                    {songbooks.map(sb => <option key={sb.id} value={sb.id}>{sb.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Categoria</label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all appearance-none"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="new">+ Criar Nova Categoria</option>
                  </select>
                </div>
              </div>

              {category === 'new' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Nome da Nova Categoria</label>
                  <input 
                    type="text" 
                    value={newCategory} 
                    onChange={e => setNewCategory(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                    placeholder="Ex: Cantos Marianos" 
                    required={category === 'new'} 
                  />
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Título da Música</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                    placeholder="Ex: Consagração a Maria" 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Número no Cancioneiro</label>
                  <input 
                    type="number" 
                    value={number} 
                    onChange={e => setNumber(e.target.value)} 
                    className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                    placeholder="Ex: 170" 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Artista (Opcional)</label>
                <select 
                  value={artistId} 
                  onChange={e => setArtistId(e.target.value)} 
                  className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all appearance-none"
                >
                  <option value="">Nenhum artista selecionado</option>
                  {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${isFavorite ? 'bg-red-50 text-red-500 border-red-200' : 'bg-bg-secondary text-text-secondary border-border-color hover:border-red-200 hover:text-red-500'}`}
                >
                  <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                  <span className="text-sm font-bold">{isFavorite ? 'Favorito' : 'Marcar como Favorito'}</span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Link da Música (YouTube/Spotify)</label>
                <input 
                  type="url" 
                  value={videoUrl} 
                  onChange={e => setVideoUrl(e.target.value)} 
                  className="w-full bg-bg-secondary border border-border-color text-text-primary rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-jumas-green/50 focus:border-jumas-green transition-all" 
                  placeholder="Ex: https://www.youtube.com/watch?v=..." 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Foto da Cifra (Opcional)</label>
                <div className="flex items-center gap-4">
                  {imageUrl && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-border-color">
                      <img src={imageUrl} alt="Cifra preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="song-image-upload"
                    />
                    <label
                      htmlFor="song-image-upload"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-border-color rounded-xl text-text-secondary hover:text-jumas-green hover:border-jumas-green/50 hover:bg-jumas-green/5 transition-all cursor-pointer"
                    >
                      <ImageIcon size={20} />
                      {imageUrl ? 'Trocar Foto' : 'Adicionar Foto'}
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-[250px] relative">
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Cifra e Letra</label>
                <ChordEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Cole a cifra aqui...&#10;&#10; C G Am&#10;Exemplo de cifra alinhada com a letra..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-color mt-2">
                <button 
                  type="button" 
                  onClick={onClose} 
                  className="px-5 py-2.5 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-xl transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-jumas-green text-white rounded-xl hover:bg-green-700 transition-colors font-medium shadow-md shadow-jumas-green/20"
                >
                  {editData ? 'Salvar Alterações' : 'Salvar Cifra'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

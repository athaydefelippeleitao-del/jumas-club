import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  app.use(cookieParser());

  // Global middleware to track activity
  app.use(async (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        await supabase
          .from("users")
          .update({ last_active: new Date().toISOString() })
          .eq("id", decoded.id);
      } catch (e) {
        // Ignore invalid tokens
      }
    }
    next();
  });

  // API routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password, name, adminCode } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    try {
      const hashedPassword = bcrypt.hashSync(password, 10);

      const { count } = await supabase
        .from("users")
        .select("*", { count: 'exact', head: true });

      let role = count === 0 ? 'admin' : 'user';

      if (adminCode === (process.env.ADMIN_REGISTRATION_CODE || "JUMAS_ADMIN")) {
        role = 'admin';
      }

      const { data, error } = await supabase
        .from("users")
        .insert([{ username, email, password: hashedPassword, name, role }])
        .select()
        .single();

      if (error) throw error;

      const token = jwt.sign({ id: data.id, username, email, name, role }, JWT_SECRET, { expiresIn: "7d" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({ user: { id: data.id, username, email, name, role } });
    } catch (error: any) {
      if (error.code === "23505") {
        if (error.message.includes("email")) {
          return res.status(400).json({ error: "E-mail já cadastrado" });
        }
        return res.status(400).json({ error: "Nome de usuário já cadastrado" });
      }
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (error || !user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } });
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { data: user, error } = await supabase
        .from("users")
        .select("id, username, email, name, role, photo_url, city, age")
        .eq("id", decoded.id)
        .single();

      if (error || !user) {
        res.clearCookie("token");
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      res.json({ user });
    } catch (error) {
      res.clearCookie("token");
      res.status(401).json({ error: "Token inválido ou expirado" });
    }
  });

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) {
      console.log("Admin check failed: No token");
      return res.status(401).json({ error: "Não autenticado" });
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { data: user, error } = await supabase
        .from("users")
        .select("role, username")
        .eq("id", decoded.id)
        .single();

      if (error || !user) {
        console.log("Admin check failed: User not found", error);
        return res.status(403).json({ error: "Usuário não encontrado" });
      }
      if (user.role !== 'admin') {
        console.log(`Admin check failed: User ${user.username} is not admin (role: ${user.role})`);
        return res.status(403).json({ error: "Acesso negado" });
      }
      req.user = decoded;
      next();
    } catch (error) {
      console.log("Admin check failed: JWT error", error);
      res.status(401).json({ error: "Token inválido" });
    }
  };

  // User management routes
  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, email, name, role, last_active, city, age, photo_url");
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  app.patch("/api/users/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { username, email, name, role, city, age, photo_url } = req.body;
    try {
      const { error } = await supabase.from("users").update({ username, email, name, role, city, age, photo_url }).eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  app.patch("/api/users/:id/role", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: "Papel inválido" });
    try {
      const { error } = await supabase.from("users").update({ role }).eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar papel" });
    }
  });

  app.patch("/api/auth/profile", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { name, username, email, password, city, age, photo_url } = req.body;
      const updates: any = { name, username, email, city, age, photo_url };
      if (password) updates.password = bcrypt.hashSync(password, 10);
      const { error } = await supabase.from("users").update(updates).eq("id", decoded.id);
      if (error) throw error;
      const userPayload = { ...decoded, name, username, email, city, age, photo_url };
      const newToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
      res.cookie("token", newToken, { httpOnly: true, secure: true, sameSite: "none", maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ user: userPayload });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar perfil" });
    }
  });

  // Artist management routes
  app.get("/api/artists", async (req, res) => {
    try {
      const { data: artists } = await supabase.from("artists").select("*");
      res.json({ artists });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar artistas" });
    }
  });

  app.post("/api/artists", isAdmin, async (req, res) => {
    const { name, photo_url, biography } = req.body;
    try {
      const { data, error } = await supabase.from("artists").insert([{ name, photo_url, biography }]).select().single();
      if (error) throw error;
      res.json({ artist: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar artista" });
    }
  });

  app.put("/api/artists/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, photo_url, biography } = req.body;
    try {
      const { error } = await supabase.from("artists").update({ name, photo_url, biography }).eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar artista" });
    }
  });

  app.delete("/api/artists/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase.from("artists").delete().eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir artista" });
    }
  });

  // Songbook management routes
  app.get("/api/songbooks", async (req, res) => {
    try {
      const { data: songbooks } = await supabase.from("songbooks").select("*");
      res.json({ songbooks });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar cancioneiros" });
    }
  });

  app.post("/api/songbooks", isAdmin, async (req, res) => {
    const { name, image, pdf_url } = req.body;
    try {
      const { data, error } = await supabase.from("songbooks").insert([{ name, image, pdf_url }]).select().single();
      if (error) throw error;
      res.json({ songbook: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar cancioneiro" });
    }
  });

  app.patch("/api/songbooks/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, image, pdf_url } = req.body;
    try {
      const { error } = await supabase.from("songbooks").update({ name, image, pdf_url }).eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar cancioneiro" });
    }
  });

  app.delete("/api/songbooks/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase.from("songbooks").delete().eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir cancioneiro" });
    }
  });

  // Song management routes
  app.get("/api/songs", async (req, res) => {
    const token = req.cookies.token;
    let userId: number | null = null;
    if (token) { try { const decoded = jwt.verify(token, JWT_SECRET) as any; userId = decoded.id; } catch (e) { } }
    try {
      const { data: songs, error } = await supabase.from("songs").select("*");
      if (error) throw error;
      if (userId) {
        const { data: favorites } = await supabase.from("user_favorites").select("song_id").eq("user_id", userId);
        const faveIds = new Set(favorites?.map(f => f.song_id));
        return res.json({ songs: songs.map(s => ({ ...s, isFavorite: faveIds.has(s.id) })) });
      }
      res.json({ songs: songs.map(s => ({ ...s, isFavorite: false })) });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar músicas" });
    }
  });

  app.post("/api/songs/:id/favorite", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const songId = parseInt(req.params.id, 10);
      const { data: existing } = await supabase.from("user_favorites").select("*").eq("user_id", decoded.id).eq("song_id", songId).single();
      if (existing) {
        await supabase.from("user_favorites").delete().eq("user_id", decoded.id).eq("song_id", songId);
        res.json({ isFavorite: false });
      } else {
        await supabase.from("user_favorites").insert({ user_id: decoded.id, song_id: songId });
        res.json({ isFavorite: true });
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao favoritar música" });
    }
  });

  app.post("/api/songs", isAdmin, async (req, res) => {
    const { title, category, number, content, songbookId, artistId, imageUrl, videoUrl } = req.body;
    try {
      const { data, error } = await supabase.from("songs").insert([{ title, category, number, content, songbook_id: songbookId, artist_id: artistId, image_url: imageUrl, video_url: videoUrl }]).select().single();
      if (error) throw error;
      res.json({ song: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar música" });
    }
  });

  app.patch("/api/songs/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.id;
    const mapped: any = {};
    if (updates.songbookId) mapped.songbook_id = updates.songbookId;
    if (updates.artistId) mapped.artist_id = updates.artistId;
    if (updates.imageUrl) mapped.image_url = updates.imageUrl;
    if (updates.videoUrl) mapped.video_url = updates.videoUrl;
    ['title', 'category', 'number', 'content'].forEach(k => { if (updates[k] !== undefined) mapped[k] = updates[k]; });
    try {
      const { error } = await supabase.from("songs").update(mapped).eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar música" });
    }
  });

  app.delete("/api/songs/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await supabase.from("songs").delete().eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir música" });
    }
  });

  // Playlist routes
  app.get("/api/playlists", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { data } = await supabase.from("playlists").select("*").eq("user_id", decoded.id).order("created_at", { ascending: false });
      res.json({ playlists: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar listas" });
    }
  });

  app.post("/api/playlists", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { name, description, date } = req.body;
      const share_id = Math.random().toString(36).substring(2, 15);
      const { data, error } = await supabase.from("playlists").insert([{ name, description, date, user_id: decoded.id, share_id }]).select().single();
      if (error) throw error;
      res.json({ playlist: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar lista" });
    }
  });

  app.get("/api/playlists/:id", async (req, res) => {
    const { id } = req.params;
    try {
      // Check if ID is numeric (ID) or string (share_id)
      const q = isNaN(Number(id)) ? { field: 'share_id', val: id } : { field: 'id', val: Number(id) };
      const { data: playlist } = await supabase.from("playlists").select("*").eq(q.field, q.val).single();
      if (!playlist) return res.status(404).json({ error: "Lista não encontrada" });
      const { data: songs } = await supabase.from("playlist_songs").select("songs(*), position").eq("playlist_id", playlist.id).order("position", { ascending: true });
      res.json({ playlist, songs: songs?.map((ps: any) => ({ ...ps.songs, position: ps.position })) || [] });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar lista" });
    }
  });

  app.delete("/api/playlists/:id", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { error } = await supabase.from("playlists").delete().eq("id", req.params.id).eq("user_id", decoded.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir lista" });
    }
  });

  app.post("/api/playlists/:id/songs", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const { id } = req.params;
      const { songId } = req.body;
      const { data: ps } = await supabase.from("playlist_songs").select("position").eq("playlist_id", id).order("position", { ascending: false }).limit(1);
      const position = (ps?.[0]?.position || 0) + 1;
      const { error } = await supabase.from("playlist_songs").insert({ playlist_id: id, song_id: songId, position });
      if (error) { if (error.code === "23505") return res.status(400).json({ error: "Música já está na lista" }); throw error; }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao adicionar música à lista" });
    }
  });

  app.delete("/api/playlists/:id/songs/:songId", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const { error } = await supabase.from("playlist_songs").delete().eq("playlist_id", req.params.id).eq("song_id", req.params.songId);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao remover música da lista" });
    }
  });

  app.put("/api/playlists/:id/songs/reorder", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const { songIds } = req.body;
      for (let i = 0; i < songIds.length; i++) {
        await supabase.from("playlist_songs").update({ position: i + 1 }).eq("playlist_id", req.params.id).eq("song_id", songIds[i]);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao reordenar músicas" });
    }
  });

  app.post("/api/playlists/create-favorites", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const share_id = Math.random().toString(36).substring(2, 15);
      const { data: q } = await supabase.from("playlists").insert([{ name: 'Favoritas', description: 'Minhas músicas favoritas', user_id: decoded.id, share_id }]).select().single();
      const { data: favs } = await supabase.from("user_favorites").select("song_id").eq("user_id", decoded.id);
      if (favs && favs.length > 0) {
        const inserts = favs.map((f, i) => ({ playlist_id: q.id, song_id: f.song_id, position: i + 1 }));
        await supabase.from("playlist_songs").insert(inserts);
      }
      res.json({ playlist: q });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar lista de favoritas" });
    }
  });

  // Academy routes
  app.get("/api/academy", async (req, res) => {
    try {
      const { data } = await supabase.from("academy").select("*").order("created_at", { ascending: false });
      res.json({ items: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar itens do Academy" });
    }
  });

  app.post("/api/academy", isAdmin, async (req, res) => {
    const { title, description, videoUrl, content, type } = req.body;
    try {
      const { data, error } = await supabase.from("academy").insert([{ title, description, video_url: videoUrl, content, type }]).select().single();
      if (error) throw error;
      res.json({ item: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar no Academy" });
    }
  });

  app.patch("/api/academy/:id", isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, description, videoUrl, content, type } = req.body;
    try {
      const { error } = await supabase.from("academy").update({ title, description, video_url: videoUrl, content, type }).eq("id", id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar item Academy" });
    }
  });

  app.delete("/api/academy/:id", isAdmin, async (req, res) => {
    try {
      const { error } = await supabase.from("academy").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir item Academy" });
    }
  });

  // App Settings
  app.get("/api/settings/loading-image", async (req, res) => {
    try {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "loading_image").single();
      res.json({ url: data?.value || "" });
    } catch (error) { res.status(500).json({ error: "Erro" }); }
  });

  app.post("/api/settings/loading-image", isAdmin, async (req, res) => {
    const { url } = req.body;
    try {
      const { error } = await supabase.from("app_settings").upsert({ key: 'loading_image', value: url });
      if (error) {
        console.error("Error saving loading-image:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Exception saving loading-image:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings/app-icon", async (req, res) => {
    try {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "app_icon").single();
      res.json({ url: data?.value || "" });
    } catch (error) { res.status(500).json({ error: "Erro" }); }
  });

  app.post("/api/settings/app-icon", isAdmin, async (req, res) => {
    const { url } = req.body;
    try {
      const { error } = await supabase.from("app_settings").upsert({ key: 'app_icon', value: url });
      if (error) {
        console.error("Error saving app-icon:", error);
        return res.status(500).json({ error: error.message });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Exception saving app-icon:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Backup/Restore
  app.get("/api/backup", isAdmin, async (req, res) => {
    try {
      const artists = await supabase.from("artists").select("*");
      const songbooks = await supabase.from("songbooks").select("*");
      const songs = await supabase.from("songs").select("*");
      const academy = await supabase.from("academy").select("*");
      res.json({ artists: artists.data, songbooks: songbooks.data, songs: songs.data, academy: academy.data });
    } catch (error) { res.status(500).json({ error: "Erro backup" }); }
  });

  app.post("/api/restore", isAdmin, async (req, res) => {
    const { artists, songbooks, songs, academy } = req.body;
    try {
      if (artists) await supabase.from("artists").upsert(artists);
      if (songbooks) await supabase.from("songbooks").upsert(songbooks);
      if (songs) await supabase.from("songs").upsert(songs);
      if (academy) await supabase.from("academy").upsert(academy);
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Erro restore" }); }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else { app.use(express.static("dist")); }

  app.listen(PORT, "0.0.0.0", () => { console.log(`Server running on http://localhost:${PORT}`); });
}
startServer();

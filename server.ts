import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-for-dev";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  app.use(cookieParser());
  app.use(express.static(path.join(__dirname, 'public')));

  // Global middleware to track activity
  app.use(async (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        await supabase.from('users').update({ last_active: new Date().toISOString() }).eq('id', decoded.id);
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
      
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      let role = count === 0 ? 'admin' : 'user';
      
      if (adminCode === (process.env.ADMIN_REGISTRATION_CODE || "JUMAS_ADMIN")) {
        role = 'admin';
      }

      const { data, error } = await supabase.from('users').insert([{
        username,
        email,
        password: hashedPassword,
        name,
        role
      }]).select().single();

      if (error) throw error;
      
      const token = jwt.sign({ id: data.id, username, email, name, role }, JWT_SECRET, { expiresIn: "7d" });
      
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      res.json({ user: { id: data.id, username, email, name, role } });
    } catch (error: any) {
      if (error.code === "23505") { // PostgREST unique violation
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
    if (!username || !password) return res.status(400).json({ error: "Usuário e senha são obrigatórios" });

    try {
      const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();

      if (error || !user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      
      res.json({ user: { id: user.id, username: user.username, name: user.name, role: user.role } });
    } catch (error) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const { data: user, error } = await supabase.from('users').select('id, username, email, name, role, photo_url').eq('id', decoded.id).single();
      
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

  const authenticate = async (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: "Token inválido" });
    }
  };

  const isAdmin = async (req: any, res: any, next: any) => {
    await authenticate(req, res, async () => {
      try {
        const { data: user } = await supabase.from('users').select('role').eq('id', req.user.id).single();
        if (!user || user.role !== 'admin') return res.status(403).json({ error: "Acesso negado" });
        next();
      } catch (error) {
        res.status(500).json({ error: "Erro ao verificar permissões" });
      }
    });
  };

  app.get("/api/users", isAdmin, async (req, res) => {
    try {
      const { data: users } = await supabase.from('users').select('id, username, email, name, role, last_active, city, age, photo_url');
      res.json({ users });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar usuários" });
    }
  });

  app.get("/api/artists", async (req, res) => {
    try {
      const { data: artists } = await supabase.from('artists').select('*');
      res.json({ artists });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar artistas" });
    }
  });

  app.post("/api/artists", isAdmin, async (req, res) => {
    const { name, photo_url, biography } = req.body;
    try {
      const { data, error } = await supabase.from('artists').insert([{ name, photo_url, biography }]).select().single();
      if (error) throw error;
      res.json({ artist: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar artista" });
    }
  });

  app.get("/api/songbooks", async (req, res) => {
    try {
      const { data: songbooks } = await supabase.from('songbooks').select('*');
      res.json({ songbooks });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar cancioneiros" });
    }
  });

  app.get("/api/songs", async (req, res) => {
    const token = req.cookies.token;
    let userId: number | null = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (e) {}
    }

    try {
      const { data: songs, error } = await supabase.from('songs').select('*');
      if (error) throw error;

      if (userId) {
        const { data: favorites } = await supabase.from('user_favorites').select('song_id').eq('user_id', userId);
        const favoriteIds = new Set(favorites?.map(f => f.song_id));
        const songsWithFav = songs.map(s => ({ ...s, is_favorite: favoriteIds.has(s.id) }));
        return res.json({ songs: songsWithFav });
      }

      res.json({ songs });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar músicas" });
    }
  });

  // Settings
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const { data } = await supabase.from('app_settings').select('value').eq('key', req.params.key).single();
      res.json({ url: data?.value || "" });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar configuração" });
    }
  });

  app.post("/api/settings/:key", isAdmin, async (req, res) => {
    const { url } = req.body;
    try {
      const { error } = await supabase.from('app_settings').upsert({ key: req.params.key, value: url }, { onConflict: 'key' });
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao salvar configuração" });
    }
  });

  // Playlists
  app.get("/api/playlists", authenticate, async (req, res) => {
    try {
      const { data: playlists } = await supabase.from('playlists').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
      res.json({ playlists });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar playlists" });
    }
  });

  app.post("/api/playlists", authenticate, async (req, res) => {
    const { name, description, date } = req.body;
    const shareId = Math.random().toString(36).substring(2, 11);
    try {
      const { data, error } = await supabase.from('playlists').insert([{ 
        user_id: req.user.id, 
        name, 
        description, 
        date, 
        share_id: shareId 
      }]).select().single();
      if (error) throw error;
      res.json({ playlist: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar playlist" });
    }
  });

  app.delete("/api/playlists/:id", authenticate, async (req, res) => {
    try {
      const { error } = await supabase.from('playlists').delete().eq('id', req.params.id).eq('user_id', req.user.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir playlist" });
    }
  });

  // Academy
  app.get("/api/academy", async (req, res) => {
    try {
      const { data: items } = await supabase.from('academy').select('*').order('created_at', { ascending: false });
      res.json({ items });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar itens da academy" });
    }
  });

  app.post("/api/academy", isAdmin, async (req, res) => {
    const { title, description, videoUrl, content, type } = req.body;
    try {
      const { data, error } = await supabase.from('academy').insert([{ title, description, video_url: videoUrl, content, type }]).select().single();
      if (error) throw error;
      res.json({ item: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar item na academy" });
    }
  });

  app.patch("/api/academy/:id", isAdmin, async (req, res) => {
    const { title, description, videoUrl, content, type } = req.body;
    try {
      const { data, error } = await supabase.from('academy').update({ title, description, video_url: videoUrl, content, type }).eq('id', req.params.id).select().single();
      if (error) throw error;
      res.json({ item: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar item na academy" });
    }
  });

  app.delete("/api/academy/:id", isAdmin, async (req, res) => {
    try {
      const { error } = await supabase.from('academy').delete().eq('id', req.params.id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao excluir item na academy" });
    }
  });

  // User Management
  app.patch("/api/users/:id", isAdmin, async (req, res) => {
    const { name, username, email, city, age, role, photoUrl } = req.body;
    try {
      const { data, error } = await supabase.from('users')
        .update({ name, username, email, city, age, role, photo_url: photoUrl })
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json({ user: data });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
  });

  // Backup & Restore
  app.get("/api/backup", isAdmin, async (req, res) => {
    try {
      const [users, artists, songbooks, songs, academy, settings] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('artists').select('*'),
        supabase.from('songbooks').select('*'),
        supabase.from('songs').select('*'),
        supabase.from('academy').select('*'),
        supabase.from('app_settings').select('*')
      ]);
      res.json({
        users: users.data,
        artists: artists.data,
        songbooks: songbooks.data,
        songs: songs.data,
        academy: academy.data,
        settings: settings.data
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar backup" });
    }
  });

  app.post("/api/restore", isAdmin, async (req, res) => {
    const data = req.body;
    try {
      // In Supabase, we should probably truncate and insert.
      // For simplicity and safety in this context, we'll just insert what's missing or update.
      // But a full restore usually means overwrite.
      if (data.artists) await supabase.from('artists').upsert(data.artists);
      if (data.songbooks) await supabase.from('songbooks').upsert(data.songbooks);
      if (data.songs) await supabase.from('songs').upsert(data.songs);
      if (data.academy) await supabase.from('academy').upsert(data.academy);
      if (data.settings) await supabase.from('app_settings').upsert(data.settings);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao restaurar backup" });
    }
  });

  // Basic redirection to Vite for frontend
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
    root: process.cwd()
  });
  app.use(vite.middlewares);

  app.use("*", async (req, res) => {
    const url = req.originalUrl;
    try {
      const templatePath = path.resolve(__dirname, "index.html");
      let template = fs.readFileSync(templatePath, "utf-8");
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      res.status(500).end((e as Error).message);
    }
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

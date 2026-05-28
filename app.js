/* ═══════════════════════════════════════════════════════════════
   CONFIGURATION SUPABASE
═══════════════════════════════════════════════════════════════ */

// Initialiser Supabase
const SUPABASE_URL = 'https://leeyybhxswrwenuoiqdc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9rs1mMdza6iJXpWqxiqArw_w1Rdrhrf';

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══════════════════════════════════════════════════════════════
// VARIABLES GLOBALES (mêmes qu'avant)
// ═══════════════════════════════════════════════════════════════

let clients = [];
let rdvs = [];
let conversations = {};
let avis = [];
let galerie = [];
let config = { adminCode: '1234', wa: '', email: '', adresse: '', instagram: '', facebook: '', tiktok: '', showDarkBtn: false };
let acompteSettings = { pct: 30, msg: 'Veuillez verser un acompte de {PTC}% pour confirmer votre réservation.' };
let loyaltySettings = { ptsParSeance: 10, seuilSilver: 100, seuilGold: 250 };
let isPromoActive = false;
let promoText = 'PROMO SPÉCIALE EN COURS !';
let dmClientUser = null;
let currentClientConvId = null;
let currentAdminConvId = null;

// ═══════════════════════════════════════════════════════════════
// SYNCHRONISATION AVEC SUPABASE
// ═══════════════════════════════════════════════════════════════

// Charger les données de Supabase au démarrage
async function loadFromSupabase() {
  try {
    console.log('📊 Chargement des données depuis Supabase...');
    
    // Charger les clients
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*');
    if (clientsError) throw clientsError;
    clients = clientsData || [];
    console.log(`✅ ${clients.length} client(s) chargé(s)`);
    
    // Charger les rendez-vous
    const { data: rdvsData, error: rdvsError } = await supabase
      .from('rdvs')
      .select('*');
    if (rdvsError) throw rdvsError;
    rdvs = rdvsData || [];
    console.log(`✅ ${rdvs.length} rendez-vous chargé(s)`);
    
    // Charger la configuration
    const { data: configData, error: configError } = await supabase
      .from('config')
      .select('*')
      .single();
    if (configError && configError.code !== 'PGRST116') throw configError;
    if (configData) config = { ...config, ...configData };
    console.log('✅ Configuration chargée');
    
    // Charger les avis
    const { data: avisData, error: avisError } = await supabase
      .from('avis')
      .select('*');
    if (avisError) throw avisError;
    avis = avisData || [];
    console.log(`✅ ${avis.length} avis chargé(s)`);
    
    // Charger la galerie
    const { data: galerieData, error: galerieError } = await supabase
      .from('galerie')
      .select('*');
    if (galerieError) throw galerieError;
    galerie = galerieData || [];
    console.log(`✅ ${galerie.length} image(s) galerie chargée(s)`);
    
    // Charger les conversations
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*');
    if (conversationsError) throw conversationsError;
    if (conversationsData) {
      conversations = {};
      conversationsData.forEach(conv => {
        conversations[conv.id] = conv;
      });
    }
    console.log(`✅ ${Object.keys(conversations).length} conversation(s) chargée(s)`);
    
  } catch (error) {
    console.error('❌ Erreur lors du chargement Supabase:', error);
    showToast('❌ Erreur de synchronisation avec la base de données');
  }
}

// Fonction centrale de sauvegarde vers Supabase
async function saveAll() {
  try {
    // Sauvegarder les clients
    await supabase.from('clients').delete().neq('id', -1); // Vider la table
    if (clients.length > 0) {
      const { error: clientsError } = await supabase
        .from('clients')
        .insert(clients);
      if (clientsError) throw clientsError;
    }
    
    // Sauvegarder les rendez-vous
    await supabase.from('rdvs').delete().neq('id', -1);
    if (rdvs.length > 0) {
      const { error: rdvsError } = await supabase
        .from('rdvs')
        .insert(rdvs);
      if (rdvsError) throw rdvsError;
    }
    
    // Sauvegarder la configuration
    const { data: existingConfig } = await supabase
      .from('config')
      .select('id')
      .single();
    
    if (existingConfig) {
      const { error: configError } = await supabase
        .from('config')
        .update(config)
        .eq('id', existingConfig.id);
      if (configError) throw configError;
    } else {
      const { error: configError } = await supabase
        .from('config')
        .insert([config]);
      if (configError) throw configError;
    }
    
    // Sauvegarder les avis
    await supabase.from('avis').delete().neq('id', -1);
    if (avis.length > 0) {
      const { error: avisError } = await supabase
        .from('avis')
        .insert(avis);
      if (avisError) throw avisError;
    }
    
    // Sauvegarder la galerie
    await supabase.from('galerie').delete().neq('id', -1);
    if (galerie.length > 0) {
      const { error: galerieError } = await supabase
        .from('galerie')
        .insert(galerie);
      if (galerieError) throw galerieError;
    }
    
    // Sauvegarder les conversations
    const conversationsArray = Object.values(conversations);
    await supabase.from('conversations').delete().neq('id', -1);
    if (conversationsArray.length > 0) {
      const { error: conversationsError } = await supabase
        .from('conversations')
        .insert(conversationsArray);
      if (conversationsError) throw conversationsError;
    }
    
    console.log('💾 Données sauvegardées vers Supabase');
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde Supabase:', error);
    showToast('❌ Erreur lors de la sauvegarde');
  }
}

// Alternative : Sauvegarder par table (plus efficace pour les petites mises à jour)
async function saveToSupabaseTable(tableName, data) {
  try {
    if (tableName === 'clients') {
      await supabase.from('clients').delete().neq('id', -1);
      if (data.length > 0) {
        await supabase.from('clients').insert(data);
      }
    } else if (tableName === 'rdvs') {
      await supabase.from('rdvs').delete().neq('id', -1);
      if (data.length > 0) {
        await supabase.from('rdvs').insert(data);
      }
    } else if (tableName === 'config') {
      const { data: existing } = await supabase.from('config').select('id').single();
      if (existing) {
        await supabase.from('config').update(data).eq('id', existing.id);
      } else {
        await supabase.from('config').insert([data]);
      }
    } else if (tableName === 'conversations') {
      const conversationsArray = Object.values(data);
      await supabase.from('conversations').delete().neq('id', -1);
      if (conversationsArray.length > 0) {
        await supabase.from('conversations').insert(conversationsArray);
      }
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la sauvegarde de ${tableName}:`, error);
  }
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES (Inchangées)
// ═══════════════════════════════════════════════════════════════

function showToast(msg) {
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }
}

function genId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

function formatMontant(val) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
}

function formatDate(d) {
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ═══════════════════════════════════════════════════════════════
// GESTION DES CLIENTS
// ═══════════════════════════════════════════════════════════════

async function ajouterClient(nom, tel, email, notes = '') {
  const newClient = {
    id: genId(),
    nom: nom.trim(),
    tel: tel.trim(),
    email: email.trim(),
    notes: notes.trim(),
    dateAjout: new Date().toISOString(),
    soldeAcompte: 0,
    pointsLoyalte: 0,
    status: 'actif'
  };
  
  clients.push(newClient);
  await saveToSupabaseTable('clients', clients);
  showToast(`✅ Client "${nom}" ajouté !`);
  return newClient;
}

async function supprimerClient(id) {
  const idx = clients.findIndex(c => c.id === id);
  if (idx !== -1) {
    const nom = clients[idx].nom;
    clients.splice(idx, 1);
    await saveToSupabaseTable('clients', clients);
    showToast(`✅ Client "${nom}" supprimé`);
  }
}

async function mettreAJourClient(id, updates) {
  const client = clients.find(c => c.id === id);
  if (client) {
    Object.assign(client, updates);
    await saveToSupabaseTable('clients', clients);
  }
}

// ═══════════════════════════════════════════════════════════════
// GESTION DES RENDEZ-VOUS
// ═══════════════════════════════════════════════════════════════

async function ajouterRdv(nom, tel, service, date, heure, notes = '') {
  const newRdv = {
    id: genId(),
    nom: nom.trim(),
    tel: tel.trim(),
    service: service.trim(),
    date: date,
    heure: heure,
    notes: notes.trim(),
    statut: 'confirmé',
    dateAjout: new Date().toISOString(),
    acompteRegle: false
  };
  
  rdvs.push(newRdv);
  await saveToSupabaseTable('rdvs', rdvs);
  showToast(`✅ Rendez-vous confirmé pour ${nom}`);
  return newRdv;
}

async function supprimerRdv(id) {
  const idx = rdvs.findIndex(r => r.id === id);
  if (idx !== -1) {
    const rdv = rdvs[idx];
    rdvs.splice(idx, 1);
    await saveToSupabaseTable('rdvs', rdvs);
    showToast(`✅ Rendez-vous supprimé`);
  }
}

async function mettreAJourRdv(id, updates) {
  const rdv = rdvs.find(r => r.id === id);
  if (rdv) {
    Object.assign(rdv, updates);
    await saveToSupabaseTable('rdvs', rdvs);
  }
}

// ═══════════════════════════════════════════════════════════════
// GESTION DES CONVERSATIONS
// ═══════════════════════════════════════════════════════════════

async function creerConversation(tel, nom) {
  const convId = genId();
  conversations[convId] = {
    id: convId,
    tel: tel,
    nom: nom,
    msgs: [],
    dateCreation: new Date().toISOString()
  };
  await saveToSupabaseTable('conversations', conversations);
  return convId;
}

async function ajouterMessage(convId, from, text) {
  if (!conversations[convId]) return;
  conversations[convId].msgs.push({
    from: from,
    text: text,
    ts: new Date().toISOString()
  });
  await saveToSupabaseTable('conversations', conversations);
}

// ═══════════════════════════════════════════════════════════════
// GESTION DE LA CONFIGURATION
// ═══════════════════════════════════════════════════════════════

async function sauvegarderConfig(newConfig) {
  Object.assign(config, newConfig);
  await saveToSupabaseTable('config', config);
}

// ═══════════════════════════════════════════════════════════════
// GESTION DES AVIS
// ═══════════════════════════════════════════════════════════════

async function ajouterAvis(nom, note, texte) {
  const newAvis = {
    id: genId(),
    nom: nom.trim(),
    note: parseInt(note),
    texte: texte.trim(),
    date: new Date().toISOString(),
    approuve: false
  };
  
  avis.push(newAvis);
  await saveToSupabaseTable('avis', avis);
  showToast('✅ Avis reçu ! Merci pour votre retour.');
  return newAvis;
}

async function approuverAvis(id) {
  const a = avis.find(av => av.id === id);
  if (a) {
    a.approuve = true;
    await saveToSupabaseTable('avis', avis);
  }
}

// ═══════════════════════════════════════════════════════════════
// GESTION DE LA GALERIE
// ═══════════════════════════════════════════════════════════════

async function ajouterImageGalerie(url, titre = '') {
  const newImg = {
    id: genId(),
    url: url,
    titre: titre.trim(),
    dateAjout: new Date().toISOString()
  };
  
  galerie.push(newImg);
  await saveToSupabaseTable('galerie', galerie);
  showToast('✅ Image ajoutée à la galerie');
  return newImg;
}

async function supprimerImageGalerie(id) {
  const idx = galerie.findIndex(img => img.id === id);
  if (idx !== -1) {
    galerie.splice(idx, 1);
    await saveToSupabaseTable('galerie', galerie);
    showToast('✅ Image supprimée');
  }
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS DE RENDU (Exemples - adapter selon votre HTML)
// ═══════════════════════════════════════════════════════════════

function render() {
  // À adapter selon votre HTML spécifique
  console.log('Rendu des données');
}

function renderAvis() {
  const container = document.getElementById('avis-container');
  if (!container) return;
  // Afficher les avis approuvés
  container.innerHTML = avis
    .filter(a => a.approuve)
    .map(a => `<div class="avis-item">${a.nom}: ${a.note}★ - ${a.texte}</div>`)
    .join('');
}

function renderGalerie() {
  const container = document.getElementById('galerie-container');
  if (!container) return;
  container.innerHTML = galerie
    .map(img => `<img src="${img.url}" alt="${img.titre}" />`)
    .join('');
}

function buildDispoGrid() {
  // À adapter selon votre logique
  console.log('Construction de la grille de disponibilités');
}

async function autoCleanRdv() {
  // Nettoyer les rendez-vous passés
  const now = new Date();
  const expired = rdvs.filter(r => new Date(r.date) < now);
  if (expired.length > 0) {
    rdvs = rdvs.filter(r => !(new Date(r.date) < now));
    await saveToSupabaseTable('rdvs', rdvs);
  }
}

function renderQRHistory() {
  // À adapter selon votre logique QR
  console.log('Rendu de l\'historique QR');
}

// ═══════════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════════

// Au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initialisation de l\'application avec Supabase');
  
  // Charger les données
  await loadFromSupabase();
  
  // Initialiser le rendu
  await autoCleanRdv();
  renderAvis();
  renderGalerie();
  render();
  buildDispoGrid();
  
  console.log('✅ Application prête !');
});

// Synchronisation périodique (toutes les 30 secondes)
setInterval(async () => {
  if (document.visibilityState === 'visible') {
    await loadFromSupabase();
  }
}, 30000);

// Nettoyage automatique des rendez-vous passés (chaque heure)
setInterval(async () => {
  await autoCleanRdv();
}, 60 * 60 * 1000);

// Synchronisation avant de quitter la page
window.addEventListener('beforeunload', () => {
  saveAll();
});

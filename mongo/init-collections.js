// BeautyShop : données de démonstration (mongosh).
const d = db.getSiblingDB('beautyshop');
['categories', 'products', 'shops', 'shop_stock', 'orders', 'payments', 'expenses', 'comments'].forEach(c => d[c].deleteMany({}));

// ---------- Catégories ----------
const cats = {};
[['visage', 'Soins du visage', 'Crèmes, sérums, nettoyants, masques'],
  ['maquillage', 'Maquillage', 'Teint, yeux, lèvres'],
  ['corps', 'Soins du corps', 'Hydratants, gommages, huiles'],
  ['cheveux', 'Cheveux', 'Shampoings, masques, huiles'],
  ['parfums', 'Parfums', 'Eaux de parfum et brumes']]
    .forEach(([k, name, description]) => cats[k] = d.categories.insertOne({ name, description }).insertedId.toString());

// ---------- Boutiques ----------
const shops = [['BeautyShop Tunis', 'Tunis', 'Avenue Habib Bourguiba'], ['BeautyShop Sousse', 'Sousse', 'Boulevard du 14 Janvier']]
    .map(([name, city, address]) => ({ name, id: d.shops.insertOne({ name, city, address, active: true }).insertedId.toString() }));

// ---------- Produits : [nom, catégorie, prix TND, peaux, préoccupations, description, stock boutique 1, stock boutique 2] ----------
const ALL = ['GRASSE', 'SECHE', 'MIXTE', 'SENSIBLE', 'NORMALE'];
const catalog = [
  ['Sérum Hydratant Acide Hyaluronique', 'visage', 39.9, ['SECHE', 'MIXTE'], ['HYDRATATION', 'RIDES'], 'Sérum repulpant à l\'acide hyaluronique, hydratation 24 h.', 30, 25],
  ['Gel Nettoyant Purifiant', 'visage', 19.5, ['GRASSE', 'MIXTE'], ['ACNE'], 'Nettoie en douceur et purifie les pores.', 40, 35],
  ['Crème Apaisante Peaux Sensibles', 'visage', 29, ['SENSIBLE'], ['HYDRATATION'], 'Calme les rougeurs, sans parfum.', 6, 4],
  ['Crème Anti-Rides Rétinol', 'visage', 54.9, ['NORMALE', 'SECHE'], ['RIDES'], 'Lisse les rides et affine le grain de peau.', 18, 15],
  ['Sérum Éclat Vitamine C', 'visage', 44.5, ['NORMALE', 'MIXTE', 'GRASSE'], ['TACHES'], 'Unifie le teint et estompe les taches.', 22, 20],
  ['Masque Argile Détox', 'visage', 24, ['GRASSE'], ['ACNE'], 'Absorbe l\'excès de sébum.', 9, 12],
  ['Lotion Tonique Équilibrante', 'visage', 17.5, ['MIXTE', 'NORMALE'], ['HYDRATATION'], 'Rafraîchit et prépare la peau aux soins.', 28, 30],
  ['Crème Solaire SPF 50', 'visage', 32, ['NORMALE', 'SENSIBLE', 'MIXTE'], ['TACHES'], 'Protection haute, toucher invisible.', 35, 30],
  ['Fond de Teint Fluide Naturel', 'maquillage', 36, ['NORMALE', 'MIXTE'], ['TACHES'], 'Couvrance modulable, fini naturel.', 20, 18],
  ['Rouge à Lèvres Rose Poudré', 'maquillage', 22.9, ALL, [], 'Couleur rose poudré, tenue confortable.', 45, 40],
  ['Mascara Volume Intense', 'maquillage', 26, ALL, [], 'Cils volumineux sans paquets.', 30, 28],
  ['Palette Yeux Or et Rose', 'maquillage', 48, ALL, [], '12 teintes nacrées et mates.', 14, 8],
  ['Poudre Matifiante Peaux Grasses', 'maquillage', 21, ['GRASSE', 'MIXTE'], ['ACNE'], 'Matifie sans effet plâtre.', 7, 20],
  ['Lait Corporel Nourrissant', 'corps', 23.5, ['SECHE', 'SENSIBLE'], ['HYDRATATION'], 'Nourrit intensément les peaux sèches.', 33, 27],
  ['Gommage Corps Sucre et Vanille', 'corps', 18, ['NORMALE', 'MIXTE', 'SECHE'], ['HYDRATATION'], 'Exfolie et laisse la peau douce.', 25, 22],
  ['Huile Sèche Dorée', 'corps', 31.5, ['SECHE', 'NORMALE'], ['HYDRATATION'], 'Huile légère aux particules dorées.', 16, 10],
  ['Shampoing Doux aux Protéines', 'cheveux', 15.9, ALL, [], 'Usage quotidien, cheveux brillants.', 38, 36],
  ['Masque Réparateur Kératine', 'cheveux', 27, ALL, ['HYDRATATION'], 'Répare les cheveux abîmés.', 19, 17],
  ['Huile d\'Argan Pure', 'cheveux', 35, ALL, ['HYDRATATION'], 'Huile 100 % pure pour cheveux et peau.', 8, 15],
  ['Eau de Parfum Rose Dorée', 'parfums', 89, ALL, [], 'Notes de rose, ambre et musc blanc.', 12, 9],
  ['Brume Parfumée Fleur d\'Oranger', 'parfums', 28.5, ALL, [], 'Brume légère pour le corps et les cheveux.', 26, 24]
];
const prods = catalog.map(([name, cat, price, skinTypes, concerns, description, q1, q2]) => {
  const id = d.products.insertOne({ name, description, categoryId: cats[cat], price, stock: q1 + q2, skinTypes, concerns, images: [] }).insertedId.toString();
  d.shop_stock.insertMany([{ shopId: shops[0].id, productId: id, quantity: q1 }, { shopId: shops[1].id, productId: id, quantity: q2 }]);
  return { id, name, price };
});

// ---------- Commandes et paiements (30 commandes sur 7 jours) ----------
const clientEmail = 'client@beautyshop.com';
const statuses = ['DELIVERED', 'DELIVERED', 'DELIVERED', 'SHIPPED', 'CONFIRMED', 'PENDING'];
const methods = ['CARD', 'PAYPAL', 'COD'];
const addrs = ['12 Rue de Marseille, Tunis', '5 Avenue de la Liberté, Sousse', '8 Rue Ibn Khaldoun, Tunis'];
for (let i = 0; i < 30; i++) {
  const shop = shops[i % 2], items = []; let total = 0;
  for (let k = 0; k < 1 + (i % 3); k++) {
    const p = prods[(i * 3 + k * 5) % prods.length], qty = 1 + ((i + k) % 3);
    items.push({ productId: p.id, name: p.name, price: p.price, qty }); total += p.price * qty;
  }
  total = Math.round(total * 100) / 100;
  const status = statuses[i % statuses.length], method = methods[i % 3];
  const createdAt = new Date(Date.now() - (i % 7) * 86400000 - i * 3600000);
  const oid = d.orders.insertOne({ userEmail: clientEmail, paymentMethod: method, status, total, createdAt, items, shopId: shop.id, address: addrs[i % 3] }).insertedId.toString();
  d.payments.insertOne({ orderId: oid, method, status: method === 'COD' && status !== 'DELIVERED' ? 'PENDING' : 'PAID', transactionId: 'TXN-' + oid, amount: total, createdAt });
}

// ---------- Dépenses ----------
shops.forEach((s, i) => d.expenses.insertMany([
  { shopId: s.id, label: 'Loyer', amount: 900 + i * 150, createdAt: new Date() },
  { shopId: s.id, label: 'Livraison et emballages', amount: 180 + i * 40, createdAt: new Date() },
  { shopId: s.id, label: 'Marketing', amount: 120, createdAt: new Date() }]));

// ---------- Avis (quatre approuvés, deux en attente de modération) ----------
const rv = (p, rating, text, status, reply) => ({ productId: prods[p].id, userEmail: clientEmail, userName: 'Client BeautyShop', rating, text, status, reply: reply || null, createdAt: new Date() });
d.comments.insertMany([
  rv(0, 5, 'Texture légère, ma peau est vraiment hydratée.', 'APPROVED', 'Merci pour votre retour !'),
  rv(1, 4, 'Très bon nettoyant, pas de tiraillements.', 'APPROVED'),
  rv(9, 5, 'La couleur est magnifique et tient bien.', 'APPROVED'),
  rv(19, 5, 'Parfum élégant, très belle tenue.', 'APPROVED'),
  rv(4, 3, 'Résultat correct mais un peu cher.', 'PENDING'),
  rv(2, 5, 'Parfaite pour ma peau sensible.', 'PENDING')]);

// ---------- Compte boutique rattaché à la 1re boutique (si les comptes existent déjà) ----------
d.users.updateOne({ email: 'boutique@beautyshop.com' }, { $set: { shopId: shops[0].id } });
print('OK : ' + d.categories.countDocuments() + ' catégories, ' + d.shops.countDocuments() + ' boutiques, ' + d.products.countDocuments() +
    ' produits, ' + d.orders.countDocuments() + ' commandes, ' + d.comments.countDocuments() + ' avis.');
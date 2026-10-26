# BeautyShop

## Lancer (une seule commande, Docker Desktop requis)
    cd beautyshop
    docker-compose up -d --build

La 1re fois, la compilation prend quelques minutes.
- Site : http://localhost:4200
- API / Swagger : http://localhost:8080/swagger-ui/index.html
- MongoDB : localhost:27017 (base `beautyshop`)

Arrêter : `docker-compose down` (ajouter `-v` pour effacer les données).
Logs : `docker-compose logs -f backend`

## Comptes de test
admin@beautyshop.com / admin123 · manager@beautyshop.com / manager123
boutique@beautyshop.com / boutique123 · client@beautyshop.com / client123

## Sans Docker
1. MongoDB local sur 27017, puis `mongosh < mongo/init-mongo.js`
2. `cd backend && mvn spring-boot:run`
3. `cd frontend && npm install && npm start` -> http://localhost:4200

## Fonctionnalités présentes
Auth (inscription, connexion, mot de passe oublié/reset), catalogue + filtre peau, détail produit + avis (modération admin),
panier localStorage, checkout 3 modes (simulés), suivi commandes, facture imprimable (window.print), chatbot de diagnostic,
admin (CRUD produits, stats, modération), manager (stock + alerte < 10), boutique (statuts commandes).
## Pas encore implémenté
Messagerie STOMP, appels WebRTC, photos/scanner, compte financier + exports PDF/Excel, upload de photos d'avis,
galerie d'images, filtres catégorie/prix, profil modifiable, CRUD utilisateurs en UI (API prête), envoi d'emails SMTP.

## Ajouts : finance, stock par boutique, paiements
- Page "Finance et stock" (MANAGER, BOUTIQUE, ADMIN) : revenus (commandes non PENDING), dépenses saisies, bénéfice, barres par boutique, export Excel/PDF.
- Stock par boutique (collection shop_stock) ; le client choisit la boutique au checkout ; chaque commande crée un document `payments`.
- Si vous aviez déjà lancé l'ancienne version : `docker-compose down -v` puis relancer (repart d'une base propre).

## Messagerie (page "Messages")
- STOMP sur /ws (JWT dans la trame CONNECT) : messages en temps réel, notifications (toast + compteur), conversations individuelles et groupes.
- Photos et fichiers (5 Mo max, stockés en base64 dans MongoDB), scanner de document = capture caméra envoyée comme image.
- Appels vocaux WebRTC 1-à-1 (bouton Appeler dans une conversation individuelle ; serveur STUN public Google).
- L'admin voit toutes les conversations (lecture seule). Test : ouvrez 2 navigateurs (ex. client et boutique) via http://localhost:4200.
  Micro et caméra fonctionnent sur http://localhost ; sur une autre adresse il faut HTTPS.

## Règles métier et compléments
- Produit : catégorie existante obligatoire (400). Suppression d'une catégorie utilisée ou d'un client ayant des commandes : 409.
- Commande : client existant + adresse obligatoire ; carte finissant par 0000 = paiement refusé (402) enregistré FAILED ; chaque paiement a un transactionId (TXN-...).
- Avis réservé aux acheteurs, photo possible. Chatbot : types de peau + NORMALE, budget, diagnostic détaillé.
- @PreAuthorize sur les endpoints admin/shop/manager ; guards Angular par rôle ; script d'init : mongo/init-collections.js.

## Tableaux de bord (/dashboard, selon le rôle)
ADMIN : utilisateurs, produits, commandes, CA, avis en attente, stock bas, graphiques réseau.
MANAGER : revenus/dépenses/bénéfice réseau, performance par boutique, alertes stock bas.
BOUTIQUE : CA, dépenses, bénéfice, commandes en attente, ventes 7 jours, top produits, gestion des commandes de sa boutique.
CLIENT : commandes, total dépensé, consultations, dernier diagnostic.

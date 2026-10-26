import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from './api';
const SKINS = ['GRASSE', 'SECHE', 'MIXTE', 'SENSIBLE', 'NORMALE'], CONS = ['ACNE', 'RIDES', 'HYDRATATION', 'TACHES'];
const split = (s: string) => s ? s.split(',').map(x => x.trim()).filter(x => x) : [];
const err = (e: any) => e.error?.error || 'Erreur';

@Component({ standalone: true, imports: [FormsModule], template: `
  <h2>Catalogue</h2>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <input [(ngModel)]="f.q" placeholder="Recherche...">
    <select [(ngModel)]="f.cat"><option value="">Catégorie</option>@for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select>
    <input [(ngModel)]="f.min" type="number" placeholder="Prix min" style="width:90px"><input [(ngModel)]="f.max" type="number" placeholder="Prix max" style="width:90px">
    <select [(ngModel)]="f.skin"><option value="">Type de peau</option>@for (s of skins; track s) { <option [value]="s">{{ s }}</option> }</select>
    <select [(ngModel)]="f.con"><option value="">Préoccupation</option>@for (s of cons; track s) { <option [value]="s">{{ s }}</option> }</select>
  </div>
  <div class="grid" style="margin-top:16px">@for (p of shown; track p.id) {
    <div class="card"><strong>{{ p.name }}</strong><span>{{ p.price }} TND</span><small [class.low]="p.stock < 10">Stock : {{ p.stock }}</small>
      <a href="/product/{{ p.id }}">Détails et avis</a><button class="btn" (click)="add(p)" [disabled]="p.stock < 1">Ajouter</button></div> }</div>
  <h2>Panier</h2>
  @for (c of cart; track c.id) { <p>{{ c.name }} <button (click)="chg(c, -1)">-</button> {{ c.qty }} <button (click)="chg(c, 1)">+</button> = {{ c.price * c.qty }} TND <button (click)="rm(c)">✕</button></p> }
  @if (cart.length) { <p><b>Total : {{ total }} TND</b></p>
    <input [(ngModel)]="addr" placeholder="Adresse de livraison" style="width:300px">
    <select [(ngModel)]="shopId">@for (s of shops; track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select>
    <select [(ngModel)]="pay"><option value="CARD">Carte bancaire (simulation)</option><option value="PAYPAL">PayPal (simulation)</option><option value="COD">Paiement à la livraison</option></select>
    @if (pay == 'CARD') { <input [(ngModel)]="card" placeholder="N° de carte (finissant par 0000 = refus)"> }
    <button class="btn" (click)="checkout()">Commander</button> }
  <p>{{ msg }}</p>` })
export class ShopComponent {
  http = inject(HttpClient); auth = inject(Auth); router = inject(Router); skins = SKINS; cons = CONS;
  products: any[] = []; cats: any[] = []; shops: any[] = []; f: any = {}; addr = ''; card = ''; pay = 'COD'; shopId = ''; msg = '';
  cart: any[] = JSON.parse(localStorage.getItem('cart') || '[]');
  constructor() {
    this.load(); this.http.get<any[]>('/api/categories').subscribe(c => this.cats = c);
    this.http.get<any[]>('/api/shops').subscribe({ next: s => { this.shops = s; this.shopId = s[0]?.id; }, error: () => {} });
  }
  load() { this.http.get<any[]>('/api/products').subscribe(p => this.products = p); }
  get shown() {
    const f = this.f;
    return this.products.filter(p => (!f.q || p.name.toLowerCase().includes(f.q.toLowerCase())) && (!f.cat || p.categoryId == f.cat) && (!f.min || p.price >= f.min)
      && (!f.max || p.price <= f.max) && (!f.skin || p.skinTypes?.includes(f.skin)) && (!f.con || p.concerns?.includes(f.con)));
  }
  get total() { return this.cart.reduce((s, c) => s + c.price * c.qty, 0); }
  save() { localStorage.setItem('cart', JSON.stringify(this.cart)); }
  add(p: any) { const l = this.cart.find(c => c.id == p.id); l ? l.qty++ : this.cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 }); this.save(); }
  chg(c: any, d: number) { c.qty += d; if (c.qty < 1) this.rm(c); else this.save(); }
  rm(c: any) { this.cart = this.cart.filter(x => x != c); this.save(); }
  checkout() {
    if (!this.auth.user()) { this.router.navigate(['/login']); return; }
    this.http.post('/api/orders', { items: this.cart.map(c => ({ productId: c.id, qty: c.qty })), paymentMethod: this.pay, shopId: this.shopId, address: this.addr, cardNumber: this.card })
      .subscribe({ next: () => { this.cart = []; this.save(); this.msg = 'Commande enregistrée ✔'; this.load(); }, error: e => this.msg = err(e) });
  }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  @if (p) { <h2>{{ p.name }}</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap">@for (i of imgs; track i) { <img [src]="i" height="150" alt=""> }</div>
    <p>{{ p.description }}</p><p><b>{{ p.price }} TND</b> · Stock : {{ p.stock }} · Peau recommandée : {{ p.skinTypes?.join(', ') }}</p>
    <h2>Avis ({{ rv.count }}) : moyenne {{ rv.average }} / 5</h2>
    @for (r of rv.reviews; track r.id) { <p>{{ '★'.repeat(r.rating) }} <b>{{ r.userName }}</b> : {{ r.text }}
      @if (r.photo) { <br><img [src]="r.photo" height="90" alt=""> } @if (r.reply) { <br><em>Réponse BeautyShop : {{ r.reply }}</em> }</p> }
    @if (auth.user()) { <div class="card"><select [(ngModel)]="rating">@for (n of [5, 4, 3, 2, 1]; track n) { <option [ngValue]="n">{{ n }} ★</option> }</select>
      <input [(ngModel)]="text" placeholder="Votre avis"><input type="file" accept="image/*" (change)="pick($event)">
      <button class="btn" (click)="send()">Publier</button><small>{{ msg }}</small></div> } }` })
export class ProductPageComponent {
  http = inject(HttpClient); auth = inject(Auth); id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  p: any; rv: any = { reviews: [], average: 0, count: 0 }; rating = 5; text = ''; msg = ''; photo = '';
  constructor() { this.http.get('/api/products/' + this.id).subscribe(x => this.p = x); this.http.get<any>('/api/products/' + this.id + '/reviews').subscribe(x => this.rv = x); }
  get imgs() { return [...(this.p.images || []), ...(this.p.imageUrl ? [this.p.imageUrl] : [])]; }
  pick(e: any) { const f: File = e.target.files[0]; if (!f || f.size > 2e6) { this.msg = 'Image 2 Mo max'; return; } const r = new FileReader(); r.onload = () => this.photo = r.result as string; r.readAsDataURL(f); }
  send() {
    this.http.post('/api/reviews', { productId: this.id, rating: this.rating, text: this.text, photo: this.photo })
      .subscribe({ next: () => { this.msg = 'Merci ! Avis publié après modération.'; this.text = ''; this.photo = ''; }, error: e => this.msg = err(e) });
  }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  <div class="card"><h2>Mon profil</h2><small>{{ p.email }} ({{ p.role }})</small>
    <input [(ngModel)]="p.firstName" placeholder="Prénom"><input [(ngModel)]="p.lastName" placeholder="Nom"><input [(ngModel)]="p.phone" placeholder="Téléphone">
    <button class="btn" (click)="save()">Enregistrer</button>
    <h3>Changer le mot de passe</h3>
    <input [(ngModel)]="old" type="password" placeholder="Ancien mot de passe"><input [(ngModel)]="nw" type="password" placeholder="Nouveau (6 car. min)">
    <button class="btn" (click)="pwd()">Modifier</button><p>{{ msg }}</p></div>` })
export class ProfileComponent {
  http = inject(HttpClient); p: any = {}; old = ''; nw = ''; msg = '';
  constructor() { this.http.get('/api/profile').subscribe(x => this.p = x); }
  save() { this.http.put('/api/profile', this.p).subscribe({ next: () => this.msg = 'Profil enregistré', error: e => this.msg = err(e) }); }
  pwd() { this.http.put<any>('/api/profile/password', { oldPassword: this.old, newPassword: this.nw }).subscribe({ next: x => { this.msg = x.message; this.old = this.nw = ''; }, error: e => this.msg = err(e) }); }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  <h2>Comptes</h2><p class="err">{{ msg }}</p>
  <div class="card" style="max-width:none;flex-direction:row;flex-wrap:wrap">
    <input [(ngModel)]="n.email" placeholder="Email"><input [(ngModel)]="n.password" placeholder="Mot de passe"><input [(ngModel)]="n.firstName" placeholder="Prénom">
    <input [(ngModel)]="n.lastName" placeholder="Nom"><input [(ngModel)]="n.phone" placeholder="Téléphone">
    <select [(ngModel)]="n.role">@for (r of roles; track r) { <option>{{ r }}</option> }</select><button class="btn" (click)="create()">Créer</button></div>
  <select [(ngModel)]="rf"><option value="">Tous les rôles</option>@for (r of roles; track r) { <option>{{ r }}</option> }</select>
  <table>@for (u of shown; track u.id) { <tr><td>{{ u.email }}</td><td><input [(ngModel)]="u.firstName" style="width:90px"> <input [(ngModel)]="u.lastName" style="width:90px"> <input [(ngModel)]="u.phone" style="width:100px"></td>
    <td><select [(ngModel)]="u.role">@for (r of roles; track r) { <option>{{ r }}</option> }</select>
      <select [(ngModel)]="u.shopId"><option [ngValue]="null">(aucune boutique)</option>@for (s of shops; track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select></td>
    <td><button class="btn" (click)="save(u)">Enregistrer</button> <button class="btn" (click)="toggle(u)">{{ u.active ? 'Désactiver' : 'Activer' }}</button> <button class="btn" (click)="del(u)">Supprimer</button></td></tr> }</table>
  <h2>Catégories</h2>
  <div><input [(ngModel)]="nc.name" placeholder="Nom"><input [(ngModel)]="nc.description" placeholder="Description"><button class="btn" (click)="addCat()">Ajouter</button></div>
  <table>@for (c of cats; track c.id) { <tr><td><input [(ngModel)]="c.name"></td><td><input [(ngModel)]="c.description" style="width:260px"></td>
    <td><button class="btn" (click)="saveCat(c)">Enregistrer</button> <button class="btn" (click)="delCat(c)">Supprimer</button></td></tr> }</table>` })
export class AdminManageComponent {
  http = inject(HttpClient); roles = ['CLIENT', 'BOUTIQUE', 'MANAGER', 'ADMIN']; users: any[] = []; cats: any[] = []; shops: any[] = [];
  n: any = { role: 'CLIENT' }; nc: any = {}; rf = ''; msg = '';
  constructor() { this.http.get<any[]>('/api/shops').subscribe(s => this.shops = s); this.refresh(); }
  get shown() { return this.users.filter(u => !this.rf || u.role == this.rf); }
  refresh() { this.http.get<any[]>('/api/admin/users/full').subscribe(u => this.users = u); this.http.get<any[]>('/api/categories').subscribe(c => this.cats = c); }
  private run(o: any, ok = 'OK') { o.subscribe({ next: () => { this.msg = ''; this.refresh(); }, error: (e: any) => this.msg = err(e) }); }
  create() { this.run(this.http.post('/api/admin/users', this.n)); this.n = { role: 'CLIENT' }; }
  save(u: any) { this.run(this.http.put('/api/admin/users/' + u.id, { firstName: u.firstName, lastName: u.lastName, phone: u.phone, role: u.role, shopId: u.shopId || '' })); }
  toggle(u: any) { this.run(this.http.put('/api/admin/users/' + u.id + '/toggle', {})); }
  del(u: any) { if (confirm('Supprimer ' + u.email + ' ?')) this.run(this.http.delete('/api/admin/users/' + u.id)); }
  addCat() { this.run(this.http.post('/api/admin/categories', this.nc)); this.nc = {}; }
  saveCat(c: any) { this.run(this.http.put('/api/admin/categories/' + c.id, c)); }
  delCat(c: any) { this.run(this.http.delete('/api/admin/categories/' + c.id)); }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  <h2>Mes produits</h2><p class="err">{{ msg }}</p>
  <div class="card" style="max-width:none;flex-direction:row;flex-wrap:wrap">
    <input [(ngModel)]="n.name" placeholder="Nom"><input [(ngModel)]="n.description" placeholder="Description"><input [(ngModel)]="n.price" type="number" placeholder="Prix">
    <input [(ngModel)]="n.stock" type="number" placeholder="Quantité"><select [(ngModel)]="n.categoryId"><option value="">Catégorie</option>@for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select>
    <input [(ngModel)]="sk" placeholder="Peau (GRASSE,SECHE)"><input [(ngModel)]="co" placeholder="Préoccupations (ACNE,RIDES)"><input [(ngModel)]="im" placeholder="URLs d'images (séparées par ,)">
    <button class="btn" (click)="add()">Ajouter</button></div>
  <table>@for (p of list; track p.id) { <tr><td><input [(ngModel)]="p.name"></td><td><input [(ngModel)]="p.price" type="number" style="width:80px"></td><td>stock {{ p.stock }}</td>
    <td><button class="btn" (click)="save(p)">Enregistrer</button> <button class="btn" (click)="del(p)">Supprimer</button></td></tr> }</table>
  <small>Les quantités se modifient dans « Finance et stock ».</small>` })
export class MyProductsComponent {
  http = inject(HttpClient); list: any[] = []; cats: any[] = []; n: any = {}; sk = ''; co = ''; im = ''; msg = '';
  constructor() { this.http.get<any[]>('/api/categories').subscribe(c => this.cats = c); this.refresh(); }
  refresh() { this.http.get<any[]>('/api/inventory/products').subscribe(l => this.list = l); }
  private run(o: any) { o.subscribe({ next: () => { this.msg = ''; this.refresh(); }, error: (e: any) => this.msg = err(e) }); }
  add() { this.run(this.http.post('/api/inventory/products', { ...this.n, skinTypes: split(this.sk).map(x => x.toUpperCase()), concerns: split(this.co).map(x => x.toUpperCase()), images: split(this.im) })); this.n = {}; }
  save(p: any) { this.run(this.http.put('/api/inventory/products/' + p.id, p)); }
  del(p: any) { this.run(this.http.delete('/api/inventory/products/' + p.id)); }
}

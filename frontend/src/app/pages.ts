import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Auth } from './api';

@Component({ standalone: true, imports: [FormsModule], template: `
  <form class="card" (ngSubmit)="go()">
    <h2>{{ reg ? 'Inscription' : 'Connexion' }}</h2>
    @if (reg) { <input name="fn" [(ngModel)]="f.firstName" placeholder="Prénom" required>
      <input name="ln" [(ngModel)]="f.lastName" placeholder="Nom" required>
      <input name="ph" [(ngModel)]="f.phone" placeholder="Téléphone"> }
    <input name="em" [(ngModel)]="f.email" type="email" placeholder="Email" required>
    <input name="pw" [(ngModel)]="f.password" type="password" placeholder="Mot de passe" required>
    @if (err) { <p class="err">{{ err }}</p> }
    <button class="btn">{{ reg ? 'Créer mon compte' : 'Se connecter' }}</button>
    <a href="/forgot">Mot de passe oublié ?</a><a style="cursor:pointer" (click)="reg = !reg">{{ reg ? 'Déjà inscrit ?' : 'Créer un compte' }}</a>
  </form>` })
export class LoginComponent {
  auth = inject(Auth); router = inject(Router);
  reg = false; err = ''; f: any = {};
  go() {
    (this.reg ? this.auth.register(this.f) : this.auth.login(this.f))
      .subscribe({ next: () => this.router.navigate(['/dashboard']), error: e => this.err = e.error?.error || 'Erreur' });
  }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  <h2>Catalogue</h2>
  <select [(ngModel)]="skin"><option value="">Tous types de peau</option>
    @for (s of ['GRASSE','SECHE','MIXTE','SENSIBLE']; track s) { <option [value]="s">{{ s }}</option> }</select>
  <div class="grid" style="margin-top:16px">
    @for (p of shown; track p.id) {
      <div class="card"><strong>{{ p.name }}</strong><span>{{ p.price }} TND</span><a href="/product/{{ p.id }}">Détails et avis</a>
        <small [class.low]="p.stock < 10">Stock : {{ p.stock }}</small>
        <button class="btn" (click)="add(p)" [disabled]="p.stock < 1">Ajouter</button></div> }
  </div>
  <h2>Panier</h2>
  @for (c of cart; track c.id) { <p>{{ c.name }} × {{ c.qty }} = {{ c.price * c.qty }} TND</p> }
  @if (cart.length) {
    <p><strong>Total : {{ total }} TND</strong></p>
    <select [(ngModel)]="shopId">@for (s of shops; track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select> <select [(ngModel)]="pay"><option value="CARD">Carte bancaire (simulation)</option>
      <option value="PAYPAL">PayPal (simulation)</option><option value="COD">Paiement à la livraison</option></select>
    <button class="btn" (click)="checkout()">Commander</button> }
  <p>{{ msg }}</p>` })
export class CatalogComponent {
  http = inject(HttpClient); auth = inject(Auth); router = inject(Router);
  products: any[] = []; shops: any[] = []; shopId = ''; skin = ''; pay = 'COD'; msg = '';
  cart: any[] = JSON.parse(localStorage.getItem('cart') || '[]');   // panier persistant
  constructor() { this.load(); this.http.get<any[]>('/api/shops').subscribe(s => { this.shops = s; this.shopId = s[0]?.id; }); }
  load() { this.http.get<any[]>('/api/products').subscribe(p => this.products = p); }
  get shown() { return this.products.filter(p => !this.skin || p.skinTypes?.includes(this.skin)); }
  get total() { return this.cart.reduce((s, c) => s + c.price * c.qty, 0); }
  add(p: any) {
    const l = this.cart.find(c => c.id == p.id);
    l ? l.qty++ : this.cart.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
    localStorage.setItem('cart', JSON.stringify(this.cart));
  }
  checkout() {
    if (!this.auth.user()) { this.router.navigate(['/login']); return; }
    this.http.post('/api/orders', { items: this.cart.map(c => ({ productId: c.id, qty: c.qty })), paymentMethod: this.pay, shopId: this.shopId })
      .subscribe({ next: () => { this.cart = []; localStorage.setItem('cart', '[]'); this.msg = 'Commande enregistrée ✔'; this.load(); },
        error: e => this.msg = e.error?.error || 'Erreur' });
  }
}

@Component({ standalone: true, template: `
  <h2>Bonjour {{ me.firstName }} ({{ me.role }})</h2>
  @if (me.role == 'ADMIN') { <h2>Utilisateurs</h2><table>
    @for (u of users; track u.id) { <tr><td>{{ u.name }}</td><td>{{ u.email }}</td><td>{{ u.role }}</td>
      <td><button class="btn" (click)="toggle(u)">{{ u.active ? 'Désactiver' : 'Activer' }}</button></td></tr> }</table> }
  @if (me.role == 'ADMIN' || me.role == 'MANAGER') { <h2>Stock (alerte si moins de 10)</h2><table>
    @for (p of stock; track p.id) { <tr><td>{{ p.name }}</td><td [class.low]="p.stock < 10">{{ p.stock }}{{ p.stock < 10 ? ' ⚠ stock bas' : '' }}</td></tr> }</table> }
  <h2>Commandes</h2><table>
    @for (o of orders; track o.id) { <tr><td>{{ o.createdAt }}</td><td>{{ o.userEmail }}</td><td>{{ o.total }} TND</td><td>{{ o.paymentMethod }}</td><td>{{ o.status }}</td><td><a href="/invoice/{{ o.id }}" target="_blank">Facture</a></td>
      @if (me.role == 'ADMIN' || me.role == 'BOUTIQUE') { <td><button class="btn" (click)="next(o)">Étape suivante</button></td> }</tr> }</table>` })
export class DashboardComponent {
  http = inject(HttpClient); me = inject(Auth).user();
  users: any[] = []; orders: any[] = []; stock: any[] = [];
  constructor() {
    const r = this.me.role, g = (u: string, cb: (x: any[]) => void) => this.http.get<any[]>(u).subscribe(cb);
    if (r == 'ADMIN') g('/api/admin/users', x => this.users = x);
    if (r == 'ADMIN' || r == 'BOUTIQUE') g('/api/shop/orders', x => this.orders = x);
    if (r == 'ADMIN' || r == 'MANAGER') g('/api/manager/stock', x => this.stock = x);
    if (r == 'CLIENT') g('/api/orders/mine', x => this.orders = x);
    const load = () => { if (r == 'CLIENT') g('/api/orders/mine', x => this.orders = x); if (r == 'ADMIN' || r == 'BOUTIQUE') g('/api/shop/orders', x => this.orders = x); };
    const t = setInterval(load, 8000); inject(DestroyRef).onDestroy(() => clearInterval(t));   // statut mis à jour toutes les 8 s
  }
  toggle(u: any) { this.http.put<any>('/api/admin/users/' + u.id + '/toggle', {}).subscribe(x => u.active = x.active); }
  next(o: any) {
    const n = ({ PENDING: 'CONFIRMED', CONFIRMED: 'SHIPPED', SHIPPED: 'DELIVERED' } as any)[o.status];
    if (n) this.http.put<any>('/api/shop/orders/' + o.id + '/status?value=' + n, {}).subscribe(x => o.status = x.status);
  }
}

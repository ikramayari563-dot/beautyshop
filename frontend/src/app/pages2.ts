import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Auth } from './api';

@Component({ standalone: true, imports: [FormsModule], template: `
  <form class="card" (ngSubmit)="go()"><h2>Mot de passe oublié</h2>
    <input name="e" [(ngModel)]="email" type="email" placeholder="Email" required>
    <button class="btn">Envoyer le lien</button><p>{{ msg }}</p>
    <small>En local, le lien est affiché dans les logs du backend.</small></form>` })
export class ForgotComponent {
  http = inject(HttpClient); email = ''; msg = '';
  go() { this.http.post<any>('/api/auth/forgot-password', { email: this.email }).subscribe(x => this.msg = x.message); }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  <form class="card" (ngSubmit)="go()"><h2>Nouveau mot de passe</h2>
    <input name="p" [(ngModel)]="pw" type="password" placeholder="Nouveau mot de passe (6 car. min)" required>
    <button class="btn">Valider</button><p>{{ msg }}</p></form>` })
export class ResetComponent {
  http = inject(HttpClient); route = inject(ActivatedRoute); pw = ''; msg = '';
  go() {
    this.http.post<any>('/api/auth/reset-password', { token: this.route.snapshot.queryParamMap.get('token'), password: this.pw })
      .subscribe({ next: x => this.msg = x.message, error: e => this.msg = e.error?.error || 'Erreur' });
  }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  <h2>Conseillère beauté</h2>
  <div class="card" style="max-width:600px">
    @if (step == 0) { <p>Bonjour ! Quel est votre type de peau ?</p>
      @for (s of skins; track s) { <button class="btn" (click)="skin = s; step = 1">{{ s }}</button> } }
    @if (step == 1) { <p>Quelles sont vos préoccupations ?</p>
      @for (c of cons; track c) { <label><input type="checkbox" [checked]="sel.includes(c)" (change)="tog(c)"> {{ c }}</label> }
      <input type="number" [(ngModel)]="budget" placeholder="Budget max en TND (0 = illimité)">
      <button class="btn" (click)="send()">Obtenir mon diagnostic</button> }
    @if (res) { <p><strong>Diagnostic :</strong> {{ res.diagnosis }}</p><p>{{ res.advice }}</p>
      @for (r of res.recommendations; track r.id) { <p>✨ <strong>{{ r.name }}</strong> ({{ r.price }} TND) : {{ r.why }}</p> }
      @if (!res.recommendations.length) { <p>Aucun produit correspondant en stock pour le moment.</p> }
      <button class="btn" (click)="reset()">Recommencer</button> }
  </div>
  <h2>Historique des consultations</h2>
  @for (h of hist; track h.id) { <p>{{ h.createdAt }} : {{ h.skinType }} / {{ h.concerns.join(', ') }}</p> }` })
export class ChatbotComponent {
  http = inject(HttpClient);
  skins = ['GRASSE', 'SECHE', 'MIXTE', 'SENSIBLE', 'NORMALE']; budget = 0; cons = ['ACNE', 'RIDES', 'HYDRATATION', 'TACHES'];
  step = 0; skin = ''; sel: string[] = []; res: any = null; hist: any[] = [];
  constructor() { this.load(); }
  load() { this.http.get<any[]>('/api/chatbot/history').subscribe(h => this.hist = h); }
  tog(c: string) { this.sel = this.sel.includes(c) ? this.sel.filter(x => x != c) : [...this.sel, c]; }
  send() { this.http.post<any>('/api/chatbot/diagnose', { skinType: this.skin, concerns: this.sel, budget: this.budget || 0 }).subscribe(r => { this.res = r; this.step = 2; this.load(); }); }
  reset() { this.step = 0; this.sel = []; this.res = null; }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  @if (p) { <h2>{{ p.name }}</h2>
    @if (p.imageUrl) { <img [src]="p.imageUrl" width="240" alt=""> }
    <p>{{ p.description }}</p><p><strong>{{ p.price }} TND</strong> : stock {{ p.stock }}</p>
    <h2>Avis ({{ rv.count }}) : moyenne {{ rv.average }} / 5</h2>
    @for (r of rv.reviews; track r.id) { <p>{{ '★'.repeat(r.rating) }} <strong>{{ r.userName }}</strong> : {{ r.text }}
      @if (r.reply) { <br><em>Réponse BeautyShop : {{ r.reply }}</em> }</p> }
    @if (auth.user()) { <div class="card"><select [(ngModel)]="rating">
        @for (n of [5, 4, 3, 2, 1]; track n) { <option [ngValue]="n">{{ n }} ★</option> }</select>
      <input [(ngModel)]="text" placeholder="Votre avis">
      <button class="btn" (click)="send()">Publier</button><small>{{ msg }}</small></div> } }` })
export class ProductComponent {
  http = inject(HttpClient); auth = inject(Auth); id = inject(ActivatedRoute).snapshot.paramMap.get('id');
  p: any; rv: any = { reviews: [], average: 0, count: 0 }; rating = 5; text = ''; msg = '';
  constructor() { this.http.get('/api/products/' + this.id).subscribe(x => this.p = x); this.load(); }
  load() { this.http.get<any>('/api/products/' + this.id + '/reviews').subscribe(x => this.rv = x); }
  send() {
    this.http.post('/api/reviews', { productId: this.id, rating: this.rating, text: this.text })
      .subscribe(() => { this.msg = 'Merci ! Votre avis sera publié après modération.'; this.text = ''; });
  }
}

@Component({ standalone: true, template: `
  @if (o) { <div style="max-width:700px;margin:auto">
    <svg width="48" height="48" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="#fff" stroke="#D4AF37" stroke-width="2.5"/>
      <path d="M22 31c-7-5-9-9-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 3-2 7-9 12z" fill="#F8BBD9" stroke="#D4AF37" stroke-width="1.5"/></svg>
    <h2>BeautyShop : Facture FAC-{{ o.id.slice(-8).toUpperCase() }}</h2>
    <p>Date : {{ o.createdAt }}<br>Client : {{ o.userEmail }}<br>Paiement : {{ o.paymentMethod }} : Statut : {{ o.status }}</p>
    <table><tr><th>Produit</th><th>Qté</th><th>Prix unit.</th><th>Total</th></tr>
      @for (i of o.items; track i.productId) { <tr><td>{{ i.name }}</td><td>{{ i.qty }}</td><td>{{ i.price }}</td><td>{{ i.price * i.qty }}</td></tr> }</table>
    <p>Total HT : {{ (o.total / 1.19).toFixed(3) }} TND<br>TVA 19 % : {{ (o.total - o.total / 1.19).toFixed(3) }} TND<br>
      <strong>Total TTC : {{ o.total.toFixed(3) }} TND</strong></p>
    <button class="btn noprint" (click)="print()">Imprimer</button></div> }` })
export class InvoiceComponent {
  o: any;
  constructor() { inject(HttpClient).get('/api/orders/' + inject(ActivatedRoute).snapshot.paramMap.get('id')).subscribe(x => this.o = x); }
  print() { window.print(); }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  <h2>Statistiques</h2><p>Utilisateurs : {{ stats.users }} · Produits : {{ stats.products }} · Commandes : {{ stats.orders }} · Chiffre d'affaires : {{ stats.revenue }} TND</p>
  <h2>Avis en attente</h2><table>
    @for (r of reviews; track r.id) { <tr><td>{{ r.userName }} ({{ r.rating }}★)</td><td>{{ r.text }}</td><td>
      <button class="btn" (click)="approve(r)">Approuver</button> <button class="btn" (click)="reply(r)">Répondre</button>
      <button class="btn" (click)="removeReview(r)">Supprimer</button></td></tr> }</table>
  <h2>Produits</h2>
  <div class="card" style="max-width:none;flex-direction:row;flex-wrap:wrap">
    <input [(ngModel)]="n.name" placeholder="Nom"><input [(ngModel)]="n.price" type="number" placeholder="Prix">
    <input [(ngModel)]="n.stock" type="number" placeholder="Stock"><input [(ngModel)]="n.skinTypes" placeholder="Types de peau (GRASSE,SECHE)">
    <input [(ngModel)]="n.concerns" placeholder="Préoccupations (ACNE,RIDES)">
    <select [(ngModel)]="n.categoryId"><option value="">Catégorie</option>@for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select><button class="btn" (click)="add()">Ajouter</button></div>
  <table>@for (p of products; track p.id) { <tr><td>{{ p.name }}</td><td>{{ p.price }}</td><td>{{ p.stock }}</td>
    <td><button class="btn" (click)="del(p)">Supprimer</button></td></tr> }</table>` })
export class AdminComponent {
  http = inject(HttpClient); stats: any = {}; products: any[] = []; reviews: any[] = []; cats: any[] = []; n: any = {};
  constructor() { this.refresh(); }
  refresh() {
    this.http.get('/api/admin/stats').subscribe(x => this.stats = x);
    this.http.get<any[]>('/api/categories').subscribe(x => this.cats = x);
    this.http.get<any[]>('/api/products').subscribe(x => this.products = x);
    this.http.get<any[]>('/api/admin/reviews').subscribe(x => this.reviews = x);
  }
  split(s: string) { return s ? s.split(',').map(x => x.trim().toUpperCase()) : []; }
  add() {
    this.http.post('/api/admin/products', { ...this.n, skinTypes: this.split(this.n.skinTypes), concerns: this.split(this.n.concerns) })
      .subscribe(() => { this.n = {}; this.refresh(); });
  }
  del(p: any) { this.http.delete('/api/admin/products/' + p.id).subscribe(() => this.refresh()); }
  approve(r: any) { this.http.put('/api/admin/reviews/' + r.id + '/approve', {}).subscribe(() => this.refresh()); }
  removeReview(r: any) { this.http.delete('/api/admin/reviews/' + r.id).subscribe(() => this.refresh()); }
  reply(r: any) {
    const t = prompt('Votre réponse ?');
    if (t) this.http.put('/api/admin/reviews/' + r.id + '/reply?text=' + encodeURIComponent(t), {}).subscribe(() => this.refresh());
  }
}

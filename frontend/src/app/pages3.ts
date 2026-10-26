import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Auth } from './api';
@Component({ standalone: true, imports: [FormsModule], template: `
  <h2>Compte financier</h2>
  @if (me.role != 'BOUTIQUE') { <select [(ngModel)]="shop" (change)="load()"><option value="">Toutes les boutiques</option>
    @for (s of shops; track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select> }
  @if (f.total) { <p>Revenus : <b>{{ f.total.revenue }}</b> TND · Dépenses : <b>{{ f.total.expenses }}</b> · Bénéfice : <b>{{ f.total.profit }}</b></p> }
  @for (s of f.perShop; track s.shopId) { <div style="margin:10px 0"><b>{{ s.name }}</b>
    <div class="bar" [style.width.%]="pct(s.revenue)" style="background:#F8BBD9">Revenus {{ s.revenue }}</div>
    <div class="bar" [style.width.%]="pct(s.expenses)" style="background:#ddd">Dépenses {{ s.expenses }}</div>
    <div class="bar" [style.width.%]="pct(s.profit)" style="background:#D4AF37">Bénéfice {{ s.profit }}</div></div> }
  <button class="btn" (click)="dl('excel')">Export Excel</button> <button class="btn" (click)="dl('pdf')">Export PDF</button>
  @if (me.role != 'MANAGER') { <h3>Ajouter une dépense</h3>
    <input [(ngModel)]="ex.label" placeholder="Libellé"> <input [(ngModel)]="ex.amount" type="number" placeholder="Montant">
    @if (me.role == 'ADMIN') { <select [(ngModel)]="ex.shopId">@for (s of shops; track s.id) { <option [value]="s.id">{{ s.name }}</option> }</select> }
    <button class="btn" (click)="addExp()">Ajouter</button> }
  <h2>Inventaire par boutique</h2>
  <select [(ngModel)]="cat"><option value="">Toutes catégories</option>@for (c of cats; track c.id) { <option [value]="c.id">{{ c.name }}</option> }</select>
  <input [(ngModel)]="q" placeholder="Produit...">
  <table>@for (r of shownRows; track r.id) { <tr><td>{{ r.shop }}</td><td>{{ r.product }}</td>
    <td [class.low]="r.low">{{ r.quantity }}{{ r.low ? ' ⚠ stock bas' : '' }}</td>
    @if (me.role != 'MANAGER') { <td><input type="number" [(ngModel)]="r.quantity" style="width:70px"> <button class="btn" (click)="save(r)">OK</button></td> }</tr> }</table>` })
export class FinanceComponent {
  http = inject(HttpClient); me = inject(Auth).user();
  f: any = { perShop: [], total: null }; rows: any[] = []; shops: any[] = []; cats: any[] = [];
  shop = ''; cat = ''; q = ''; ex: any = {};
  constructor() {
    this.http.get<any[]>('/api/shops').subscribe(x => this.shops = x);
    this.http.get<any[]>('/api/categories').subscribe(x => this.cats = x);
    this.load();
  }
  load() {
    const s = this.shop ? '?shopId=' + this.shop : '';
    this.http.get('/api/finance' + s).subscribe(x => this.f = x);
    this.http.get<any[]>('/api/inventory' + s).subscribe(x => this.rows = x);
  }
  get shownRows() { return this.rows.filter(r => (!this.cat || r.categoryId == this.cat) && (!this.q || r.product.toLowerCase().includes(this.q.toLowerCase()))); }
  pct(v: number) { const m = Math.max(1, ...this.f.perShop.map((s: any) => Math.max(s.revenue, s.expenses, Math.abs(s.profit)))); return Math.max(2, Math.abs(v) / m * 100); }
  addExp() { this.http.post('/api/finance/expenses', this.ex).subscribe(() => { this.ex = {}; this.load(); }); }
  save(r: any) { this.http.put('/api/inventory/' + r.id + '?quantity=' + r.quantity, {}).subscribe(() => this.load()); }
  dl(fmt: string) {
    this.http.get('/api/export/' + fmt + (this.shop ? '?shopId=' + this.shop : ''), { responseType: 'blob' }).subscribe(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'rapport.' + (fmt == 'excel' ? 'xlsx' : 'pdf'); a.click();
    });
  }
}

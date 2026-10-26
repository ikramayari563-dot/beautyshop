import { Component, DestroyRef, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { Auth } from './api';
const ST: any = { PENDING: 'En attente', CONFIRMED: 'Confirmée', SHIPPED: 'Expédiée', DELIVERED: 'Livrée' };
const mx = (l: number[]) => Math.max(1, ...l);
/** Tableau de bord unique, contenu adapté au rôle (KPIs, graphiques, alertes, accès rapides). */
@Component({ standalone: true, imports: [RouterLink], template: `
  <h2>Tableau de bord : {{ me.role }}</h2>
  <div class="kpis">@for (k of kpis; track k.l) { <div class="kpi"><small>{{ k.l }}</small><b [class.low]="k.low">{{ k.v }}</b></div> }</div>
  <p>@for (l of links; track l.to) { <a class="btn" [routerLink]="l.to">{{ l.label }}</a> }</p>
  @if (d.lastDiagnosis) { <p><b>Dernier diagnostic :</b> {{ d.lastDiagnosis }}</p> }
  @if (d.salesByDay) { <h3>Ventes des 7 derniers jours (TND)</h3><div class="chart">
    @for (s of d.salesByDay; track s.day) { <div class="col"><small>{{ s.total }}</small><div class="barv" [style.height.px]="2 + s.total / sales() * 120"></div><small>{{ s.day }}</small></div> }</div> }
  @if (d.byStatus) { <h3>Commandes par statut</h3>
    @for (k of keys(d.byStatus); track k) { <div class="bar" [style.width.%]="10 + d.byStatus[k] / mx(vals(d.byStatus)) * 90" style="background:#F8BBD9">{{ st(k) }} : {{ d.byStatus[k] }}</div> } }
  @if (d.perShop?.length) { <h3>Performance par boutique</h3>
    @for (s of d.perShop; track s.name) { <div class="bar" [style.width.%]="10 + s.revenue / shopMax() * 90" style="background:#D4AF37">{{ s.name }} : {{ s.revenue }} TND ({{ s.orders }} commandes)</div> } }
  @if (d.topProducts?.length) { <h3>Produits les plus vendus</h3>
    @for (p of d.topProducts; track p.name) { <div class="bar" [style.width.%]="10 + p.qty / topMax() * 90" style="background:#F8BBD9">{{ p.name }} : {{ p.qty }}</div> } }
  @if (d.usersByRole) { <h3>Utilisateurs par rôle</h3>
    @for (k of keys(d.usersByRole); track k) { <div class="bar" [style.width.%]="10 + d.usersByRole[k] / mx(vals(d.usersByRole)) * 90" style="background:#ddd">{{ k }} : {{ d.usersByRole[k] }}</div> } }
  @if (d.lowStock?.length) { <h3 class="low">⚠ Stock bas (moins de 10 unités)</h3>
    <table>@for (s of d.lowStock; track $index) { <tr><td>{{ s.shop }}</td><td>{{ s.product }}</td><td class="low">{{ s.quantity }}</td></tr> }</table> }
  @if (canManage) { <h3>Gestion des commandes</h3><table>
    @for (o of orders; track o.id) { <tr><td>{{ o.createdAt }}</td><td>{{ o.userEmail }}</td><td>{{ o.total }} TND</td><td>{{ o.address }}</td><td>{{ st(o.status) }}</td>
      <td><button class="btn" (click)="next(o)">Étape suivante</button> <a href="/invoice/{{ o.id }}" target="_blank">Facture</a></td></tr> }</table> }
  @else { <h3>Commandes récentes</h3><table>
    @for (o of d.recent; track o.id) { <tr><td>{{ o.createdAt }}</td><td>{{ o.total }} TND</td><td>{{ st(o.status) }}</td><td><a href="/invoice/{{ o.id }}" target="_blank">Facture</a></td></tr> }</table> }` })
export class DashboardComponent {
  http = inject(HttpClient); me = inject(Auth).user(); d: any = {}; orders: any[] = []; mx = mx;
  constructor() {
    const load = () => { this.http.get('/api/dashboard').subscribe(x => this.d = x); if (this.canManage) this.http.get<any[]>('/api/shop/orders').subscribe(x => this.orders = x); };
    load(); const t = setInterval(load, 10000); inject(DestroyRef).onDestroy(() => clearInterval(t));   // actualisation automatique
  }
  get canManage() { return this.me.role == 'ADMIN' || this.me.role == 'BOUTIQUE'; }
  st(s: string) { return ST[s] || s; }
  keys(o: any) { return Object.keys(o); } vals(o: any) { return Object.values(o) as number[]; }
  sales() { return mx(this.d.salesByDay.map((s: any) => s.total)); }
  shopMax() { return mx(this.d.perShop.map((s: any) => s.revenue)); }
  topMax() { return mx(this.d.topProducts.map((p: any) => p.qty)); }
  get kpis(): any[] {
    const d = this.d, r = this.me.role, low = d.lowStock?.length || 0;
    if (r == 'ADMIN') return [{ l: 'Utilisateurs', v: (this.vals(d.usersByRole || {})).reduce((s, x) => s + x, 0) }, { l: 'Produits', v: d.products }, { l: 'Commandes', v: d.orders },
      { l: "Chiffre d'affaires", v: d.revenue + ' TND' }, { l: 'Avis en attente', v: d.pendingReviews }, { l: 'Alertes stock bas', v: low, low: low > 0 }];
    if (r == 'MANAGER') return [{ l: 'Revenus', v: d.revenue + ' TND' }, { l: 'Dépenses', v: d.expenses + ' TND' }, { l: 'Bénéfice', v: d.profit + ' TND' }, { l: 'Commandes', v: d.orders }, { l: 'Alertes stock bas', v: low, low: low > 0 }];
    if (r == 'BOUTIQUE') return [{ l: "Chiffre d'affaires", v: d.revenue + ' TND' }, { l: 'Dépenses', v: d.expenses + ' TND' }, { l: 'Bénéfice', v: d.profit + ' TND' }, { l: 'Commandes en attente', v: d.pending, low: d.pending > 0 }, { l: 'Alertes stock bas', v: low, low: low > 0 }];
    return [{ l: 'Mes commandes', v: d.orders }, { l: 'Total dépensé', v: d.spent + ' TND' }, { l: 'Consultations beauté', v: d.consultations }];
  }
  get links(): any[] {
    const r = this.me.role, l: any[] = [{ to: '/messages', label: '💬 Messages' }, { to: '/profile', label: 'Profil' }];
    if (r == 'ADMIN') l.push({ to: '/admin', label: 'Produits et avis' }, { to: '/admin/manage', label: 'Comptes et catégories' }, { to: '/finance', label: 'Finance et stock' });
    if (r == 'MANAGER') l.push({ to: '/finance', label: 'Finance et stock' });
    if (r == 'BOUTIQUE') l.push({ to: '/finance', label: 'Finance et stock' }, { to: '/my-products', label: 'Mes produits' });
    if (r == 'CLIENT') l.push({ to: '/', label: 'Catalogue' }, { to: '/chatbot', label: 'Conseillère beauté' });
    return l;
  }
  next(o: any) {
    const n = ({ PENDING: 'CONFIRMED', CONFIRMED: 'SHIPPED', SHIPPED: 'DELIVERED' } as any)[o.status];
    if (n) this.http.put<any>('/api/shop/orders/' + o.id + '/status?value=' + n, {}).subscribe(x => o.status = x.status);
  }
}

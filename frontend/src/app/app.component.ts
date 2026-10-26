import { Component, effect, inject, untracked } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from './api';
import { Chat } from './chat';
@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet, RouterLink],
  template: `
  <header>
    <svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="#fff" stroke="#D4AF37" stroke-width="2.5"/>
      <path d="M22 31c-7-5-9-9-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 3-2 7-9 12z" fill="#F8BBD9" stroke="#D4AF37" stroke-width="1.5"/></svg>
    <strong style="font-size:22px;letter-spacing:2px">BeautyShop</strong>
    <a routerLink="/">Catalogue</a>
    @if (auth.user()) { <a routerLink="/chatbot">Chatbot</a>
      <a routerLink="/messages">Messages @if (chat.unread() > 0) { <b>({{ chat.unread() }})</b> }</a> }
    @if (auth.user() && auth.user().role != 'CLIENT') { <a routerLink="/finance">Finance et stock</a> }
    @if (auth.user()?.role == 'ADMIN') { <a routerLink="/admin">Admin</a><a routerLink="/admin/manage">Comptes et catégories</a> }
    @if (auth.user()?.role == 'BOUTIQUE') { <a routerLink="/my-products">Mes produits</a> }
    <span class="sp"></span>
    @if (auth.user(); as u) { <a routerLink="/dashboard">Espace {{u.role}}</a><a routerLink="/profile">Profil</a><a (click)="auth.logout()">Déconnexion</a> }
    @else { <a routerLink="/login">Connexion</a> }
  </header>
  <main><router-outlet /></main>
  <div class="toasts">
    @for (n of chat.notes(); track $index) { <div class="toast">💬 <b>{{ n.from }}</b> : {{ n.preview }}</div> }
    @if (chat.call() == 'ringing') { <div class="toast">📞 Appel de {{ chat.peer() }}
      <button class="btn" (click)="chat.accept()">Accepter</button> <button class="btn" (click)="chat.hangup()">Refuser</button></div> }
    @if (chat.call() == 'calling' || chat.call() == 'active') { <div class="toast">📞 {{ chat.call() == 'calling' ? 'Appel en cours' : 'En communication' }} avec {{ chat.peer() }}
      <button class="btn" (click)="chat.hangup()">Raccrocher</button></div> }
  </div>`
})
export class AppComponent {
  auth = inject(Auth); chat = inject(Chat);
  constructor() { effect(() => { const u = this.auth.user(); untracked(() => u ? this.chat.connect() : this.chat.disconnect()); }); }
}

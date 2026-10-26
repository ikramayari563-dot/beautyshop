import { Component, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { Auth } from './api';

/** Connexion STOMP unique (messages, notifications) + appels vocaux WebRTC (signalisation via STOMP). */
@Injectable({ providedIn: 'root' })
export class Chat {
  incoming = new Subject<any>(); notes = signal<any[]>([]); unread = signal(0);
  call = signal<'idle' | 'calling' | 'ringing' | 'active'>('idle'); peer = signal('');
  private client?: Client; private pc?: RTCPeerConnection; private local?: MediaStream;
  private offer = ''; private ice: any[] = []; private audio = new Audio();
  connect() {
    const u = JSON.parse(localStorage.getItem('u') || 'null');
    if (this.client || !u) return;
    this.audio.autoplay = true;
    this.client = new Client({
      brokerURL: (location.protocol == 'https:' ? 'wss://' : 'ws://') + location.host + '/ws',
      connectHeaders: { Authorization: 'Bearer ' + u.token }, reconnectDelay: 3000,
      onConnect: () => {
        this.client!.subscribe('/user/queue/messages', m => this.incoming.next(JSON.parse(m.body)));
        this.client!.subscribe('/user/queue/notifications', m => {
          const n = JSON.parse(m.body); this.unread.update(x => x + 1); this.notes.update(l => [...l, n]);
          setTimeout(() => this.notes.update(l => l.filter(x => x !== n)), 5000);
        });
        this.client!.subscribe('/user/queue/signal', m => this.onSignal(JSON.parse(m.body)));
      }
    });
    this.client.activate();
  }
  disconnect() { this.client?.deactivate(); this.client = undefined; this.cleanup(); }
  private send(to: string, type: string, payload = '') { this.client?.publish({ destination: '/app/signal', body: JSON.stringify({ to, type, payload }) }); }
  private async prepare(to: string) {
    this.local = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    this.local.getTracks().forEach(t => this.pc!.addTrack(t, this.local!));
    this.pc.ontrack = e => this.audio.srcObject = e.streams[0];
    this.pc.onicecandidate = e => { if (e.candidate) this.send(to, 'ice', JSON.stringify(e.candidate)); };
  }
  async start(to: string) {
    this.peer.set(to); this.call.set('calling'); await this.prepare(to);
    const o = await this.pc!.createOffer(); await this.pc!.setLocalDescription(o); this.send(to, 'offer', JSON.stringify(o));
  }
  async accept() {
    const to = this.peer(); await this.prepare(to);
    await this.pc!.setRemoteDescription(JSON.parse(this.offer));
    for (const c of this.ice) await this.pc!.addIceCandidate(c);
    this.ice = []; const a = await this.pc!.createAnswer(); await this.pc!.setLocalDescription(a);
    this.send(to, 'answer', JSON.stringify(a)); this.call.set('active');
  }
  hangup() { if (this.call() != 'idle') this.send(this.peer(), 'hangup'); this.cleanup(); }
  private cleanup() {
    this.pc?.close(); this.pc = undefined; this.local?.getTracks().forEach(t => t.stop()); this.local = undefined;
    this.ice = []; this.call.set('idle'); this.peer.set('');
  }
  private async onSignal(s: any) {
    if (s.type == 'offer') {
      if (this.call() != 'idle') { this.send(s.from, 'hangup'); return; }
      this.peer.set(s.from); this.offer = s.payload; this.call.set('ringing');
    } else if (s.type == 'answer') { await this.pc?.setRemoteDescription(JSON.parse(s.payload)); this.call.set('active'); }
    else if (s.type == 'ice') { const c = JSON.parse(s.payload); if (this.pc?.remoteDescription) await this.pc.addIceCandidate(c); else this.ice.push(c); }
    else if (s.type == 'hangup') this.cleanup();
  }
}

@Component({ standalone: true, imports: [FormsModule], template: `
  <div style="display:flex;gap:16px;flex-wrap:wrap">
    <div style="width:260px">
      <h3>Conversations</h3>
      @for (c of convs; track c.id) { <div class="conv" [class.sel]="cur?.id == c.id" (click)="open(c)">{{ title(c) }}</div> }
      @if (me.role == 'ADMIN') { <button class="btn" (click)="loadAll()">Toutes les conversations</button> }
      <h3>Nouvelle conversation</h3>
      <input [(ngModel)]="gname" placeholder="Nom du groupe (optionnel)">
      <select multiple [(ngModel)]="sel" style="height:120px;width:100%">
        @for (u of dir; track u.email) { <option [value]="u.email">{{ u.name }} ({{ u.role }})</option> }</select>
      <button class="btn" (click)="create()">Créer</button>
    </div>
    <div style="flex:1;min-width:300px">
      @if (cur) { <h3>{{ title(cur) }}
        @if (!cur.group) { <button class="btn" (click)="callPeer()">📞 Appeler</button> }</h3>
        <div class="msgs">
          @for (m of msgs; track m.id) { <p [style.text-align]="m.sender == me.email ? 'right' : 'left'"><small>{{ m.senderName }}</small><br>
            @if (m.type == 'IMAGE') { <img [src]="m.data" style="max-width:220px"> }
            @else if (m.type == 'FILE') { <a style="cursor:pointer" (click)="download(m)">📎 {{ m.fileName }}</a> }
            @else { <span>{{ m.text }}</span> }</p> }
        </div>
        <input [(ngModel)]="text" (keyup.enter)="send()" placeholder="Votre message..." style="width:50%">
        <button class="btn" (click)="send()">Envoyer</button>
        <input type="file" (change)="pick($event)"> <button class="btn" (click)="scan()">📷 Scanner</button>
        @if (scanning) { <div><video id="scanvid" autoplay playsinline width="320"></video><br>
          <button class="btn" (click)="snap()">Capturer et envoyer</button> <button class="btn" (click)="stopScan()">Annuler</button></div> } }
    </div>
  </div>` })
export class MessagesComponent {
  http = inject(HttpClient); chat = inject(Chat); me = inject(Auth).user();
  convs: any[] = []; msgs: any[] = []; cur: any; dir: any[] = []; names: any = {}; sel: string[] = [];
  gname = ''; text = ''; scanning = false; stream?: MediaStream;
  constructor() {
    this.chat.unread.set(0);
    this.http.get<any[]>('/api/users/directory').subscribe(d => { this.dir = d; d.forEach(u => this.names[u.email] = u.name); });
    this.refresh();
    this.chat.incoming.pipe(takeUntilDestroyed()).subscribe(m => {
      if (this.cur?.id == m.conversationId) { this.msgs = [...this.msgs, m]; this.chat.unread.set(0); }
      this.refresh();
    });
  }
  refresh() { this.http.get<any[]>('/api/conversations').subscribe(c => this.convs = c); }
  loadAll() { this.http.get<any[]>('/api/admin/conversations').subscribe(c => this.convs = c); }
  title(c: any) { return c.group ? (c.name || 'Groupe') : (this.names[c.memberEmails.find((e: string) => e != this.me.email)] || c.memberEmails[0]); }
  open(c: any) { this.cur = c; this.http.get<any[]>('/api/conversations/' + c.id + '/messages').subscribe(m => this.msgs = m); }
  create() {
    this.http.post<any>('/api/conversations', { name: this.gname, members: this.sel, group: !!this.gname })
      .subscribe(c => { this.sel = []; this.gname = ''; this.refresh(); this.open(c); });
  }
  post(body: any) { this.http.post<any>('/api/conversations/' + this.cur.id + '/messages', body).subscribe(m => { this.msgs = [...this.msgs, m]; this.refresh(); }); }
  send() { if (!this.text.trim()) return; this.post({ type: 'TEXT', text: this.text }); this.text = ''; }
  pick(e: any) {
    const f: File = e.target.files[0]; if (!f) return;
    if (f.size > 5e6) { alert('Fichier trop gros (5 Mo max)'); return; }
    const r = new FileReader();
    r.onload = () => this.post({ type: f.type.startsWith('image/') ? 'IMAGE' : 'FILE', fileName: f.name, data: r.result });
    r.readAsDataURL(f); e.target.value = '';
  }
  async scan() {
    this.scanning = true;
    try { this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
    catch { alert('Caméra indisponible'); this.scanning = false; return; }
    setTimeout(() => (document.getElementById('scanvid') as HTMLVideoElement).srcObject = this.stream!);
  }
  snap() {
    const v = document.getElementById('scanvid') as HTMLVideoElement, c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d')!.drawImage(v, 0, 0);
    this.post({ type: 'IMAGE', fileName: 'scan.jpg', data: c.toDataURL('image/jpeg', 0.8) }); this.stopScan();
  }
  stopScan() { this.stream?.getTracks().forEach(t => t.stop()); this.scanning = false; }
  callPeer() { this.chat.start(this.cur.memberEmails.find((e: string) => e != this.me.email)).catch(() => { alert('Micro indisponible'); this.chat.hangup(); }); }
  download(m: any) { const a = document.createElement('a'); a.href = m.data; a.download = m.fileName; a.click(); }
}

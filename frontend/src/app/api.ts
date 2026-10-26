import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { tap } from 'rxjs';
/** Session JWT : stockée en localStorage, ajoutée à chaque requête par l'intercepteur. */
@Injectable({ providedIn: 'root' })
export class Auth {
  private http = inject(HttpClient); private router = inject(Router);
  user = signal<any>(JSON.parse(localStorage.getItem('u') || 'null'));
  login(b: any) { return this.http.post<any>('/api/auth/login', b).pipe(tap(u => this.set(u))); }
  register(b: any) { return this.http.post<any>('/api/auth/register', b).pipe(tap(u => this.set(u))); }
  private set(u: any) { localStorage.setItem('u', JSON.stringify(u)); this.user.set(u); }
  logout() { localStorage.removeItem('u'); this.user.set(null); this.router.navigate(['/login']); }
}
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const u = JSON.parse(localStorage.getItem('u') || 'null');
  return next(u ? req.clone({ setHeaders: { Authorization: 'Bearer ' + u.token } }) : req);
};
export const authGuard: CanActivateFn = () => inject(Auth).user() ? true : inject(Router).parseUrl('/login');
export const roleGuard: CanActivateFn = (route) => {
  const u = inject(Auth).user(), roles: string[] | undefined = route.data?.['roles'];
  return u && (!roles || roles.includes(u.role)) ? true : inject(Router).parseUrl('/login');
};

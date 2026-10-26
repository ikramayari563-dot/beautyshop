import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './api';
import { LoginComponent } from './pages';
import { DashboardComponent } from './pages5';
import { ForgotComponent, ResetComponent, ChatbotComponent, InvoiceComponent, AdminComponent } from './pages2';
import { FinanceComponent } from './pages3';
import { MessagesComponent } from './chat';
import { ShopComponent, ProductPageComponent, ProfileComponent, AdminManageComponent, MyProductsComponent } from './pages4';
export const routes: Routes = [
  { path: '', component: ShopComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot', component: ForgotComponent },
  { path: 'reset-password', component: ResetComponent },
  { path: 'product/:id', component: ProductPageComponent },
  { path: 'chatbot', component: ChatbotComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'messages', component: MessagesComponent, canActivate: [authGuard] },
  { path: 'invoice/:id', component: InvoiceComponent, canActivate: [roleGuard], data: { roles: ['ADMIN', 'BOUTIQUE', 'CLIENT'] } },
  { path: 'finance', component: FinanceComponent, canActivate: [roleGuard], data: { roles: ['ADMIN', 'MANAGER', 'BOUTIQUE'] } },
  { path: 'my-products', component: MyProductsComponent, canActivate: [roleGuard], data: { roles: ['BOUTIQUE'] } },
  { path: 'admin', component: AdminComponent, canActivate: [roleGuard], data: { roles: ['ADMIN'] } },
  { path: 'admin/manage', component: AdminManageComponent, canActivate: [roleGuard], data: { roles: ['ADMIN'] } },
  { path: '**', redirectTo: '' }
];

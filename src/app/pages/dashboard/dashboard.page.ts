import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { 
  NavController, LoadingController, 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonCardContent, IonIcon, IonCard 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, homeOutline, personOutline, logOutOutline, receiptOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth';
import { user } from '@angular/fire/auth';

// Importación correcta del SDK clásico de Firebase Firestore
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, 
    IonButtons, IonMenuButton, IonCardContent, IonIcon, IonCard
  ]
})
export class DashboardPage implements OnInit {
  private authService = inject(AuthService);
  private navCtrl = inject(NavController);
  private loadingCtrl = inject(LoadingController);

  // Instancia de Firestore clásica
  private db = getFirestore();

  userName: string = 'Administrador';
  totalPropiedades = 0;
  totalInquilinos = 0;
  totalCobrado = 0;

  constructor() {
    addIcons({peopleOutline, homeOutline, receiptOutline, personOutline, logOutOutline});
  }

  async ngOnInit() {
    await this.cargarEstadisticas();
    this.obtenerUsuario();
  }

  obtenerUsuario() {
    const authInstance = this.authService['auth']; 
    user(authInstance).subscribe((u) => {
      if (u) {
        this.userName = u.displayName || u.email?.split('@')[0] || 'Administrador';
      }
    });
  }

  async cargarEstadisticas() {
    try {
      const hoy = new Date();
      const mesActual = hoy.getMonth();
      
      const viviendasSnap = await getDocs(collection(this.db, 'viviendas'));
      this.totalPropiedades = viviendasSnap.size;

      const qInquilinos = query(collection(this.db, 'viviendas'), where('estado', '==', 'Rentada'));
      const inquilinosSnap = await getDocs(qInquilinos);
      this.totalInquilinos = inquilinosSnap.size;

      const qPagos = query(collection(this.db, 'facturas'), where('estadoPago', '==', 'pagado'));
      const pagosSnap = await getDocs(qPagos);

      this.totalCobrado = pagosSnap.docs.reduce((sum, doc) => {
        const data = doc.data();
        return data['mes'] === mesActual ? sum + (data['monto'] || 0) : sum;
      }, 0);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  }

  async onLogout() {
    const loading = await this.loadingCtrl.create({ message: 'Cerrando sesión...' });
    await loading.present();
    try {
      await this.authService.logout();
      this.navCtrl.navigateRoot('/login');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await loading.dismiss();
    }
  }
}
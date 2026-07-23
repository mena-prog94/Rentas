import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { 
  IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, IonNote, 
  IonItem, IonIcon, IonLabel, IonMenuToggle, IonRouterOutlet, MenuController 
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { 
  gridOutline, homeOutline, chevronDownOutline, chevronForwardOutline, 
  addOutline, peopleOutline, personAddOutline, businessOutline, 
  personOutline, receiptOutline, logOutOutline 
} from 'ionicons/icons';

// Importaciones del SDK clásico de Firebase
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterLinkActive, IonApp, IonSplitPane, IonMenu, 
    IonContent, IonList, IonListHeader, IonNote, IonItem, IonIcon, IonLabel, 
    IonMenuToggle, IonRouterOutlet
  ]
})
export class AppComponent implements OnInit, OnDestroy {
  appPages: any[] = []; 
  
  mostrarViviendasRegistradas = false;
  mostrarClientesRegistrados = false; 
  
  // Arrays normales para que funcionen directo en el HTML sin el pipe async
  viviendas: any[] = [];
  clientes: any[] = [];

  // Instancias del SDK clásico
  private db = getFirestore();
  private auth = getAuth();

  private unsubViviendas: any = null;
  private unsubClientes: any = null;
  
  // Inyecciones correctas usando inject()
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private alertCtrl = inject(AlertController);

  constructor() {
    addIcons({
      gridOutline, homeOutline, addOutline, businessOutline, peopleOutline, 
      personAddOutline, personOutline, receiptOutline, logOutOutline, 
      chevronDownOutline, chevronForwardOutline
    });
  }

  ngOnInit() {
    // Escuchar viviendas en tiempo real con el SDK clásico
    const viviendasRef = collection(this.db, 'viviendas');
    this.unsubViviendas = onSnapshot(viviendasRef, (snapshot) => {
      this.viviendas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    // Escuchar clientes en tiempo real con el SDK clásico
    const clientesRef = collection(this.db, 'clientes');
    this.unsubClientes = onSnapshot(clientesRef, (snapshot) => {
      this.clientes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });
  }

  ngOnDestroy() {
    if (this.unsubViviendas) this.unsubViviendas();
    if (this.unsubClientes) this.unsubClientes();
  }

  async realizarCierreSesion() {
    try {
      await this.menuCtrl.close(); 
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }

  toggleViviendasSubmenu() {
    this.mostrarViviendasRegistradas = !this.mostrarViviendasRegistradas;
    if (this.mostrarViviendasRegistradas) this.mostrarClientesRegistrados = false;
  }

  toggleClientesSubmenu() {
    this.mostrarClientesRegistrados = !this.mostrarClientesRegistrados;
    if (this.mostrarClientesRegistrados) this.mostrarViviendasRegistradas = false;
  }
}
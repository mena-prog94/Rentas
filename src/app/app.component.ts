import { Component, OnInit, inject } from '@angular/core';
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
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Auth, signOut } from '@angular/fire/auth';

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
export class AppComponent implements OnInit {
  // 1. DEFINIR LA PROPIEDAD QUE FALTA
  appPages: any[] = []; 
  
  mostrarViviendasRegistradas = false;
  mostrarClientesRegistrados = false; 
  viviendas$!: Observable<any[]>;
  clientes$!: Observable<any[]>;
  
  private firestore = inject(Firestore);
  private auth = inject(Auth);
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
    // 2. CORRECCIÓN DE FIRESTORE: Pasa solo el firestore y el nombre de la colección
    const viviendasRef = collection(this.firestore, 'viviendas');
    this.viviendas$ = collectionData(viviendasRef, { idField: 'id' });

    const clientesRef = collection(this.firestore, 'clientes');
    this.clientes$ = collectionData(clientesRef, { idField: 'id' });
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
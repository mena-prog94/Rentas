import { Component, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonMenuButton, IonTitle, IonAvatar, IonList, 
  IonItem, IonIcon, IonLabel, IonButton, AlertController, ModalController, NavController 
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import { mailOutline, businessOutline, cameraOutline, createOutline, arrowBackOutline } from 'ionicons/icons';
import { Auth, updateProfile, user } from '@angular/fire/auth';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

@Component({
  selector: 'app-foto-modal',
  standalone: true,
  template: `
    <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:black;">
      <img [src]="foto" style="width:100%; max-height:80vh; object-fit:contain;">
      <ion-button fill="clear" color="light" (click)="cerrar()" style="margin-top:20px;">Cerrar</ion-button>
    </div>
  `,
  imports: [IonButton]
})
class FotoModalComponent {
  @Input() foto!: string;
  constructor(private modalCtrl: ModalController) {
      addIcons({cameraOutline,mailOutline});}
  cerrar() { this.modalCtrl.dismiss(); }
}

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonToolbar, IonButtons, 
    IonMenuButton, IonTitle, IonAvatar, IonList, IonItem, 
    IonIcon, IonLabel, IonButton, IonBackButton
  ]
})
export class PerfilPage implements OnInit {
  private auth = inject(Auth);
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController); 
  
  nombreUsuario = '';
  emailUsuario = '';
  // Respaldo inmediato en localStorage para evitar que la imagen se borre
  fotoPerfil = localStorage.getItem('fotoPerfil') || ''; 
  posicionFoto = localStorage.getItem('posicionFoto') || 'center';

  constructor() {
    addIcons({ mailOutline, businessOutline, cameraOutline, createOutline, arrowBackOutline });
  }

  ngOnInit() {
    user(this.auth).subscribe(u => {
      if (u) {
        this.nombreUsuario = u.displayName || 'Administrador';
        this.emailUsuario = u.email || '';
        // Si hay una foto de Firebase, úsala y guárdala en localStorage
        if (u.photoURL) {
          this.fotoPerfil = u.photoURL;
          localStorage.setItem('fotoPerfil', u.photoURL);
        }
      }
    });
  }

  ajustarEnfoque(event: MouseEvent) {
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const height = rect.height;

    if (y < height / 3) this.posicionFoto = 'top';
    else if (y > (height / 3) * 2) this.posicionFoto = 'bottom';
    else this.posicionFoto = 'center';

    localStorage.setItem('posicionFoto', this.posicionFoto);
  }

  async verFotoGrande() {
    const modal = await this.modalCtrl.create({
      component: FotoModalComponent,
      componentProps: { foto: this.fotoPerfil || 'assets/avatar-usuario.jpg' }
    });
    await modal.present();
  }

  async cambiarFoto(event: Event) {
    event.stopPropagation();
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        allowEditing: true
      });
      if (image.dataUrl) {
        this.fotoPerfil = image.dataUrl;
        localStorage.setItem('fotoPerfil', image.dataUrl); // Persistir inmediatamente
        const u = this.auth.currentUser;
        if (u) await updateProfile(u, { photoURL: this.fotoPerfil });
      }
    } catch (e) { console.log('Selección cancelada'); }
  }

  async editarPerfil() {
    const alert = await this.alertCtrl.create({
      header: 'Editar Perfil',
      inputs: [
        { name: 'nombre', type: 'text', placeholder: 'Nombre', value: this.nombreUsuario },
        { name: 'email', type: 'email', placeholder: 'Correo', value: this.emailUsuario }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Guardar', 
          handler: async (data) => {
            const u = this.auth.currentUser;
            if (u) {
              await updateProfile(u, { displayName: data.nombre });
              this.nombreUsuario = data.nombre;
              this.emailUsuario = data.email;
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
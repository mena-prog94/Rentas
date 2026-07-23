import { Component, OnInit, inject } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { NavController, LoadingController, AlertController } from '@ionic/angular'; 
import { 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonButton, 
  IonIcon,
  IonInput 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { businessOutline, mailOutline, lockClosedOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth'; 

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonItem, 
    IonLabel, 
    IonButton, 
    IonIcon,
    IonInput,
    CommonModule, 
    ReactiveFormsModule,
    RouterModule 
  ]
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup; 

  private authService = inject(AuthService);
  private navCtrl = inject(NavController);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);

  constructor() {
    addIcons({ businessOutline, mailOutline, lockClosedOutline });
  }

  ngOnInit() {
    this.loginForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required, Validators.minLength(6)])
    });
  }

  async onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.value;

    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent',
      cssClass: 'custom-loading' 
    });
    await loading.present();

    try {
      // Conexión directa con el método login optimizado del AuthService
      const userCredential = await this.authService.login(email, password);
      console.log('Login exitoso:', userCredential.user);

      await loading.dismiss();
      this.navCtrl.navigateRoot('/dashboard');

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error al iniciar sesión:', error);
      
      const errorMessage = error.message || JSON.stringify(error);
      const errorCode = error.code || 'Desconocido';

      await this.mostrarError(errorCode, errorMessage);
    }
  }

  private async mostrarError(errorCode: string, rawMessage: string) {
    let mensaje = 'Ha ocurrido un error inesperado al intentar iniciar sesión.';

    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        mensaje = 'El correo electrónico o la contraseña son incorrectos.';
        break;
      case 'auth/invalid-email':
        mensaje = 'El formato del correo electrónico no es válido.';
        break;
      case 'auth/user-disabled':
        mensaje = 'Esta cuenta de usuario ha sido deshabilitada.';
        break;
      case 'auth/network-request-failed':
        mensaje = 'Error de conexión. Verifica que tengas acceso a internet en el dispositivo.';
        break;
      default:
        mensaje = `Detalle del error (${errorCode}): ${rawMessage}`;
        break;
    }

    const alert = await this.alertCtrl.create({
      header: 'Error de Acceso',
      message: mensaje,
      buttons: ['Entendido'],
      cssClass: 'custom-alert'
    });

    await alert.present();
  }
}
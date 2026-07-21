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
import { AuthService } from '../../services/auth'; // <-- Ajusta la ruta según tu estructura de carpetas

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

  // Inyecciones modernas usando inject() para consistencia con tu AuthService
  private authService = inject(AuthService);
  private navCtrl = inject(NavController);
  private loadingCtrl = inject(LoadingController);
  private alertCtrl = inject(AlertController);

  constructor() {
    // Añadimos iconos útiles que seguro usarás en tus inputs de login
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

    // 1. Mostrar spinner de carga
    const loading = await this.loadingCtrl.create({
      message: 'Iniciando sesión...',
      spinner: 'crescent',
      cssClass: 'custom-loading' // Puedes usarlo para darle tu estilo oscuro si quieres
    });
    await loading.present();

    try {
      // 2. Ejecutar inicio de sesión en Firebase
      const userCredential = await this.authService.login(email, password);
      console.log('Login exitoso:', userCredential.user);

      // Opcional: Si necesitas validar algo del perfil en Firestore justo al entrar
      // const perfil = await this.authService.getPerfilUsuario(userCredential.user.uid);
      
      // 3. Redirigir al Dashboard limpiando el historial
      await loading.dismiss();
      this.navCtrl.navigateRoot('/dashboard');

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error al iniciar sesión:', error);
      
      // 4. Manejar errores comunes de Firebase de forma amigable
      this.mostrarError(error.code);
    }
  }

  /**
   * Muestra una alerta interactiva traduciendo los errores típicos de Firebase Auth
   */
  private async mostrarError(errorCode: string) {
    let mensaje = 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';

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
        mensaje = 'Error de conexión. Verifica tu conexión a internet.';
        break;
    }

    const alert = await this.alertCtrl.create({
      header: 'Error de Acceso',
      message: mensaje,
      buttons: ['Entendido'],
      cssClass: 'custom-alert' // Útil si deseas estilizar la alerta con fondo oscuro
    });

    await alert.present();
  }
}
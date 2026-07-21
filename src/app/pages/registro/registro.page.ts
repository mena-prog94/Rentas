import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavController, ToastController, LoadingController } from '@ionic/angular';
import { 
  IonContent, 
  IonItem, 
  IonLabel, 
  IonButton,
  IonInput,
  IonTitle,
  IonBackButton,
  IonButtons,
  IonToolbar,
  IonHeader // <--- IMPORTANTE: Importar IonHeader
} from '@ionic/angular/standalone';

import { AuthService } from '../../services/auth'; 

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonItem, 
    IonLabel, 
    IonButton,
    IonInput, 
    IonTitle,
    IonBackButton,
    IonButtons,
    IonToolbar,
    IonHeader, // <--- IMPORTANTE: Añadir a imports
    CommonModule,
    ReactiveFormsModule,
    RouterModule 
  ]
})
export class RegistroPage implements OnInit {
  registroForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private navCtrl: NavController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private authService: AuthService 
  ) {}

  ngOnInit() {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  async onRegistro() {
    if (this.registroForm.invalid) return;

    const { nombre, email, password } = this.registroForm.value;

    const loading = await this.loadingCtrl.create({
      message: 'Creando cuenta...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // CORRECCIÓN: Se eliminó la coma extra después de 'nombre'
      const resultado = await this.authService.register(email, password, nombre);
      
      console.log('Registro exitoso en Firebase:', resultado);
      await loading.dismiss();

      const toast = await this.toastCtrl.create({
        message: '¡Registro exitoso! Cuenta creada correctamente.',
        duration: 3500,
        color: 'success',
        position: 'bottom'
      });
      await toast.present();

      this.navCtrl.navigateBack('/login');

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error al registrar usuario en Firebase:', error);

      let mensajeError = 'No se pudo crear la cuenta. Inténtalo de nuevo.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          mensajeError = 'Este correo electrónico ya está registrado.';
          break;
        case 'auth/invalid-email':
          mensajeError = 'El formato del correo electrónico no es válido.';
          break;
        case 'auth/weak-password':
          mensajeError = 'La contraseña es muy débil (mínimo 6 caracteres).';
          break;
      }

      const toast = await this.toastCtrl.create({
        message: mensajeError,
        duration: 4000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
    }
  }
}
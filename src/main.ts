import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

// 1. IMPORTAMOS EL PROVEEDOR DE IONIC STANDALONE
import { provideIonicAngular } from '@ionic/angular/standalone';

// Importaciones oficiales de AngularFire
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    
    // 2. INICIALIZAMOS IONIC EN LA APLICACIÓN (Fuerza el modo Material Design para consistencia)
    provideIonicAngular({
      mode: 'md'
    }),

    // Inicialización del ecosistema Firebase con tus credenciales
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ]
}).catch(err => console.error(err));
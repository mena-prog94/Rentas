import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';

// Proveedor de Ionic Standalone
import { provideIonicAngular } from '@ionic/angular/standalone';

// Importaciones oficiales de AngularFire
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from './environments/environment';

// Importación opcional de Analytics para evitar errores si no se usa con provider
import { getAnalytics, provideAnalytics } from '@angular/fire/analytics';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    
    // Inicialización de Ionic
    provideIonicAngular({
      mode: 'md'
    }),

    // Inicialización correcta de Firebase con AngularFire
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    
    // Añadido por si quieres mantener Analytics de forma limpia en standalone:
    provideAnalytics(() => getAnalytics())
  ]
}).catch(err => console.error(err));
import { Injectable } from '@angular/core';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Instancias del SDK clásico de Firebase
  private auth = getAuth();
  private firestore = getFirestore();

  // Observable para vigilar si el usuario inicia o cierra sesión en tiempo real
  user$: Observable<User | null> = new Observable(subscriber => {
    const unsubscribe = onAuthStateChanged(this.auth, (user) => {
      subscriber.next(user);
    }, error => subscriber.error(error));
    return { unsubscribe };
  });

  /**
   * Obtiene el usuario actual de manera síncrona
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Registra un nuevo administrador/usuario principal en Firebase Auth y Firestore
   */
  async register(email: string, password: string, nombreCompleto: string) {
    try {
      // 1. Crear la cuenta en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // 2. Actualizar el perfil básico del usuario en Auth
      await updateProfile(user, {
        displayName: nombreCompleto
      });

      // 3. Guardar datos extendidos en Firestore
      const userDocRef = doc(this.firestore, `usuarios/${user.uid}`);
      await setDoc(userDocRef, {
        uid: user.uid,
        nombreCompleto,
        email,
        rol: 'administrador',
        createdAt: new Date()
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * REGISTRO DE CLIENTES: Crea un usuario para el cliente en Firebase Auth 
   * y guarda su perfil correspondiente en Firestore con el rol 'cliente'.
   */
  async registerCliente(email: string, password: string, nombreCompleto: string) {
    try {
      // 1. Crear la cuenta del cliente en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const clienteUser = userCredential.user;

      // 2. Actualizar el perfil del cliente en Auth
      await updateProfile(clienteUser, {
        displayName: nombreCompleto
      });

      // 3. Guardar sus datos con el rol 'cliente' en Firestore
      const userDocRef = doc(this.firestore, `usuarios/${clienteUser.uid}`);
      await setDoc(userDocRef, {
        uid: clienteUser.uid,
        nombreCompleto,
        email,
        rol: 'cliente',
        createdAt: new Date()
      });

      return clienteUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Inicia sesión con correo y contraseña
   */
  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  /**
   * Cierra la sesión del usuario actual
   */
  logout() {
    return signOut(this.auth);
  }

  /**
   * Obtiene la información del perfil del usuario desde Firestore
   */
  async getPerfilUsuario(uid: string) {
    try {
      const docRef = doc(this.firestore, `usuarios/${uid}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      throw error;
    }
  }
}
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonContent, IonList, IonBadge, IonButton, IonButtons, IonIcon, 
  IonCard, IonCardContent, AlertController, IonTitle, 
  IonBackButton, IonToolbar, IonHeader, ToastController,
  IonItem, IonLabel, IonNote // <--- Añadidos para evitar errores si los usas en el HTML
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { receiptOutline, cashOutline, alertCircleOutline, eyeOutline } from 'ionicons/icons';

// Importación correcta del SDK clásico de Firebase Firestore
import { getFirestore, collection, doc, updateDoc, getDocs, addDoc, getDoc, onSnapshot } from 'firebase/firestore';

@Component({
  selector: 'app-recibos',
  templateUrl: './recibos.page.html',
  styleUrls: ['./recibos.page.scss'], // <--- Añadido por buenas prácticas si usas estilos
  standalone: true,
  imports: [
    CommonModule, 
    IonContent, 
    IonList, 
    IonBadge, 
    IonButton, 
    IonButtons, 
    IonIcon, 
    IonCard, 
    IonCardContent, 
    IonTitle, 
    IonBackButton, 
    IonToolbar, 
    IonHeader
         // <--- Vital si usas ion-note en tu HTML
  ]
})
export class RecibosPage implements OnInit, OnDestroy {
  // Instancia de Firestore clásica
  private db = getFirestore();
  
  // Inyecciones de dependencias limpias
  recibos: any[] = [];
  private unsubscribe: any = null;

  constructor(
    private alertController: AlertController,
    private toastCtrl: ToastController,
    private router: Router
  ) {
    addIcons({ receiptOutline, cashOutline, alertCircleOutline, eyeOutline });
  }

  ngOnInit() {
    this.cargarRecibosTiempoReal();
    this.verificarVencimientosPendientes();
  }

  ngOnDestroy() {
    // Limpiar el listener al salir de la página para evitar fugas de memoria
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  // Cargar recibos en tiempo real usando el SDK clásico
  cargarRecibosTiempoReal() {
    const recibosRef = collection(this.db, 'facturas');
    this.unsubscribe = onSnapshot(recibosRef, (snapshot) => {
      this.recibos = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
    }, (error) => {
      console.error("Error al escuchar los recibos:", error);
    });
  }

  verDetalles(recibo: any) {
    this.router.navigate(['/detalle-recibo', recibo.id]);
  }

  async marcarComoPagado(recibo: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar Pago',
      message: `¿Registrar pago de $${recibo.monto}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Sí, Pagar',
          handler: async () => {
            try {
              const docRef = doc(this.db, 'facturas', recibo.id);
              await updateDoc(docRef, { estadoPago: 'pagado' });

              if (recibo.tipo === 'deposito' && recibo.clienteId) {
                await this.generarFacturaMensualTrasDeposito(recibo);
                const toast = await this.toastCtrl.create({ 
                  message: 'Depósito registrado y factura mensual generada.', 
                  duration: 3000, 
                  color: 'success' 
                });
                await toast.present();
              }

              this.router.navigate(['/detalle-recibo', recibo.id]);

            } catch (error) {
              console.error("Error al procesar pago:", error);
            }
          }
        }
      ],
      cssClass: 'custom-alert'
    });
    await alert.present();
  }

  async generarFacturaMensualTrasDeposito(reciboDeposito: any) {
    const baseDate = reciboDeposito.fechaEmision.toDate 
      ? reciboDeposito.fechaEmision.toDate() 
      : new Date(reciboDeposito.fechaEmision);

    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const fechaEmisionMesSig = new Date(year, month + 1, baseDate.getDate());
    const fechaVence = new Date(fechaEmisionMesSig.getTime() + (30 * 24 * 60 * 60 * 1000));

    let montoMensual = 0;
    const vivSnap = await getDoc(doc(this.db, 'viviendas', reciboDeposito.viviendaId));
    if (vivSnap.exists()) {
      montoMensual = vivSnap.data()['precioMensual'] || 0;
    }

    await addDoc(collection(this.db, 'facturas'), {
      clienteId: reciboDeposito.clienteId,
      viviendaId: reciboDeposito.viviendaId,
      nombreCliente: reciboDeposito.nombreCliente,
      vivienda: reciboDeposito.vivienda,
      monto: montoMensual,
      tipo: 'mensual',
      estadoPago: 'pendiente',
      fechaEmision: fechaEmisionMesSig,
      fechaVence: fechaVence,
      numeroFactura: 'FAC-' + Math.floor(Math.random() * 100000),
      nota: 'Factura mensual generada automáticamente.'
    });
  }

  getEstadoVencimiento(recibo: any) {
    if (recibo.estadoPago === 'pagado') return { texto: 'Pagado', color: 'success' };
    if (!recibo.fechaVence) return { texto: 'Sin fecha', color: 'medium' };
    const fechaV = recibo.fechaVence.toDate ? recibo.fechaVence.toDate() : new Date(recibo.fechaVence);
    const diffDays = Math.ceil((fechaV.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { texto: 'Vencido', color: 'danger' };
    if (diffDays <= 7) return { texto: 'Próximo a vencer', color: 'warning' };
    return { texto: 'Al día', color: 'medium' };
  }

  async verificarVencimientosPendientes() {
    const snap = await getDocs(collection(this.db, 'facturas'));
    let count = 0;
    snap.forEach(d => {
      const data = d.data();
      if (data['estadoPago'] !== 'pagado' && data['fechaVence']) {
        const f = data['fechaVence'].toDate ? data['fechaVence'].toDate() : new Date(data['fechaVence']);
        if ((f.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 7) count++;
      }
    });
    if (count > 0) {
      const toast = await this.toastCtrl.create({ 
        message: `¡Atención! ${count} recibo(s) por vencer.`, 
        duration: 5000, 
        color: 'warning', 
        position: 'top' 
      });
      await toast.present();
    }
  }
}
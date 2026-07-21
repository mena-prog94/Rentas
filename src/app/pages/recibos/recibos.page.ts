import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonContent, IonList, IonBadge, IonButton, IonButtons, IonIcon, 
  IonCard, IonCardContent, AlertController, IonTitle, 
  IonBackButton, IonToolbar, IonHeader, ToastController,
  IonItem, IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { receiptOutline, cashOutline, alertCircleOutline, eyeOutline } from 'ionicons/icons';
import { Firestore, collection, collectionData, doc, updateDoc, getDocs, addDoc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-recibos',
  templateUrl: './recibos.page.html',
  standalone: true,
  imports: [
    CommonModule, IonContent, IonList, IonBadge, IonButton, IonButtons, IonIcon, 
    IonCard, IonCardContent, IonTitle, IonBackButton, IonToolbar, IonHeader,
    
  ]
})
export class RecibosPage implements OnInit {
  private firestore = inject(Firestore);
  private alertController = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private router = inject(Router);

  recibos$: Observable<any[]>;

  constructor() {
    addIcons({ receiptOutline, cashOutline, alertCircleOutline, eyeOutline });
    const recibosRef = collection(this.firestore, 'facturas');
    this.recibos$ = collectionData(recibosRef, { idField: 'id' });
  }

  ngOnInit() {
    this.verificarVencimientosPendientes();
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
              const docRef = doc(this.firestore, 'facturas', recibo.id);
              await updateDoc(docRef, { estadoPago: 'pagado' });

              if (recibo.tipo === 'deposito' && recibo.clienteId) {
                await this.generarFacturaMensualTrasDeposito(recibo);
                const toast = await this.toastCtrl.create({ 
                  message: 'Depósito registrado y factura mensual generada.', 
                  duration: 3000, color: 'success' 
                });
                await toast.present();
              }

              // Redirigir a la vista de detalles del recibo
              this.router.navigate(['/detalle-recibo', recibo.id]);

            } catch (error) {
              console.error("Error al procesar pago:", error);
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async generarFacturaMensualTrasDeposito(reciboDeposito: any) {
    // 1. Obtener fecha base
    const baseDate = reciboDeposito.fechaEmision.toDate 
      ? reciboDeposito.fechaEmision.toDate() 
      : new Date(reciboDeposito.fechaEmision);

    // 2. FORZAR el salto de mes:
    // Creamos una fecha apuntando al día 1 del mes siguiente
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const fechaEmisionMesSig = new Date(year, month + 1, baseDate.getDate());

    // 3. Vencimiento: 30 días después de la nueva fecha
    const fechaVence = new Date(fechaEmisionMesSig.getTime() + (30 * 24 * 60 * 60 * 1000));

    // 4. Obtener precio de la vivienda
    let montoMensual = 0;
    const vivSnap = await getDoc(doc(this.firestore, 'viviendas', reciboDeposito.viviendaId));
    if (vivSnap.exists()) {
      montoMensual = vivSnap.data()['precioMensual'] || 0;
    }

    // 5. Crear documento
    await addDoc(collection(this.firestore, 'facturas'), {
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
    const snap = await getDocs(collection(this.firestore, 'facturas'));
    let count = 0;
    snap.forEach(d => {
      const data = d.data();
      if (data['estadoPago'] !== 'pagado' && data['fechaVence']) {
        const f = data['fechaVence'].toDate ? data['fechaVence'].toDate() : new Date(data['fechaVence']);
        if ((f.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24) <= 7) count++;
      }
    });
    if (count > 0) {
      const toast = await this.toastCtrl.create({ message: `¡Atención! ${count} recibo(s) por vencer.`, duration: 5000, color: 'warning', position: 'top' });
      await toast.present();
    }
  }
}
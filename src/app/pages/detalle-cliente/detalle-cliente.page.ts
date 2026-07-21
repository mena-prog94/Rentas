import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonBadge,
  IonButton,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, 
  cardOutline, 
  callOutline, 
  mailOutline, 
  calendarOutline, 
  cashOutline, 
  documentTextOutline, 
  timeOutline,
  receiptOutline,
  logoWhatsapp,
  printOutline, createOutline } from 'ionicons/icons';

// Firebase Firestore
import { Firestore, doc, getDoc, collection, query, where, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-detalle-cliente',
  templateUrl: './detalle-cliente.page.html',
  styleUrls: ['./detalle-cliente.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonButton
  ]
})
export class DetalleClientePage implements OnInit {
  cliente: any = null;
  factura: any = null;
  viviendaEstado: string | null = null; // <-- Nueva variable para guardar el estado de la vivienda
  cargando = true;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private firestore = inject(Firestore);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);

  constructor() {
    addIcons({createOutline,cardOutline,callOutline,mailOutline,calendarOutline,timeOutline,receiptOutline,logoWhatsapp,printOutline,documentTextOutline,personOutline,cashOutline});
  }

  editarCliente() {
    if (this.cliente && this.cliente.id) {
      this.router.navigate(['/clientes'], { 
        queryParams: { id: this.cliente.id, modo: 'editar' } 
      });
    }
  }
  
  async ngOnInit() {
  // 1. Priorizamos el ID que viene por los queryParams (si viene de editar)
  // 2. Si no, tomamos el ID que viene por la URL (si viene del dashboard)
  const idCliente = this.route.snapshot.queryParams['id'] || this.route.snapshot.paramMap.get('id');
  
  if (idCliente) {
    await this.cargarDatosCliente(idCliente);
  } else {
    this.mostrarError('ID de cliente no válido.');
    this.router.navigate(['/dashboard']);
  }
}

  async cargarDatosCliente(id: string) {
    this.cargando = true;
    const loading = await this.loadingCtrl.create({
      message: 'Cargando datos del inquilino...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const clienteRef = doc(this.firestore, `clientes/${id}`);
      const clienteSnap = await getDoc(clienteRef);

      if (clienteSnap.exists()) {
        this.cliente = { id: clienteSnap.id, ...clienteSnap.data() };
        
        // 1. Consultar el estado de la vivienda asignada
        if (this.cliente.viviendaAsignada) {
          await this.cargarEstadoVivienda(this.cliente.viviendaAsignada);
        }

        // 2. Buscar la factura de depósito
        await this.cargarFacturaDeposito(id);
      } else {
        this.mostrarError('El cliente no existe o fue eliminado.');
        this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      console.error('Error al consultar cliente:', error);
      this.mostrarError('Error al conectar con la base de datos.');
    } finally {
      this.cargando = false;
      await loading.dismiss();
    }
  }

  async cargarEstadoVivienda(viviendaId: string) {
    try {
      const viviendaRef = doc(this.firestore, `viviendas/${viviendaId}`);
      const viviendaSnap = await getDoc(viviendaRef);
      if (viviendaSnap.exists()) {
        const datosVivienda = viviendaSnap.data();
        this.viviendaEstado = datosVivienda['estado'] || null;
      }
    } catch (e) {
      console.error('Error al cargar la vivienda:', e);
    }
  }

  async cargarFacturaDeposito(clienteId: string) {
    try {
      const facturasCol = collection(this.firestore, 'facturas');
      const q = query(facturasCol, where('clienteId', '==', clienteId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        this.factura = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      }
    } catch (e) {
      console.error('Error buscando factura:', e);
    }
  }

  imprimirFactura() {
    window.print();
  }

  compartirPorWhatsApp() {
    if (!this.cliente || !this.factura) return;

    const telefonoInquilino = this.cliente.telefono.replace(/[-()\s]/g, '');
    const montoFormateado = new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(this.factura.monto);

    const mensaje = `*RENTASAPP - COMPROBANTE DE PAGO*%0A` +
      `------------------------------------------%0A` +
      `*Factura N°:* ${this.factura.numeroFactura}%0A` +
      `*Inquilino:* ${this.cliente.nombre}%0A` +
      `*Concepto:* ${this.factura.concepto}%0A` +
      `*Monto:* ${montoFormateado}%0A` +
      `*Estado:* ✅ ${this.factura.estadoPago}%0A` +
      `------------------------------------------%0A` +
      `¡Gracias por su pago!`;

    const url = `https://wa.me/${telefonoInquilino}?text=${mensaje}`;
    window.open(url, '_blank');
  }

  async mostrarError(msg: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 3000,
      color: 'danger',
      position: 'bottom'
    });
    await toast.present();
  }
}
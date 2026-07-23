import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons,
  IonBackButton, IonItem, IonLabel, IonInput, IonSelect,
  IonSelectOption, IonButton, IonIcon, ToastController, AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personAddOutline, saveOutline, imageOutline, documentTextOutline, createOutline, trashOutline } from 'ionicons/icons';

// Importación correcta del SDK clásico de Firebase Firestore
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, onSnapshot } from 'firebase/firestore';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonItem, IonLabel, IonInput,
    IonSelect, IonSelectOption, IonButton, IonIcon, CommonModule, ReactiveFormsModule
  ]
})
export class ClientesPage implements OnInit, OnDestroy {
  clienteForm!: FormGroup;
  cargando = false;
  imagenContratoB64: string | null = null;
  
  // Modificado a público para corregir el error TS2341 en la plantilla HTML
  viviendas: any[] = [];
  private viviendasUnsubscribe: any = null;
  
  clienteIdEnEdicion: string | null = null;
  viviendaOriginalId: string | null = null;

  // Instancia de Firestore clásica
  private db = getFirestore();
  private toastController = inject(ToastController);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  constructor() {
    addIcons({ personAddOutline, saveOutline, imageOutline, documentTextOutline, createOutline, trashOutline });
  }

  ngOnInit() {
    this.clienteForm = new FormGroup({
      nombreCompleto: new FormControl('', [Validators.required]),
      cedula: new FormControl('', [Validators.required]),
      telefono: new FormControl('', [Validators.required]),
      correo: new FormControl('', [Validators.required, Validators.email]),
      viviendaAsignada: new FormControl('', [Validators.required]),
      tipoContrato: new FormControl('meses', [Validators.required]),
      duracionContrato: new FormControl('', [Validators.required, Validators.min(1)]),
      montoDeposito: new FormControl('', [Validators.required, Validators.min(0)])
    });

    this.clienteForm.get('tipoContrato')?.valueChanges.subscribe(tipo => {
      const duracionControl = this.clienteForm.get('duracionContrato');
      if (tipo === 'libre') {
        duracionControl?.clearValidators();
      } else {
        duracionControl?.setValidators([Validators.required, Validators.min(1)]);
      }
      duracionControl?.updateValueAndValidity();
    });

    // Capturar parámetros de ruta (Modo edición o asignación directa desde detalle de vivienda)
    this.route.queryParams.subscribe(params => {
      if (params['modo'] === 'editar' && params['id']) {
        this.clienteIdEnEdicion = params['id'];
        this.cargarDatosParaEdicion(this.clienteIdEnEdicion!);
      } else if (params['viviendaPorRentar']) {
        this.clienteForm.patchValue({ viviendaAsignada: params['viviendaPorRentar'] });
      }
    });

    // Escuchar viviendas en tiempo real con el SDK clásico
    const viviendasRef = collection(this.db, 'viviendas');
    this.viviendasUnsubscribe = onSnapshot(viviendasRef, (snapshot) => {
      this.viviendas = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    }, (error) => {
      console.error("Error al escuchar viviendas:", error);
    });
  }

  async cargarDatosParaEdicion(id: string) {
    const docRef = doc(this.db, `clientes/${id}`);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      this.clienteForm.patchValue(data);
      this.viviendaOriginalId = data['viviendaAsignada'] || null; 
      this.imagenContratoB64 = data['imagenContrato'] || null;
    }
  }

  ngOnDestroy() { 
    if (this.viviendasUnsubscribe) {
      this.viviendasUnsubscribe();
    }
  }

  async guardarCliente() {
    if (this.clienteForm.invalid) return;
    this.cargando = true;

    try {
      const datosForm = this.clienteForm.getRawValue();
      const viviendaSeleccionada = this.viviendas.find(v => v.id === datosForm.viviendaAsignada);
      const codigoVivienda = viviendaSeleccionada ? viviendaSeleccionada.codigo : 'Sin código';
      const precioMensual = viviendaSeleccionada ? (viviendaSeleccionada.precioMensual || 0) : 0;
      const duracionFinal = datosForm.tipoContrato === 'libre' ? 'Indefinido' : datosForm.duracionContrato;

      if (!this.clienteIdEnEdicion) {
        const clienteRef = await addDoc(collection(this.db, 'clientes'), { 
          ...datosForm, 
          duracionContrato: duracionFinal,
          imagenContrato: this.imagenContratoB64, 
          fechaRegistro: new Date() 
        });

        await addDoc(collection(this.db, 'facturas'), {
          clienteId: clienteRef.id,
          nombreCliente: datosForm.nombreCompleto,
          viviendaId: datosForm.viviendaAsignada,
          vivienda: codigoVivienda,
          monto: datosForm.montoDeposito,
          tipo: 'deposito',
          estadoPago: 'pendiente',
          fechaEmision: new Date(),
          numeroFactura: 'DEP-' + Math.floor(Math.random() * 100000),
          nota: 'Depósito de garantía inicial'
        });

        await this.generarFacturaMensual(clienteRef.id, datosForm.viviendaAsignada, datosForm.nombreCompleto, codigoVivienda, precioMensual);

        await updateDoc(doc(this.db, 'viviendas', datosForm.viviendaAsignada), {
          clienteId: clienteRef.id,
          estado: 'Rentada'
        });

        await this.mostrarToast('Cliente registrado y facturas generadas', 'success');
      } else {
        const clienteRef = doc(this.db, `clientes/${this.clienteIdEnEdicion}`);
        await updateDoc(clienteRef, {
          ...datosForm,
          duracionContrato: duracionFinal,
          imagenContrato: this.imagenContratoB64
        });

        if (this.viviendaOriginalId && this.viviendaOriginalId !== datosForm.viviendaAsignada) {
          await updateDoc(doc(this.db, 'viviendas', this.viviendaOriginalId), {
            clienteId: null,
            estado: 'Disponible'
          });
          await updateDoc(doc(this.db, 'viviendas', datosForm.viviendaAsignada), {
            clienteId: this.clienteIdEnEdicion,
            estado: 'Rentada'
          });
        }

        await this.mostrarToast('Datos del cliente actualizados', 'success');
      }
      this.router.navigate(['/recibos']);
    } catch (error) {
      console.error(error);
      await this.mostrarToast('Error al procesar el registro', 'danger');
    } finally {
      this.cargando = false;
    }
  }

  async cancelarContrato() {
    if (!this.clienteIdEnEdicion) return;

    const alert = await this.alertCtrl.create({
      header: 'Cancelar Contrato',
      message: '¿Estás seguro de cancelar este contrato? La vivienda quedará liberada (disponible inmediatamente).',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, Cancelar Contrato',
          handler: async () => {
            this.cargando = true;
            try {
              const viviendaIdALiberar = this.viviendaOriginalId || this.clienteForm.get('viviendaAsignada')?.value;
              if (viviendaIdALiberar) {
                await updateDoc(doc(this.db, 'viviendas', viviendaIdALiberar), {
                  clienteId: null,
                  estado: 'Disponible'
                });
              }

              await updateDoc(doc(this.db, `clientes/${this.clienteIdEnEdicion}`), {
                estadoContrato: 'Cancelado',
                viviendaAsignada: null
              });

              await this.mostrarToast('Contrato cancelado y vivienda liberada', 'success');
              this.router.navigate(['/recibos']);
            } catch (error) {
              console.error(error);
              await this.mostrarToast('Error al cancelar el contrato', 'danger');
            } finally {
              this.cargando = false;
            }
          }
        }
      ],
      cssClass: 'custom-alert'
    });

    await alert.present();
  }

  async generarFacturaMensual(clienteId: string, viviendaId: string, nombre: string, codigo: string, monto: number) {
    const hoy = new Date();
    const mesSiguiente = hoy.getMonth() === 11 ? 0 : hoy.getMonth() + 1;
    const anioSiguiente = hoy.getMonth() === 11 ? hoy.getFullYear() + 1 : hoy.getFullYear();
    const fechaVence = new Date();
    fechaVence.setDate(hoy.getDate() + 30);

    await addDoc(collection(this.db, 'facturas'), {
      clienteId,
      viviendaId,
      nombreCliente: nombre,
      vivienda: codigo,
      monto: monto,
      mes: mesSiguiente,
      anio: anioSiguiente,
      estadoPago: 'pendiente',
      fechaVence: fechaVence,
      fechaEmision: new Date(),
      tipo: 'mensual',
      numeroFactura: 'FAC-' + Math.floor(Math.random() * 100000)
    });
  }

  async mostrarToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2000, color, position: 'bottom' });
    await toast.present();
  }

  async verificarEstadoVivienda(event: any) {
    const viviendaId = event.detail.value;
    const viviendaSeleccionada = this.viviendas.find(v => v.id === viviendaId);
    
    if (viviendaSeleccionada && viviendaSeleccionada.estado === 'Rentada' && viviendaId !== this.viviendaOriginalId) {
      const toast = await this.toastCtrl.create({
        message: 'Esta vivienda ya se encuentra rentada.',
        duration: 3000,
        color: 'danger',
        position: 'bottom'
      });
      await toast.present();
      
      this.clienteForm.get('viviendaAsignada')?.setValue(null);
    }
  }
}
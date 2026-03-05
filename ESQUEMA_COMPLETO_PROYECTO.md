# 📋 ESQUEMA COMPLETO DE ARCHIVOS - APLICACIÓN AGENDA

## 🎯 **COMPONENTE PRINCIPAL: Control de Operarios**

### **📁 ARCHIVO PRINCIPAL:**
```
src/App.tsx  ← CONTIENE TODO EL CONTROL DE OPERARIOS
```

---

## 🏗️ **ESTRUCTURA DEL PROYECTO:**

### **📁 Directorio Principal:**
```
App Nueva/
├── src/
│   ├── App.tsx                    ← 🎯 CONTROL DE OPERARIOS (AQUÍ ESTÁ TODO)
│   ├── hooks/
│   │   └── useSupabaseData.ts   ← 🔄 HOOK DE DATOS (SUPABASE)
│   ├── lib/
│   │   ├── types.ts              ← 📋 TIPOS DE DATOS
│   │   ├── utils.ts              ← 🔧 UTILIDADES
│   │   └── constants.ts          ← 📊 CONSTANTES
│   ├── components/
│   │   ├── LoginScreen.tsx        ← 🔐 PANTALLA LOGIN
│   │   ├── WorkerSidebar.tsx       ← 👥 BARRA LATERAL
│   │   ├── PlanningBoard.tsx      ← 📅 PLANIFICACIÓN
│   │   ├── StatisticsPanel.tsx    ← 📊 ESTADÍSTICAS
│   │   ├── CompactPlanningView.tsx ← 📋 VISTA COMPACTA
│   │   └── FleetManager.tsx       ← 🚗 GESTIÓN FLOTA
│   └── supabaseClient.ts          ← 🗄️ CLIENTE SUPABASE
├── public/                        ← 📁 ARCHIVOS ESTÁTICOS
├── package.json                   ← 📦 DEPENDENCIAS
└── README.md                     ← 📖 DOCUMENTACIÓN
```

---

## 🎯 **SECCIÓN CONTROL DE OPERARIOS EN App.tsx:**

### **📍 Ubicación: Líneas ~2903-3500**
```typescript
// EN App.tsx:
{view === 'workerControl' && (
  <div className="flex-1 bg-slate-50 overflow-y-auto p-8 custom-scrollbar">
    {/* AQUÍ ESTÁ TODO EL CONTROL DE OPERARIOS */}
  </div>
)}
```

---

## 🔄 **FLUJO DE DATOS - CONTROL OPERARIOS:**

### **📊 Entrada de Datos:**
```
1. Usuario hace clic en celda → handleCellClick()
2. Usuario introduce valor (F, D, R, V, B, P, números) → updateCellValue()
3. updateCellValue() llama a syncToStatusRecords()
4. syncToStatusRecords() guarda en Supabase vía saveWorkerControl()
```

### **📊 Salida de Datos:**
```
1. useEffect() detecta cambios → syncFromStatusRecords()
2. syncFromStatusRecords() carga desde planning.workerControls
3. planning.workerControls viene del hook useSupabaseData
4. useSupabaseData carga desde Supabase worker_control_data
```

---

## 🗄️ **TABLAS SUPABASE:**

### **📋 Workers (estados oficiales):**
```sql
workers {
  id, data: {
    statusRecords: [
      {status: "VACACIONES", startDate: "2026-02-01", endDate: "2026-02-05"}
    ]
  }
}
```

### **📋 Worker Control (datos manuales):**
```sql
worker_control_data {
  id: "worker-123-2026-02-27",
  data: {
    worker_id: "worker-123",
    date: "2026-02-27", 
    value: "F",  // F, D, R, 8, 4.5, etc.
    month: "2026-02"
  }
}
```

---

## 🎯 **COMPONENTES CLAVE:**

### **📱 App.tsx (Control Operarios):**
- **Líneas 2903-3500**: Renderizado del grid
- **Líneas 247-340**: syncFromStatusRecords()
- **Líneas 342-505**: syncToStatusRecords()
- **Líneas 322-325**: handleCellClick()
- **Líneas 317-320**: updateCellValue()

### **🔄 useSupabaseData.ts (Hook):**
- **Líneas 594-610**: saveWorkerControl()
- **Líneas 604-610**: deleteWorkerControl()
- **Líneas 134-152**: Carga inicial de workerControls
- **Líneas 629**: return con saveWorkerControl, deleteWorkerControl

### **📋 types.ts (Tipos):**
- **Líneas 61-68**: WorkerControl interface
- **Líneas 237-254**: PlanningState con workerControls

---

## 🎨 **ESTADOS Y DATOS:**

### **🔄 Estados React:**
```typescript
const [view, setView] = useState<ViewType>('workerControl');
const [selectedMonth, setSelectedMonth] = useState('2026-03');
const [workerControlData, setWorkerControlData] = useState<{[month: string]: {[workerId: string]: {[day: string]: string}}>({});
const [isSyncingFromGrid, setIsSyncingFromGrid] = useState(false);
```

### **📊 Datos del Hook:**
```typescript
const {
  planning,                    // ← planning.workerControls
  saveWorkerControl,           // ← Guardar F, D, R, números
  deleteWorkerControl,          // ← Eliminar datos
  showNotification             // ← Notificaciones
} = useSupabaseData();
```

---

## 🎯 **RESUMEN:**

### **🏆 ARCHIVO PRINCIPAL:**
```
src/App.tsx  ← 100% del Control de Operarios está aquí
```

### **🔧 ARCHIVOS DE APOYO:**
```
src/hooks/useSupabaseData.ts  ← Conexión Supabase
src/lib/types.ts              ← Tipos de datos
src/lib/utils.ts              ← Funciones utilidad
```

### **📊 FLUJO COMPLETO:**
```
Usuario → App.tsx → useSupabaseData → Supabase → Realtime → App.tsx
```

---

## 🎊 **CONCLUSIÓN:**

### **📍 Control de Operarios = `src/App.tsx`**
### **🔄 Todo el flujo de datos está integrado en este único archivo**
### **🗄️ Los demás archivos son de apoyo (tipos, hook, utilidades)**

// Debug para el problema de edición de operarios
import React, { useState, useEffect } from 'react';

// Simular el problema
function DebugWorkerEdit() {
  const [editingWorker, setEditingWorker] = useState(null);
  const [workers, setWorkers] = useState([
    { id: 'w-1', name: 'Juan García', code: '001', role: 'Mozo' },
    { id: 'w-2', name: 'María López', code: '002', role: 'Conductor' }
  ]);

  console.log('🔍 Estado actual:', { editingWorker, workers });

  const handleEditWorker = (worker) => {
    console.log('📝 Editando worker:', worker);
    setEditingWorker(worker);
  };

  const handleCloseEdit = () => {
    console.log('❌ Cerrando edición');
    setEditingWorker(null);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Worker Edit</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Workers List</h2>
        {workers.map(worker => (
          <div key={worker.id} className="flex items-center gap-4 mb-2 p-2 border">
            <span>{worker.name} ({worker.code})</span>
            <button 
              onClick={() => handleEditWorker(worker)}
              className="px-3 py-1 bg-blue-500 text-white rounded"
            >
              Editar
            </button>
          </div>
        ))}
      </div>

      {editingWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Editar Operario</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={editingWorker.name || ''}
                  onChange={(e) => setEditingWorker({...editingWorker, name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Código</label>
                <input 
                  type="text" 
                  value={editingWorker.code || ''}
                  onChange={(e) => setEditingWorker({...editingWorker, code: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <input 
                  type="text" 
                  value={editingWorker.role || ''}
                  onChange={(e) => setEditingWorker({...editingWorker, role: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button 
                onClick={handleCloseEdit}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  console.log('💾 Guardando worker:', editingWorker);
                  // Aquí iría la lógica de guardar
                  handleCloseEdit();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugWorkerEdit;

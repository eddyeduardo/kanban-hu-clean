import React, { useState, useEffect, useRef } from 'react';
import { FiPlus, FiX, FiTrash2 } from 'react-icons/fi';

/**
 * StoryModal component for adding or editing stories
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {Function} props.onSave - Function to save the story
 * @param {Object|null} props.story - Story data (null for new story)
 */
const StoryModal = ({ isOpen, onClose, onSave, story }) => {
  const [title, setTitle] = useState('');
  const [criteria, setCriteria] = useState([{ id: Date.now(), text: '' }]);
  const criteriaContainerRef = useRef(null);

  // Scroll to bottom when criteria list updates
  useEffect(() => {
    if (criteriaContainerRef.current) {
      criteriaContainerRef.current.scrollTop = criteriaContainerRef.current.scrollHeight;
    }
  }, [criteria]);

  // Update form when story changes
  useEffect(() => {
    if (story) {
      setTitle(story.title || '');
      
      // Set criteria from story
      if (story.criteria && Array.isArray(story.criteria) && story.criteria.length > 0) {
        setCriteria(story.criteria.map((c, index) => ({
          id: c.id?.toString() || `temp-${Date.now()}-${index}`,
          text: c.text || ''
        })));
      } else {
        setCriteria([{ id: `temp-${Date.now()}`, text: '' }]);
      }
    } else {
      setTitle('');
      setCriteria([{ id: `temp-${Date.now()}`, text: '' }]);
    }
  }, [story, isOpen]);

  const handleAddCriterion = () => {
    setCriteria([...criteria, { id: `temp-${Date.now()}-${criteria.length}`, text: '' }]);
  };

  const handleCriterionChange = (id, value) => {
    setCriteria(criteria.map(criterion => 
      criterion.id === id ? { ...criterion, text: value } : criterion
    ));
  };

  const handleRemoveCriterion = (id) => {
    if (criteria.length > 1) {
      setCriteria(criteria.filter(criterion => criterion.id !== id));
    } else {
      // If it's the last criterion, just clear it
      setCriteria([{ id: `temp-${Date.now()}`, text: '' }]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('El título es obligatorio.');
      return;
    }
    
      // Process criteria: filter out empty ones and trim text
    const processedCriteria = criteria
      .map(criterionInModal => ({
        // Only include the text and checked status
        // The ID will be handled by the parent component
        text: criterionInModal.text.trim(),
        checked: criterionInModal.checked || false
      }))
      .filter(criterion => criterion.text !== ''); // Remove empty criteria

    // Pass the processed criteria to parent
    onSave({ 
      title, 
      criteria: processedCriteria 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {story ? 'Editar Historia' : 'Añadir Nueva Historia'}
            </h2>
            
            <div className="mb-4">
              <label htmlFor="storyTitle" className="block text-sm font-medium text-slate-700 mb-1">
                Título:
              </label>
              <input
                type="text"
                id="storyTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Criterios de Aceptación:
              </label>
              <div 
                ref={criteriaContainerRef}
                className="space-y-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-md bg-slate-50"
              >
                {criteria.map((criterion, index) => (
                  <div key={criterion.id} className="flex items-start group">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-slate-300 text-slate-500 text-xs font-medium mt-1">
                      {index + 1}
                    </span>
                    <div className="flex-1 ml-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={criterion.text}
                          onChange={(e) => handleCriterionChange(criterion.id, e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Criterio de aceptación ${index + 1}`}
                        />
                        {criteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCriterion(criterion.id)}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                            title="Eliminar criterio"
                          >
                            <FiX className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddCriterion}
                  className="w-full mt-2 flex items-center justify-center px-4 py-2 border border-dashed border-slate-300 rounded-md text-slate-500 hover:bg-white hover:text-blue-600 hover:border-blue-400 transition-colors"
                >
                  <FiPlus className="mr-2" />
                  Añadir criterio
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Presiona Enter para crear un nuevo criterio automáticamente
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50 px-6 py-3 flex justify-end space-x-2 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-300 text-slate-700 rounded-md hover:bg-slate-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Guardar Historia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoryModal;